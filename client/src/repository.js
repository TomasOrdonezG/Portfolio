import { db } from "./firebase.js";
import { collection, doc, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const SHADERS_COLLECTION = "shaders";
const DIR_STRUCTURE_COLLECTION = "dir-structure";
const FILES_COLLECTION = "files";
const DIR_STRUCTURE_DOCUMENT = "root";

class Repository {
    async getShader(shaderName) {
        const snap = await getDoc(doc(db, SHADERS_COLLECTION, shaderName));
        if (!snap.exists()) {
            return null;
        }
        const data = snap.data();
        return data.code;
    }

    async getDirStructure() {
        const snap = await getDoc(doc(db, DIR_STRUCTURE_COLLECTION, DIR_STRUCTURE_DOCUMENT));
        if (!snap.exists()) {
            return null;
        }
        return snap.data();
    }

    async getFile(fileID) {
        const snap = await getDoc(doc(db, FILES_COLLECTION, fileID));
        if (!snap.exists()) {
            return null;
        }
        const data = snap.data();
        return data.data;
    }
}

const repo = new Repository();
export default repo;

