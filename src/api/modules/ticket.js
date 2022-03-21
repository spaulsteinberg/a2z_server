const express = require('express')
const admin = require("firebase-admin");
const moment = require('moment')
const TicketResponse = require('../../models/TicketResponse');
const ErrorResponse = require("../../models/ErrorResponse");
const { v4: uuidv4 } = require('uuid');
const TicketStatus = require('../../utility/TicketStatus')

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
    .get(async (req, res) => {
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
    .post(async (req, res) => {
        try {
            const _status = req.body.hasStatus.toUpperCase()
            if (_status !== "OPEN") {
                return res.status(400).send(new ErrorResponse(400, "Invalid status."))
            }
            const ticketId = uuidv4().substring(0, 23).split("-").join("")
            const ticket = {
                ...req.body,
                userId: res.locals.userId,
                ticketId: ticketId,
                created_at: new Date(),
            }
            await admin.firestore().collection('tickets').doc(ticketId).set(ticket)
            return res.status(201).send({ ticket })
        } catch (err) {
            console.log(err)
            return res.status(500).send(new ErrorResponse(500, err.message))
        }
    })
    .patch(async (req, res) => {
        try {
            const userId = await getUserAssignedToTicket(req.body.ticketId)

            if (!userId) {
                return res.status(404).send(new ErrorResponse(404, `No ticket with ID ${req.body.ticketId} exists.`))
            }
            else if (userId !== res.locals.userId) {
                return res.status(401).send(new ErrorResponse(401, "Unauthorized."))
            }

            await admin.firestore().collection('tickets').doc(req.body.ticketId).update({
                base_pay: req.body.basePay,
                rate_per_mile: req.body.ratePerMile,
                description: req.body.description,
                hasStatus: req.body.hasStatus,
                total: req.body.total
            }, { merge: true })
            return res.status(200).send(true)
        } catch (err) {
            console.log(err)
            return res.status(500).send(new ErrorResponse(500, err.message))
        }
    })

router.delete("/:ticketId", async (req, res) => {
    try {
        const data = await getTicketDocument(req.params.ticketId);
        if (!data) {
            return res.status(404).send(new ErrorResponse(404, `No ticket with ID ${req.params.ticketId} exists.`))
        } else if (data.userId !== res.locals.userId) {
            return res.status(401).send(new ErrorResponse(401, "Unauthorized."))
        } else if (data.hasStatus !== "OPEN") {
            return res.status(400).send(new ErrorResponse(400, "Invalid status."))
        }

        await admin.firestore().collection('tickets').doc(req.params.ticketId).delete()
        return res.status(200).send(true)
    } catch (err) {
        console.log(err)
        return res.status(500).send(new ErrorResponse(500, err.message))
    }
})


router.patch("/status/change", async (req, res) => {
    try {
        const { ticketId, newStatus } = req.query 
        if (!ticketId || !newStatus){
            return res.status(400).send(new ErrorResponse(400, "Bad request. Please check your query parameters."))
        } else if (!TicketStatus.types.includes(newStatus.toUpperCase())) {
            return res.status(400).send(new ErrorResponse(400, "Invalid status type."))
        }
        const userId = await getUserAssignedToTicket(ticketId)
        if (!userId) {
            return res.status(404).send(new ErrorResponse(404, `No ticket with ID ${ticketId} exists.`))
        } else if (userId !== res.locals.userId) {
            return res.status(401).send(new ErrorResponse(401, "Unauthorized."))
        }
        await admin.firestore().collection('tickets').doc(ticketId).update({
            hasStatus: newStatus
        }, { merge: true })
        return res.status(200).send(true)
    } catch (err) {
        console.log(err)
        return res.status(500).send(new ErrorResponse(500, err.message))
    }
})

const getUserAssignedToTicket = async (ticketId) => {
    const doc = await admin.firestore().collection('tickets').doc(ticketId).get()
    return !doc.exists ? null : doc.data().userId
}

const getTicketDocument = async (ticketId) => {
    const doc = await admin.firestore().collection('tickets').doc(ticketId).get()
    return !doc.exists ? null : doc.data()
}

const formatTickets = tickets => {
    return tickets.docs.map(doc => {
        const data = doc.data();
        data.created_at = moment(new Date(data.created_at._seconds * 1000 + data.created_at._nanoseconds / 1000000)).format('MM/DD/YYYY')
        return data
    })
}


module.exports = router;