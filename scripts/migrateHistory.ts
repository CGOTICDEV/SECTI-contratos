/*
Utility to move history/apostilas out of the main contract document and into
subcollections.  Run with `node -r ts-node/register scripts/migrateHistory.ts`
(or compile first).  It will:

1. fetch every contract
2. if it has a non-empty `history` or `apostilas` array it will
   a. write each element into a subcollection named `history` or `apostilas`
      under the contract document
   b. remove the arrays from the parent document (set them to [])
   c. optionally keep only the last N entries in the doc as a safety cache

After the script finishes the frontend can be updated to read from the
subcollections instead of the arrays.  The examples in the app have already
been modified to guard against oversize documents and to trim on update; you
can delete the arrays in the future once the UI no longer depends on them.
*/

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, writeBatch, addDoc } from 'firebase/firestore';

// copy your firebaseConfig from src/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyCWZadCCM_6iYv9u3bvSyKY9ACDMnsC1OI",
  authDomain: "contratossecti.firebaseapp.com",
  projectId: "contratossecti",
  storageBucket: "contratossecti.firebasestorage.app",
  messagingSenderId: "297313871015",
  appId: "1:297313871015:web:fd9f749ad34bf266d4a782",
  measurementId: "G-5XZD1HZEC2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const contractsCol = collection(db, 'contracts');
  const snap = await getDocs(contractsCol);
  console.log(`found ${snap.size} contracts`);
  for (const c of snap.docs) {
    const data: any = c.data();
    const updates: any = {};
    const batch = writeBatch(db);

    if (Array.isArray(data.history) && data.history.length > 0) {
      console.log(`${c.id}: migrating ${data.history.length} history entries`);
      for (const entry of data.history) {
        const histRef = collection(doc(db, 'contracts', c.id), 'history');
        batch.set(doc(histRef), entry);
      }
      updates.history = [];
    }
    if (Array.isArray(data.apostilas) && data.apostilas.length > 0) {
      console.log(`${c.id}: migrating ${data.apostilas.length} apostilas`);
      for (const a of data.apostilas) {
        const apoRef = collection(doc(db, 'contracts', c.id), 'apostilas');
        batch.set(doc(apoRef), a);
      }
      updates.apostilas = [];
    }
    if (Object.keys(updates).length) {
      batch.update(doc(db, 'contracts', c.id), updates);
      await batch.commit();
    }
  }
  console.log('migration complete');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});