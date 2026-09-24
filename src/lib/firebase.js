import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyChgpmKYdvhSUEgXFpzslRhtf5QnDs0K8o",
  authDomain: "coaching-wolf.firebaseapp.com",
  projectId: "coaching-wolf",
  storageBucket: "coaching-wolf.firebasestorage.app",
  messagingSenderId: "285634070161",
  appId: "1:285634070161:web:f92bf7a887f7cc9e32a130",
  measurementId: "G-HRFE5VYZ10",
  databaseURL: "https://coaching-wolf-default-rtdb.firebaseio.com/"
};

export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean);

// Paste the two Trigger URLs you get after deploying the functions in the
// Google Cloud Console (Cloud Functions -> your function -> "Trigger" tab).
const REQUEST_RESET_URL = "https://REPLACE-WITH-YOUR-requestPasswordReset-URL";
const CONFIRM_RESET_URL = "https://REPLACE-WITH-YOUR-confirmPasswordReset-URL";

let app, auth, db;
if (firebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getDatabase(app);
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

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error || "Request failed.");
    error.status = response.status;
    throw error;
  }
  return data;
}

// Sends a 6-digit code by email via the requestPasswordReset Cloud Function.
export async function requestPasswordResetCode(email) {
  if (!firebaseConfigured) return null;
  return postJson(REQUEST_RESET_URL, { email });
}

// Verifies the 6-digit code and sets the new password via the
// confirmPasswordReset Cloud Function.
export async function confirmPasswordResetCode(email, code, newPassword) {
  if (!firebaseConfigured) return null;
  return postJson(CONFIRM_RESET_URL, { email, code, newPassword });
}

export async function logoutFirebase() {
  if (firebaseConfigured) await signOut(auth);
}
