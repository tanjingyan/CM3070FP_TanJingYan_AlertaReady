import { initializeApp } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAcJBmvcXnC8f1YTSimPJ3Gf8Rvf-a-xhM",
  authDomain: "disasterapp-d1279.firebaseapp.com",
  projectId: "disasterapp-d1279",
  storageBucket: "disasterapp-d1279.firebasestorage.app",
  messagingSenderId: "12923391620",
  appId: "1:12923391620:web:ad88eaf9aeba20193cbcd1"
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const db = getFirestore(app);

export { auth, db };