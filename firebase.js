// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAezWXKYfyJ5z_wch48VCVlWlzVJI3uiKM",
  authDomain: "tournament-manager-a60fa.firebaseapp.com",
  projectId: "tournament-manager-a60fa",
  storageBucket: "tournament-manager-a60fa.firebasestorage.app",
  messagingSenderId: "381028928902",
  appId: "1:381028928902:web:72f53aeb82f16905273007",
  measurementId: "G-KLD2LBVKZK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);