const accountApi = require('./modules/account')
const ticketApi = require('./modules/ticket');
const historyApi = require('./modules/history')

const ROUTE_PREFIX = "/api/v1/"

const api = app => {
    app.use(ROUTE_PREFIX + "account", accountApi),
    app.use(ROUTE_PREFIX + "tickets", ticketApi),
    app.use(ROUTE_PREFIX + "history", historyApi)
}

module.exports = api