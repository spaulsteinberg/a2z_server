const express = require('express')
const admin = require("firebase-admin");
const moment = require('moment')
const TicketResponse = require('../../models/TicketResponse');
const ErrorResponse = require("../../models/ErrorResponse");
const { v4: uuidv4 } = require('uuid');

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
            return res.status(200).send(new TicketResponse(200, formatTickets(tickets)))
        }

        return res.status(200).send(new TicketResponse(200, []))

    } catch (err) {
        console.log(err)
        return res.status(500).send(new ErrorResponse(500, "Something went wrong..." + err.message))
    }
})
.post (async (req, res) => {
    try {
        const _status = req.body.hasStatus.toUpperCase()
        if (_status !== "OPEN") {
            return res.status(400).send(new ErrorResponse(400, "Invalid status."))
        }
        const ticket = { 
            userId: res.locals.userId, 
            ticketId: uuidv4().substring(0, 20),
            created_at: new Date(),
            ...req.body,
        }
        await admin.firestore().collection('tickets').doc().set(ticket)
        return res.status(201).send({ ticket })
    } catch (err) {
        console.log(err)
        return res.status(500).send(new ErrorResponse(500, err.message))
    }
})


const formatTickets = tickets => {
    return tickets.docs.map(doc => {
        const data = doc.data();
        data.created_at = moment(new Date(data.created_at._seconds * 1000 + data.created_at._nanoseconds/1000000)).format('MM/DD/YYYY')
        return data
    })
}


module.exports = router;