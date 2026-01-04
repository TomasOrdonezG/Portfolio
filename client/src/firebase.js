import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "XXXX",
    authDomain: "app.firebaseapp.com",
    projectId: "app",
    storageBucket: "app.firebasestorage.app",
    messagingSenderId: "XXX",
    appId: "XXX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
