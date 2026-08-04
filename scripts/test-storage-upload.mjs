// Script de teste isolado para validar upload/download no Firebase Storage.
// Roda direto via node usando ESM.
//
//   node scripts/test-storage-upload.mjs
//
// Precisa das variaveis de ambiente FIREBASE_API_KEY, FIREBASE_AUTH_EMAIL e
// FIREBASE_AUTH_PASSWORD para autenticar (mesma conta que voce usa no app).

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY ?? 'AIzaSyCWZadCCM_6iYv9u3bvSyKY9ACDMnsC1OI',
  authDomain: 'contratossecti.firebaseapp.com',
  projectId: 'contratossecti',
  storageBucket: 'contratossecti.firebasestorage.app',
  messagingSenderId: '297313871015',
  appId: '1:297313871015:web:fd9f749ad34bf266d4a782',
  measurementId: 'G-5XZD1HZEC2',
};

const TEST_EMAIL = process.env.FIREBASE_AUTH_EMAIL;
const TEST_PASSWORD = process.env.FIREBASE_AUTH_PASSWORD;

async function main() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.error('Defina FIREBASE_AUTH_EMAIL e FIREBASE_AUTH_PASSWORD para rodar o teste.');
    process.exit(1);
  }

  console.log('Inicializando app...');
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const storage = getStorage(app);

  console.log(`Autenticando como ${TEST_EMAIL}...`);
  const cred = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
  if (!cred.user.emailVerified) {
    console.warn('Aviso: email nao verificado. As regras de Storage podem barrar uploads.');
  }
  console.log(` UID: ${cred.user.uid}`);

  // Conteudo de teste: PDF minimo ASCII (invalido, mas suficiente pra Storage)
  const pdfHeader = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF';
  const bytes = new TextEncoder().encode(pdfHeader);
  const blob = new Uint8Array(bytes);
  const fileName = `test-fallback-${Date.now()}.pdf`;
  const path = `contracts/test/${fileName}`;
  console.log(`\nFazendo upload de ${fileName} em ${path} (${bytes.length} bytes)...`);

  const fileRef = ref(storage, path);
  const metadata = { contentType: 'application/pdf', customMetadata: { teste: 'true', origem: 'script' } };
  const snap = await uploadBytes(fileRef, blob, metadata);
  console.log(` Upload OK: bytes=${snap.totalBytes} metadata=${JSON.stringify(snap.metadata.customMetadata ?? {})}`);

  const url = await getDownloadURL(fileRef);
  console.log(` Download URL: ${url}`);

  // cleanup opcional — comente a proxima linha para preservar o arquivo
  console.log('\nRemovendo arquivo de teste...');
  await deleteObject(fileRef);
  console.log(' OK');

  console.log('\nSUCESSO: Storage operacional.');
  process.exit(0);
}

main().catch((err) => {
  console.error('FALHOU:', err);
  process.exit(1);
});
