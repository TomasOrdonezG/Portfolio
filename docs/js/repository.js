import { db, storage } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";

const SHADERS_COLLECTION = "shaders";
const DIR_STRUCTURE_COLLECTION = "dir-structure";
const FILES_COLLECTION = "files";
const DIR_STRUCTURE_DOCUMENT = "root";

class Repository {
    async getShader(shaderName) {
        const snap = await getDoc(doc(db, SHADERS_COLLECTION, shaderName));
        if (!snap.exists()) return null;
        const data = snap.data();
        return data.code;
    }

    async getDirStructure() {
        const snap = await getDoc(doc(db, DIR_STRUCTURE_COLLECTION, DIR_STRUCTURE_DOCUMENT));
        if (!snap.exists()) return null;
        return snap.data();
    }

    async getFileData(fileID) {
        const snap = await getDoc(doc(db, FILES_COLLECTION, fileID));
        if (!snap.exists()) return null;
        return snap.data();
    }

    async getFileBlob(filepath) {
        const url = await getDownloadURL(ref(storage, filepath));
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.blob();
    }

    async openFile(filepath) {
        const url = await getDownloadURL(ref(storage, filepath));
        window.open(url, "_blank", "noopener");
    }
}

const repo = new Repository();
export default repo;

