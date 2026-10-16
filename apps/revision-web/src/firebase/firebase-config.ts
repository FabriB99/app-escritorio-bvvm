import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAPksYGPcnLwO9SHC7P1DjjwTKs-8kZzS0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "inventario-bomberos-9c195.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "inventario-bomberos-9c195",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "inventario-bomberos-9c195.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "635885112826",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:635885112826:web:556e67d6613a7e606b2843",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };