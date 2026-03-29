import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, onValue } from 'firebase/database'

const firebaseConfig = {
  apiKey: "",
  authDomain: "survey-app-53df0.firebaseapp.com",
  projectId: "survey-app-53df0",
  storageBucket: "survey-app-53df0.appspot.com",
  messagingSenderId: "652955733142",
  appId: "1:652955733142:web:86a160d38826b0c241c6b7",
  measurementId: "G-X99NWKE6TT"
};

const app = initializeApp(firebaseConfig)
const database = getDatabase(app)

export { database, ref, set, onValue }
