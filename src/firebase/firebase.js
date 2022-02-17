
let admin = require("firebase-admin");

let serviceAccount = require("../../googleServiceAccount.json");

class FirebaseApp {

    constructor(){}

    initFirebaseApp() {
        this.app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }

    initFirebaseFirestore() {
        this.db = admin.firestore()
    }

    getApp() { return this.app }

    getFirestore() { 
        console.log(this.db)
        return this.db
     }
}

module.exports = new FirebaseApp();