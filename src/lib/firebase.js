import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const firebaseConfigured = Object.values(config).every(Boolean);

let app, auth, db;
if (firebaseConfigured) {
  app = initializeApp(config);
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
export async function logoutFirebase() {
  if (firebaseConfigured) await signOut(auth);
}