
let admin = require("firebase-admin");

let serviceAccount = require("../googleServiceAccount.json");

const initFirebase = () => {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

module.exports = initFirebase;