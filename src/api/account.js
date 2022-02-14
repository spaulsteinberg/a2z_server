const express = require('express')

const router = express.Router()

router.route("/account")
.get((req, res) => {
    console.log("getting account...")
    return res.status(200).send({ok: true})
})
.post((req, res) => {
    console.log("posting account...")
    return res.status(201).send({created: true})
})

module.exports = router