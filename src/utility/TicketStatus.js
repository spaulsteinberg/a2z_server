const TicketStatus = Object.freeze({
    OPEN: "OPEN",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED"
})

const TicketStatusTypes = Object.values(TicketStatus)

module.exports.status = TicketStatus,
module.exports.types = TicketStatusTypes