const express = require('express')
const admin = require("firebase-admin");
const moment = require('moment')
const TicketResponse = require('../../models/TicketResponse');
const ErrorResponse = require("../../models/ErrorResponse");
const { v4: uuidv4 } = require('uuid');
const { TicketStatusList, TicketStatus } = require('../../constants/TicketStatus');
const AccountResponse = require('../../models/AccountResponse');
const axios = require("axios")
const polyline = require('@mapbox/polyline');

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



router.get("/status", async (req, res) => {
    let _status = req.query.code;

    if (!_status) {
        return res.status(400).send(new ErrorResponse(400, "Must include a status query with ?code=<CODE>."))
    }

    let status = _status.toUpperCase()

    if (!TicketStatusList.includes(status)) {
        return res.status(400).send(new ErrorResponse(400, "Status must be OPEN | IN_PROGRESS | CANCELLED | COMPLETED"))
    }

    try {
        const tickets = await admin.firestore().collection('tickets').where("hasStatus", "==", status).get()
        if (tickets) {
            const result = formatShortTickets(formatTickets(tickets))
            return res.status(200).send(new TicketResponse(200, result))
        }
        return res.status(200).send(new TicketResponse(200, []))
    } catch (err) {
        console.log(err)
        return res.status(500).send(new ErrorResponse(500, err.message))
    }
})

router.get("/feed", async (req, res) => {
    
    let centerLat, centerLng, radius;

    try {
        if (!req.query.center) {
            return res.status(400).send(new ErrorResponse(400, `A center lat,lng must be provided.`))
        }

        center = req.query.center.split(",");
        centerLat = parseFloat(center[0])
        centerLng = parseFloat(center[1])
    } catch (err) {
        return res.status(400).send(new ErrorResponse(400, `Invalid center lat,lng: ${center}`))
    }

    try {
        if (!req.query.radius) radius = 25
        else {
            radius = parseFloat(req.query.radius)
            if (radius > 100) {
                return res.status(400).send(new ErrorResponse(400, `Invalid radius value: Radius cannot be greater than 100.`))
            }
        }
    } catch (err) {
        return res.status(400).send(new ErrorResponse(400, `Invalid radius value: ${req.query.radius}`))
    }

    try {
        const tickets = await admin.firestore().collection('tickets').where("hasStatus", "==", TicketStatus.OPEN).get()
        if (tickets) {
            return res.status(200).send(new TicketResponse(200, getTicketsInRange(tickets, centerLat, centerLng, radius)))
        }
        return res.status(200).send(new TicketResponse(200, []))
    } catch (err) {
        console.log(err)
        return res.status(500).send(new ErrorResponse(500, err.message))
    }
})

router.route("/:ticketId")
    .get(async (req, res) => {
        try {
            const data = await getTicketDocument(req.params.ticketId);
            if (!data) {
                return res.status(404).send(new ErrorResponse(404, `No ticket with ID ${req.params.ticketId} exists.`))
            }

            const posterProfile = await admin.firestore().collection('users').doc(data.userId).get()
            let profileData;
            if (posterProfile.exists) {
                let allProfileData = posterProfile.data()
                profileData = {
                    firstName: allProfileData.firstName,
                    lastName: allProfileData.lastName,
                    companyName: allProfileData.companyName,
                    photoUrl: allProfileData.photoUrl
                }
            }
            // get profile data from user that posted here
            return res.status(200).send({ ticket: new TicketResponse(200, formatTicket(data)), profile: new AccountResponse(profileData ? 200 : 500, profileData) })
        } catch (err) {
            console.log(err)
            return res.status(500).send(new ErrorResponse(500, err.message))
        }
    })
    .delete(async (req, res) => {
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

router.post("/:ticketId/route", async (req, res) => {
    try {
        const { startPlaceId, endPlaceId } = req.body
        if (!startPlaceId || !endPlaceId) {
            return res.status(400).send(new ErrorResponse(400, "Invalid start or end place."))
        }
        const directions = await axios.get(`https://maps.googleapis.com/maps/api/directions/json?origin=place_id:${startPlaceId}&destination=place_id:${endPlaceId}&mode=driving&key=${process.env.GOOGLE_MAPS_KEY}`)
        const { points } = directions.data.routes[0].overview_polyline
        let latLngPairs = polyline.decode(points)
        latLngPairs = latLngPairs.map(pair => ({ latitude: pair[0], longitude: pair[1]}))
        return res.status(200).send({ coordinates: latLngPairs})
    } catch (err) {
        console.log(err)
        return res.status(500).send(new ErrorResponse(500, err.message))
    }
})


router.patch("/status/change", async (req, res) => {
    try {
        const { ticketId, newStatus } = req.query
        if (!ticketId || !newStatus) {
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

const formatFilteredTickets = tickets => {
    return tickets.map(ticket => {
        ticket.created_at = moment(new Date(ticket.created_at._seconds * 1000 + ticket.created_at._nanoseconds / 1000000)).format('MM/DD/YYYY')
        return ticket
    })
}

const formatTicket = ticket => {
    ticket.created_at = moment(new Date(ticket.created_at._seconds * 1000 + ticket.created_at._nanoseconds / 1000000)).format('MM/DD/YYYY')
    return ticket
}

const formatShortTickets = tickets => tickets.map(ticket => ({
    id: ticket.ticketId,
    distance: ticket.distance,
    duration: ticket.est_duration,
    ratePerMile: ticket.rate_per_mile,
    origin: ticket.start_city_state,
    destination: ticket.end_city_state
}))


const degreesToRadians = degrees => {
    return degrees * Math.PI / 180;
}

function distanceInMilesBetweenEarthCoordinates(lat1, lon1, lat2, lon2, radius) {
    const EARTH_RADIUS_KM = 6371;

    let dLat = degreesToRadians(lat2 - lat1);
    let dLon = degreesToRadians(lon2 - lon1);

    lat1 = degreesToRadians(lat1);
    lat2 = degreesToRadians(lat2);

    let a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c * 0.621371;
}

const ticketIsInRange = (centerLat, centerLng, startLat, startLng, radius) => distanceInMilesBetweenEarthCoordinates(centerLat, centerLng, startLat, startLng) <= radius

const getTicketsInRange = (tickets, centerLat, centerLng, radius) => {
    const filteredTickets = tickets.docs.filter(ticket => {
        let t = ticket.data()
        if (t.geoPoints) {
            if (ticketIsInRange(centerLat, centerLng, t.geoPoints.start.lat, t.geoPoints.start.lng, radius)) {
                return true
            }
            return false
        }
        return false
    })
    return formatShortTickets(formatFilteredTickets(filteredTickets.map(ticket => ticket.data())))
}

module.exports = router;