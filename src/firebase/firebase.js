
let admin = require("firebase-admin");

let serviceAccount = require("../../googleServiceAccount.json");

require('dotenv').config()

class FirebaseApp {

    constructor(){}

    initFirebaseApp() {
        this.app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: process.env.GS_STORAGE_BUCKET
        });
    }

    initFirebaseFirestore() {
        this.db = admin.firestore()
    }
    
    getApp = () => this.app
    getFirestore = () => this.db
}

module.exports = new FirebaseApp();