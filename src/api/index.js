const accountApi = require('./modules/account')
const ticketApi = require('./modules/ticket');

const ROUTE_PREFIX = "/api/v1/"

const api = app => {
    app.use(ROUTE_PREFIX + "account", accountApi),
    app.use(ROUTE_PREFIX + "tickets", ticketApi)
}

module.exports = api