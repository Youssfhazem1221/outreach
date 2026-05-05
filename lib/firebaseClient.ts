import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

// Initialize Firebase only if it hasn't been initialized yet
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// To prevent Vercel build crashes when env vars are missing during the build phase,
// we only call getAuth() and getFirestore() if the API key is actually present.
const hasApiKey = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

const auth = hasApiKey ? getAuth(app) : ({} as any);
const db = hasApiKey ? getFirestore(app) : ({} as any);
const googleProvider = hasApiKey ? new GoogleAuthProvider() : ({} as any);

export { app, auth, db, googleProvider };
