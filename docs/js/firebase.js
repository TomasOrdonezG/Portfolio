import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDgdpOPBiJPlUD06zLAjDFLRquQqgsVC68",
    authDomain: "tomasportfolio-106ad.firebaseapp.com",
    projectId: "tomasportfolio-106ad",
    storageBucket: "tomasportfolio-106ad.firebasestorage.app",
    messagingSenderId: "325104305792",
    appId: "1:325104305792:web:3033b2a0ef70a3aeff8865"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage();

export { app, db, storage };
