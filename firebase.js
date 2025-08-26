
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDxTQQHrzdStBfT3xVft6904V0NnyuORIs",
  authDomain: "iclean-field-service-4bddd.firebaseapp.com",
  projectId: "iclean-field-service-4bddd",
  storageBucket: "iclean-field-service-4bddd.appspot.com",
  messagingSenderId: "56483628989",
  appId: "1:56483628989:web:650863793197768f",
  databaseURL: "https://iclean-field-service-4bddd.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
