// firebase authentication configuration

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAcJBmvcXnC8f1YTSimPJ3Gf8Rvf-a-xhM",
  authDomain: "disasterapp-d1279.firebaseapp.com",
  projectId: "disasterapp-d1279",
  storageBucket: "disasterapp-d1279.firebasestorage.app",
  messagingSenderId: "12923391620",
  appId: "1:12923391620:web:ad88eaf9aeba20193cbcd1"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;