import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase config - Lấy từ Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyA7I1TGKSQ1eg3Tx_Um_Oq0SgQDJrnZcyg",
  authDomain: "sung-8804d.firebaseapp.com",
  projectId: "sung-8804d",
  storageBucket: "sung-8804d.firebasestorage.app",
  messagingSenderId: "674013648324",
  appId: "1:674013648324:web:3ff7818fb1b5d524908091",
   measurementId: "G-3BZGW53HLL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app); // ✅ Firestore
export const storage = getStorage(app);

export default app;