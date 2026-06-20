import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query, where, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCM_7_nTNaz7f9-j-zMZJcdGY6SZkEMvmc",
    authDomain: "lora-perfum.firebaseapp.com",
    projectId: "lora-perfum",
    storageBucket: "lora-perfum.firebasestorage.app",
    messagingSenderId: "612778500661",
    appId: "1:612778500661:web:d84d7f30023ae0ba42c77c",
    measurementId: "G-N043M0YRX7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query, where, onSnapshot };
