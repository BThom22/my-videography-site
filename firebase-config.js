// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBF1v6CO2mk-Qne0smAcFNX2GcGAoB32qI",
  authDomain: "login-page-43864.firebaseapp.com",
  projectId: "login-page-43864",
  storageBucket: "login-page-43864.firebasestorage.app",
  messagingSenderId: "142631832617",
  appId: "1:142631832617:web:6ebfe70a7976f45dd66038",
  measurementId: "G-CBRK8ELDWY"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
