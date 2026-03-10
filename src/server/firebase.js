// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD24lkC3jgpjxRR2f7tUMjUnoWURbN_27w",
  authDomain: "cartera-6c065.firebaseapp.com",
  projectId: "cartera-6c065",
  storageBucket: "cartera-6c065.firebasestorage.app",
  messagingSenderId: "330193325352",
  appId: "1:330193325352:web:59db067709b3c062da941d",
  measurementId: "G-45DDSL3N15"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { app, auth, db, analytics };
