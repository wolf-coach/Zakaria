import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.storageBucket,
  firebaseConfig.messagingSenderId,
  firebaseConfig.appId,
].every((value) => typeof value === "string" && value.trim().length > 0);

let app = null;
let auth = null;
let db = null;

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

export async function resetPassword(email) {
  if (!firebaseConfigured) return null;
  return sendPasswordResetEmail(auth, email);
}

export async function logoutFirebase() {
  if (firebaseConfigured && auth) await signOut(auth);
}
