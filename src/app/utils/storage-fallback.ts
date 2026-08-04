/**
 * Fallback de Storage para PDFs que ainda excedem o limite de 1 MiB do
 * Firestore mesmo apos compressao.  Em vez de abortar a operacao, enviamos o
 * arquivo (ja comprimido via pdf-compress) para o Firebase Storage e
 * guardamos no Firestore apenas a URL + metadados leves.
 *
 * O download continua funcionando transparentemente: a UI recebe um objeto
 * `TermoAditivoDocument` com `storageUrl` preenchido e usa `fetchURLFile`
 * para baixar direto do Storage.
 */

import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from '../../firebase';
import { compressPdfForFirestore } from './pdf-compress';

const storage = getStorage(app);

export interface StorageUploadResult {
  storageUrl: string;
  storagePath: string;
  size: number;
  type: string;
  technique: string;
  base64Fallback?: string;
}

/** Converte base64 em Uint8Array sem usar atob direto (chunk por memoria). */
function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Faz download de um arquivo hospedado no Storage e retorna como base64. */
export async function fetchStorageFileAsBase64(storageUrl: string): Promise<string> {
  const resp = await fetch(storageUrl);
  if (!resp.ok) throw new Error(`Falha baixando arquivo do Storage: ${resp.status}`);
  const blob = await resp.blob();
  const arr = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < arr.length; i += chunk) {
    binary += String.fromCharCode(...arr.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Remove um arquivo do Storage.  Usado quando o usuario exclui o termo. */
export async function deleteStorageFile(storagePath: string): Promise<void> {
  const fileRef = ref(storage, storagePath);
  await deleteObject(fileRef);
}

/**
 * Salva um documento PDF no Storage.  NAO comprime — o Storage aguenta
 * arquivos de ate varios MB nativamente (free tier: 5GB).  Comprimir so
 * atrasaria o upload desnecessariamente.  Retorna a URL de download e os
 * metadados para persistir no Firestore.
 */
export async function uploadDocumentToStorage(
  contractId: string,
  docId: string,
  fileName: string,
  base64Content: string,
  mimeType: string,
  _bucketBytesBudget?: number,
): Promise<StorageUploadResult> {
  const bytes = base64ToUint8(base64Content);

  const safeName = (fileName || `doc-${Date.now()}.pdf`).replace(/[^\w.\-]/g, '_');
  const path = `contracts/${contractId}/termos/${docId}/${safeName}`;
  const fileRef = ref(storage, path);

  const effectiveMime = mimeType === 'application/pdf' ? 'application/pdf' : (mimeType || 'application/octet-stream');
  const metadata = {
    contentType: effectiveMime,
    customMetadata: {
      contractId,
      docId,
      originalName: fileName || '',
      originalSize: String(bytes.length),
      technique: 'storage-direct',
      uploadedAt: new Date().toISOString(),
    },
  };

  await uploadBytes(fileRef, bytes, metadata);
  const url = await getDownloadURL(fileRef);

  return {
    storageUrl: url,
    storagePath: path,
    size: bytes.length,
    type: effectiveMime,
    technique: 'storage-direct',
  };
}

/**
 * Fornece um buffer baixavel (Blob) para um TermoAditivoDocument.  Se o
 * documento estiver no Storage (storageUrl preenchido), baixa a URL via fetch.
 * Caso contrario, decodifica o base64.
 *
 * Caso o fetch falhe (sem CORS, conexao etc.), o caller pode usar o helper
 * `openStorageUrl` como ultimate fallback — apenas abre a URL numa nova aba.
 */
export async function resolveDocumentBlob(doc: {
  base64?: string;
  storageUrl?: string;
  type?: string;
}): Promise<Blob> {
  if (doc.storageUrl) {
    // Firebase Storage URLs suportam CORS por padrao para GET publico.
    const resp = await fetch(doc.storageUrl, { mode: 'cors' });
    if (!resp.ok) throw new Error(`Download falhou (${resp.status})`);
    return resp.blob();
  }
  if (!doc.base64) throw new Error('Documento sem conteudo acessivel.');
  const bytes = base64ToUint8(doc.base64);
  return new Blob([bytes], { type: doc.type || 'application/octet-stream' });
}

/** Abre a URL do Storage direto numa nova aba — fallback abre-janela ao fetch. */
export function openStorageUrl(doc: { storageUrl?: string; base64?: string }): boolean {
  if (doc.storageUrl) {
    window.open(doc.storageUrl, '_blank');
    return true;
  }
  return false;
}
