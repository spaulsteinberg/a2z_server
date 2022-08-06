const express = require('express');
const admin = require("firebase-admin");
const ErrorResponse = require("../../models/ErrorResponse");
const { REQUEST_STATUS } = require("../../constants/RequestStatus")

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

router.route("/:id")
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
       // const profileDbRef = admin.firestore().collection('users').doc(res.locals.userId)
        await admin.firestore().runTransaction(async (t) => {
            const doc = await t.get(dbRef)
            if (!doc.exists) {
                const obj = {
                    uid: {
                        [res.locals.userId]: {
                            name: "",
                            status: REQUEST_STATUS.WAITING,
                            imageUrl: ""
                        }
                    },
                    uids: [ res.locals.userId ],
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
                    name: "",
                    status: REQUEST_STATUS.WAITING,
                    imageUrl: ""
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


module.exports = router;