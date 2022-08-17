class UserHistory {
    constructor(ticketId, ticketStatus, ticketTotal, ticketDistance, ticketDate, appStatus) {
        this.ticketId = ticketId;
        this.ticketStatus = ticketStatus;
        this.ticketTotal = ticketTotal,
        this.ticketDistance = ticketDistance;
        this.ticketDate = ticketDate;
        this.appStatus = appStatus;
    }
}

module.exports = UserHistory