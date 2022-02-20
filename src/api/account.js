const express = require('express')
const admin = require("firebase-admin");
const AccountResponse = require('../models/AccountResponse');
const ErrorResponse = require("../models/ErrorResponse")
const multer = require('multer')

const router = express.Router()

const uploader = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    }
})

router.use((req, res, next) => {
    admin.auth()
    .verifyIdToken(req.headers.token)
    .then(decodedToken => {
        res.locals.userId = decodedToken.uid
        next()
    })
    .catch(err => res.status(401).send(new ErrorResponse(401, "Invalid ID token.")))
})

router.route("/")
.get((req, res) => {
    admin
    .firestore()
    .collection('users')
    .doc(res.locals.userId)
    .get()
    .then(userDoc => {
        if (userDoc && userDoc.data()) {
            return res.status(200).send(new AccountResponse(200, userDoc.data()))
        } else {
            return res.status(401).send(new ErrorResponse(401, "Invalid user token."))
        }
    })
    .catch(err => {
        console.log(err)
        return res.status(500).send(new ErrorResponse(500, "Some error occurred."))
    })
})
.post((req, res) => {
    admin
    .firestore()
    .collection('users')
    .doc(res.locals.userId)
    .set({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phoneNumber: req.body.phoneNumber,
        companyName: req.body.companyName,
        streetAddress: req.body.streetAddress,
        zipCode: req.body.zipCode,
        apt: req.body.apt,
    }, { merge: true })
    .then(() => {
        return res.status(201).send(new AccountResponse(201, null))
    })
    .catch(err => {
        console.log(err)
        return res.status(500).send(new ErrorResponse(500, "Some error occurred."))
    })
})

router.post("/profile/picture", uploader.single('imageInput'), (req, res) => {

    if (!req.file) {
        return res.status(400).send(new ErrorResponse(400, "An image is required."))
    }
    const file = admin.storage().bucket().file(`profile-pictures/${res.locals.userId}/${req.file.originalname}`)
    file
    .save(req.file.buffer)
    .then(() => {
        file.getSignedUrl({ action: 'read', expires: '01/01/2025'})
        .then(results => {
            if (!results || results.length < 1) throw new Error()
            admin
            .firestore()
            .collection('users')
            .doc(res.locals.userId)
            .update({
                photoUrl: results[0]
            }, { merge: true })
            .then(() => res.status(201).send(new AccountResponse(201, results[0])))
            .catch(err => {
                console.log(err)
                return res.status(500).send(new ErrorResponse(500, "Some error occurred."))
            })
        })
    })
    .catch(err => {
        console.log("ERROR", err)
        return res.status(500).send(new ErrorResponse(500, err))
    })
})

module.exports = router