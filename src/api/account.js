const express = require('express')
const admin = require("firebase-admin");
const AccountResponse = require('../models/AccountResponse');
const ErrorResponse = require("../models/ErrorResponse")

const router = express.Router()

router.use((req, res, next) => {
    admin.auth()
    .verifyIdToken(req.headers.token)
    .then(decodedToken => {
        res.locals.userId = decodedToken.uid
        next()
    })
    .catch(err => res.status(401).send(new ErrorResponse(401, "Invalid ID token.")))
})

router.route("/account")
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
        photoUrl: req.body.photoUrl,
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

module.exports = router