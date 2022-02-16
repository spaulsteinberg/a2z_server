const express = require('express')
const admin = require("firebase-admin");
const ErrorResponse = require("../models/ErrorResponse")

const router = express.Router()

router.use((req, res, next) => {
    admin.auth()
    .verifyIdToken(req.headers.token)
    .then(decodedToken => {
        res.locals.tokenId = decodedToken.uid
        next()
    })
    .catch(err => res.status(401).send(new ErrorResponse(401, "Invalid ID token.")))
})

router.route("/account")
.get((req, res) => {
    console.log("getting account...")
    return res.status(200).send({ok: true})
})
.post((req, res) => {
    console.log("posting account...")
    return res.status(201).send({created: true})
})

module.exports = router