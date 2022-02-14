const express = require('express')
const cors = require('cors')
const api = require('./api')
const initFirebase = require('./firebase')

const PORT = 3000

const app = express()

app.use(express.urlencoded({extended: true}))
app.use(express.json())
app.use(cors())

app.get('/', (req, res) => {
    res.send('Hello world')
})

initFirebase()
api(app)

const server = app.listen(PORT, () => console.log(`Listening on port ${PORT}`))

process.on("SIGINT", () => server.close(() => process.exit()))