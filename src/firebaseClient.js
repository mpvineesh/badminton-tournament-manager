import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let db = null;
let storage = null;
let firebaseApp = null;
let auth = null;
if (hasFirebaseConfig) {
  firebaseApp = initializeApp(firebaseConfig);
  db = getFirestore(firebaseApp);
  storage = getStorage(firebaseApp);
  auth = getAuth(firebaseApp);
}

// Ensures a Firebase session exists so Firestore security rules that require
// request.auth (anonymous is fine) accept the app's reads/writes. The app's
// own OTP/localStorage login is separate and unaffected. Resolves to the
// Firebase user (or null if Firebase isn't configured / sign-in fails).
let anonAuthPromise = null;
export function ensureAnonymousAuth() {
  if (!auth) return Promise.resolve(null);
  if (anonAuthPromise) return anonAuthPromise;
  anonAuthPromise = new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      }
    });
    signInAnonymously(auth).catch((err) => {
      unsubscribe();
      // Most common cause: the "Anonymous" sign-in provider is disabled in the
      // Firebase console. Surface it without crashing the app.
      console.warn(
        '[firebase] Anonymous sign-in failed. Enable the Anonymous provider in ' +
          'Firebase Console → Authentication → Sign-in method.',
        err?.code || err
      );
      resolve(null);
    });
  });
  return anonAuthPromise;
}

export { db, storage, auth, firebaseApp, hasFirebaseConfig };
