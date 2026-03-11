// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "fallback_api_key_to_prevent_build_crash",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "fallback_domain",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "fallback_project",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "fallback_bucket",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "fallback_sender",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "fallback_app_id",
};

// Initialize Firebase (checking if it already exists to prevent Next.js hot-reload crashes)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
