import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAPksYGPcnLwO9SHC7P1DjjwTKs-8kZzS0",
  authDomain: "inventario-bomberos-9c195.firebaseapp.com",
  projectId: "inventario-bomberos-9c195",
  storageBucket: "inventario-bomberos-9c195.firebasestorage.app",
  messagingSenderId: "635885112826",
  appId: "1:635885112826:web:556e67d6613a7e606b2843",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };
