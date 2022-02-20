const express = require('express')
const cors = require('cors')
const api = require('./api')
const FirebaseApp = require('./firebase/firebase')

const PORT = 3000

const app = express()

app.use(express.urlencoded({limit: '5mb', extended: true, parameterLimit: 1000000}))
app.use(express.json({limit: '5mb'}))
app.use(cors())

app.get('/', (req, res) => {
    res.send('Hello world')
})

FirebaseApp.initFirebaseApp()
FirebaseApp.initFirebaseFirestore()

api(app)

const server = app.listen(PORT, () => console.log(`Listening on port ${PORT}`))

process.on("SIGINT", () => server.close(() => process.exit()))