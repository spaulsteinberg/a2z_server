const accountApi = require('./account')

const ROUTE_PREFIX = "/api/v1/"

const api = app => {
    app.use(ROUTE_PREFIX + "account", accountApi)
}

module.exports = api