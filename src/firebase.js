
var admin = require("firebase-admin");

var serviceAccount = require("./googleServiceAccount.json");

const initFirebase = () => {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

module.exports = initFirebase;