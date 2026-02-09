import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBhSvazA_0PGPYA4OPz3d5PsF0SRheu77w",
  authDomain: "crazzy-29579.firebaseapp.com",
  projectId: "crazzy-29579",
  storageBucket: "crazzy-29579.firebasestorage.app",
  messagingSenderId: "386641140203",
  appId: "1:386641140203:web:c3b9615baa2db0de68e1ae",
  measurementId: "G-E8LQ6PN6CQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Cloudinary config
export const cloudinaryConfig = {
  cloudName: 'dnobraoue',
  uploadPreset: 'CRAZZY',
};

export default app;
