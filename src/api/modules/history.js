const express = require('express');
const admin = require("firebase-admin");
const ErrorResponse = require("../../models/ErrorResponse");
const { REQUEST_STATUS } = require("../../constants/RequestStatus");

const router = express.Router()
const COLLECTION_NAME = "requestHistory"

router.use((req, res, next) => {
    admin.auth()
    .verifyIdToken(req.headers.token)
    .then(decodedToken => {
        res.locals.userId = decodedToken.uid
        next()
    })
    .catch(_ => res.status(401).send(new ErrorResponse(401, "Invalid ID token.")))
})
// GET did user apply for ticket (app side)
// POST user application (app side)
router.route("/id/:id")
.get( async (req, res) => {
    try {
        const userDoc = await admin.firestore().collection(COLLECTION_NAME).doc(req.params.id).get()
        if (userDoc && userDoc.data()) {
            const { uids } = userDoc.data();
            let userApplied = false
            if (uids.includes(res.locals.userId)) {
                userApplied = true
            }
            return res.status(200).send(userApplied)
        } else {
            return res.status(200).send(false)
        }
    } catch (err) {
        console.log(err)
        return res.status(500).send(new ErrorResponse(500, "Some error occurred."))
    }
})
.post( async (req, res) => {
    try {
        if (!req.params.id) {
            return res.status(400).send(new ErrorResponse(400, "Bad request"))
        }
        const dbRef = admin.firestore().collection(COLLECTION_NAME).doc(req.params.id);
        const profileDbRef = admin.firestore().collection('users').doc(res.locals.userId);
        const ticketDbRef = admin.firestore().collection('tickets').where("ticketId", "==", req.params.id);
        await admin.firestore().runTransaction(async (t) => {
            const doc = await t.get(dbRef)
            const profileDoc = await t.get(profileDbRef)
            if (!profileDoc.exists) {
                throw new Error("User document does not exist.")
            }
            const profileData = profileDoc.data()
            if (!doc.exists) {
                const ticketDoc = await t.get(ticketDbRef);
                let createdByUser;
                if (ticketDoc.docs.length > 0) {
                    createdByUser = ticketDoc.docs.map(doc =>doc.data().userId)[0]
                } else {
                    throw new Error("Ticket does not exist.")
                }
                const obj = {
                    uid: {
                        [res.locals.userId]: {
                            name: `${profileData.firstName} ${profileData.lastName}`,
                            email: profileData.email,
                            status: REQUEST_STATUS.WAITING,
                            photo: profileData.photoUrl ? profileData.photoUrl : ""
                        }
                    },
                    uids: [ res.locals.userId ],
                    createdByUser,
                    isAccepted: false,
                    isClosed: false
                }

                await t.create(dbRef, obj) //create model and add here
            } else {
                const docCopy = doc.data();
                if (docCopy.uid[res.locals.userId]) {
                    throw Error("You have already inquired this ticket.")
                }
                docCopy.uid[res.locals.userId] = {
                    name: `${profileData.firstName} ${profileData.lastName}`,
                    email: profileData.email,
                    status: REQUEST_STATUS.WAITING,
                    photo: profileData.photoUrl ? profileData.photoUrl : ""
                };
                docCopy.uids.push(res.locals.userId)
                await t.set(dbRef, docCopy, { merge: true })
            }
        })
        console.log("Transaction success!")
        return res.status(201).send(true)
    } catch (err) {
        console.log(err)
        return res.status(500).send(new ErrorResponse(500, err.message ? err.message : "Some error occurred."))
    }
})

router.get('/all', async (req, res) => {
    try {
        const response = await admin.firestore().collection(COLLECTION_NAME).where("createdByUser", "==", res.locals.userId).get()
        let requests = response.docs.map(doc => ({ id: doc.id, ...doc.data()}))
        // reverse to put latest requests first
        requests = requests.map(req => {
            req.uids = req.uids.reverse()
            return req
        })
        return res.status(200).send({ code: 200, requests })
    } catch (err) {
        return res.status(500).send(new ErrorResponse(500, err.message ? err.message : "Some error occurred."))
    }
})

router.post('/request/close/:id', async (req, res) => {
    try {
        const { closed } = req.query
        if (!closed && closed.toLowerCase() !== "yes" && closed.toLowerCase() !== "no") {
            return res.status(400).send(new ErrorResponse(400, "Must include a closed status of YES | NO"))
        }
        let lStatus = closed.toLowerCase()
        await admin.firestore()
                .collection(COLLECTION_NAME)
                .doc(req.params.id)
                .update({ 
                    isClosed: lStatus === "yes" ? true : false 
                }, { 
                    merge: true
                })
                .catch(err => {
                    console.log(err)
                    throw new Error("An error occurred")
                })
        return res.status(201).send(true)
    } catch (err) {
        return res.status(500).send(new ErrorResponse(500, err.message ? err.message : "Some error occurred."))
    }
})
router.post('/request/reject/:id/:uid', async (req, res) => {
    try {
        const dbRef = admin.firestore().collection(COLLECTION_NAME).doc(req.params.id)
        await admin.firestore().runTransaction(async (t) => {
            const doc = await t.get(dbRef)
            const docCopy = doc.data();
            docCopy.uid[req.params.uid].status = REQUEST_STATUS.REJECTED
            await t.set(dbRef, docCopy, { merge: true })
        })
        return res.status(201).send(true)
    } catch (err) {
        console.log(err)
        return res.status(500).send(new ErrorResponse(500, err.message ? err.message : "Some error occurred."))
    }
})


module.exports = router;