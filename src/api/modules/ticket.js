const express = require('express')
const admin = require("firebase-admin");
const TicketResponse = require('../../models/TicketResponse');
const ErrorResponse = require("../../models/ErrorResponse");

const router = express.Router()

router.use((req, res, next) => {
    admin.auth()
    .verifyIdToken(req.headers.token)
    .then(decodedToken => {
        res.locals.userId = decodedToken.uid
        next()
    })
    .catch(_ => res.status(401).send(new ErrorResponse(401, "Invalid ID token.")))
})

router.route("/")
.get( async (req, res) => {
    try {
        const tickets = await admin.firestore().collection('tickets').where("userId", "==", res.locals.userId).get()

        if (tickets) {
            return res.status(200).send(new TicketResponse(200, tickets.docs.map(doc => doc.data())))
        }

        return res.status(200).send(new TicketResponse(200, []))

    } catch (err) {
        return res.status(500).send(new ErrorResponse(500, "Something went wrong..." + err.message))
    }
})

module.exports = router;