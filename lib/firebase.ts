import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCpKDmFtMF7VSeUqx0c4wMvnBWTP62TXs8",
  authDomain: "familyshop-d54da.firebaseapp.com",
  projectId: "familyshop-d54da",
  storageBucket: "familyshop-d54da.firebasestorage.app",
  messagingSenderId: "331402676242",
  appId: "1:331402676242:web:2b2bd56dfbc4d0fa9e70cb",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);