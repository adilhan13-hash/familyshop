import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCpKDmFtMF7VSeUqx0c4wMvnBWTP62TXs8",
  authDomain: "familyshop-d54da.firebaseapp.com",
  projectId: "familyshop-d54da",
  storageBucket: "familyshop-d54da.firebasestorage.app",
  messagingSenderId: "331402676242",
  appId: "1:331402676242:web:2b2bd56dfbc4d0fa9e70cb",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const auth = getAuth(app);