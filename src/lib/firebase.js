import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyChgpmKYdvhSUEgXFpzslRhtf5QnDs0K8o",
  authDomain: "coaching-wolf.firebaseapp.com",
  projectId: "coaching-wolf",
  storageBucket: "coaching-wolf.firebasestorage.app",
  messagingSenderId: "285634070161",
  appId: "1:285634070161:web:f92bf7a887f7cc9e32a130",
  measurementId: "G-HRFE5VYZ10"
};

export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean);

let app, auth, db;
if (firebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { auth, db };

export async function loginEmail(email, password) {
  if (!firebaseConfigured) return null;
  return signInWithEmailAndPassword(auth, email, password);
}
export async function registerEmail(email, password) {
  if (!firebaseConfigured) return null;
  return createUserWithEmailAndPassword(auth, email, password);
}
export async function loginGoogle() {
  if (!firebaseConfigured) return null;
  return signInWithPopup(auth, new GoogleAuthProvider());
}
export async function resetPassword(email) { if (!firebaseConfigured) return null; return sendPasswordResetEmail(auth, email); }
export async function logoutFirebase() {
  if (firebaseConfigured) await signOut(auth);
}