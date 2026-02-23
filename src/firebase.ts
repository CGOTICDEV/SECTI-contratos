import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCWZadCCM_6iYv9u3bvSyKY9ACDMnsC1OI",
  authDomain: "contratossecti.firebaseapp.com",
  projectId: "contratossecti",
  storageBucket: "contratossecti.firebasestorage.app",
  messagingSenderId: "297313871015",
  appId: "1:297313871015:web:fd9f749ad34bf266d4a782",
  measurementId: "G-5XZD1HZEC2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// auth helpers
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
  UserCredential,
} from 'firebase/auth';

// firestore helpers
import {
  collection,
  addDoc,
  updateDoc,
  setDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore';

// contracts collection reference
const contractsCollection = collection(db, 'contracts');

export function subscribeContracts(
  callback: (contracts: any[]) => void
) {
  return onSnapshot(contractsCollection, (snapshot) => {
    const data = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    callback(data);
  });
}

export function addContract(contract: any) {
  return addDoc(contractsCollection, contract);
}

export function updateContract(id: string, contract: any) {
  const ref = doc(db, 'contracts', id);
  return updateDoc(ref, contract);
}

// users collection helpers
const usersCollection = collection(db, 'users');
export function addUser(user: any) {
  // use UID as document ID to align with security rules
  if (!user.uid) {
    throw new Error('user.uid is required');
  }
  const ref = doc(db, 'users', user.uid);
  return setDoc(ref, user);
}

export function subscribeUser(uid: string, callback: (userData: any | null) => void) {
  const ref = doc(db, 'users', uid);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback({ uid: snap.id, ...(snap.data() as any) });
    } else {
      callback(null);
    }
  });
}

// helper to update user document; partial updates allowed
export function updateUser(uid: string, data: Partial<any>) {
  const ref = doc(db, 'users', uid);
  // Firestore rejects fields that are explicitly `undefined`, so strip them
  const filtered = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );
  return updateDoc(ref, filtered);
}

// export auth utilities in case they're needed elsewhere
export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
};

export { app, auth, db };
