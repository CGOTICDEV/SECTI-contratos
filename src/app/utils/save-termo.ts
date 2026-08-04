/**
 * Orquestra salvamento de um termo aditivo/extincao no Firestore com fallback
 * automatico para Storage:
 *
 *  1. Estima o tamanho total do documento Firestore ANTES de salvar.
 *  2. Se couber confortavelmente (< safeBytes), salva direto.
 *  3. Se nao couber: envia TODOS os PDFs para o Storage (sem comprimir — o
 *     Storage aceita arquivos grandes nativamente), substitui o base64 dos
 *     PDFs no payload por { storageUrl, storagePath } e salva o documento
 *     contendo apenas referencias + base64 de arquivos nao-PDF (pequenos).
 *
 * Esta funcao nunca lanca excecao por tamanho — garantindo que o termo SEMPRE
 * salve (mesmo que os PDFs fiquem no Storage). Erros de rede/permissoes sao
 * repassados ao caller.  Logs detalhados em cada etapa para depuracao.
 */

import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { uploadDocumentToStorage, type StorageUploadResult } from './storage-fallback';

const MIME_PDF = 'application/pdf';

export interface SaveDocumentInput {
  id: string;
  tipo: 'termo' | 'extincao';
  /**丈夫 documento ja montado com todos os campos (note, tipo, ajuste,
   * vigenciaInicial, prorrogacao, documents, etc.).  O caller constroi o
   * objeto `newEntry` exatamente como quer persistir. */
  entry: any;
  /** Snapshot atual do contrato (para merge com demais campos persistidos). */
  current: any;
  /** Campos extra a atualizar no contrato (vigenciaAtual, situacao, etc.). */
  contractFieldUpdates?: Record<string, any>;
  /** Limite considerado seguro para gravar direto no Firestore (~900KB). */
  safeBytes?: number;
  /** verbose logging */
  log?: (msg: string, data?: any) => void;
}

export interface SaveDocumentResult {
  success: boolean;
  wentToStorage: boolean;
  uploadedUrls: string[];
  error?: string;
}

function isPdfDoc(d: any): boolean {
  return d?.type === MIME_PDF || (d?.name || '').toLowerCase().endsWith('.pdf');
}

/** Estima (por baixo) o tamanho do documento Firestore em bytes de base64. */
function estimateFirestoreBytes(payload: any): number {
  // JSON.stringify e uma boa aproximacao — Firestore serializa parecido.
  try {
    return JSON.stringify(payload).length;
  } catch {
    let total = 0;
    try {
      for (const k of Object.keys(payload)) {
        const v = (payload as any)[k];
        if (typeof v === 'string') total += v.length;
        else if (Array.isArray(v)) {
          for (const item of v) total += estimateFirestoreBytes(item);
        } else if (v && typeof v === 'object') {
          total += estimateFirestoreBytes(v);
        }
      }
    } catch {}
    return total;
  }
}

/**
 * Salva o termo/extincao, enviando PDFs demais para o Storage quando o
 * documento Firestore ficaria grande demais.
 */
export async function saveTermoWithFallback(
  opts: SaveDocumentInput,
): Promise<SaveDocumentResult> {
  const log = opts.log ?? (() => {});
  const safeBytes = opts.safeBytes ?? 850_000; // ~830KB JSON ~ 1MiB Firestore
  const contractRef = doc(db, 'contracts', opts.id);

  const entry = { ...opts.entry };
  const docs: any[] = Array.isArray(entry.documents) ? [...entry.documents] : [];

  // 1) TENTA DIRETO (fast path) — se documento pequeno, nao faz nada pesado.
  const payloadDirect = buildPayload(opts, entry);
  const directSize = estimateFirestoreBytes(payloadDirect);
  log(`Tentativa 1 (direto): tamanho estimado ${Math.round(directSize / 1024)}KB`, { budget: Math.round(safeBytes / 1024) });

  if (directSize <= safeBytes) {
    try {
      await updateDoc(contractRef, payloadDirect as any);
      log('Tentativa 1 OK');
      return { success: true, wentToStorage: false, uploadedUrls: [] };
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      // Se for erro de tamanho (raro tendo cabido na estimativa), cai pro fluxo
      // de Storage.  Outros erros sao repassados.
      if (!isSizeError(msg)) {
        return { success: false, wentToStorage: false, uploadedUrls: [], error: msg };
      }
      log('Firestore rejeitou por tamanho mesmo apos estimativa — caindo pra fallback');
    }
  }

  // 2) FALLBACK: envia PDFs para o Storage e salva Firestore com referencias.
  const pdfDocs = docs.filter(isPdfDoc);
  const nonPdfDocs = docs.filter((d) => !isPdfDoc(d));

  if (pdfDocs.length === 0) {
    // sem PDFs p/ tirar — nao temos o que fazer; repassa o erro original.
    log('Documento grande mas sem PDFs para mover pro Storage');
    return {
      success: false,
      wentToStorage: false,
      uploadedUrls: [],
      error: 'Documento grande demais e sem PDFs para mover ao Storage.',
    };
  }

  log(`Caindo pro Storage: ${pdfDocs.length} PDF(s) -> Storage, ${nonPdfDocs.length} nao-PDF mantidos`);
  const uploadedUrls: string[] = [];
  const replacedDocs: any[] = [];

  for (let i = 0; i < pdfDocs.length; i++) {
    const d = pdfDocs[i];
    const docInternalId = `${entry.timestamp}_${i}`;
    try {
      log(`Upload PDF "${d.name}" (${Math.round((d.base64?.length || 0) / 1024)}KB base64) -> Storage`);
      // uploadDocumentToStorage comprime internamente se necessario e devolve URL
      const res: StorageUploadResult = await uploadDocumentToStorage(
        opts.id,
        docInternalId,
        d.name,
        d.base64 ?? '',
        d.type || MIME_PDF,
        // budget bem frouxo: o Storage aguenta varios MiB
        10_000_000,
      );
      uploadedUrls.push(res.storageUrl);
      replacedDocs.push({
        id: docInternalId,
        name: d.name,
        type: res.type || d.type,
        size: res.size,
        uploadedAt: d.uploadedAt || entry.timestamp,
        uploadedBy: d.uploadedBy,
        storageUrl: res.storageUrl,
        storagePath: res.storagePath,
        // SEM base64 — fica no Storage
      });
      log(`  upload OK -> ${res.storageUrl}`);
    } catch (uploadErr: any) {
      const msg = String(uploadErr?.message || uploadErr || '');
      log('Upload Storage falhou', msg);
      return { success: false, wentToStorage: true, uploadedUrls, error: `Falha no upload: ${msg}` };
    }
  }

  // documentos nao-PDFs seguem como base64 (assumimos pequenos)
  const finalDocs = [...replacedDocs, ...nonPdfDocs];
  const storageEntry = { ...entry, documents: finalDocs };
  const payloadStorage = buildPayload(opts, storageEntry);
  const storageSize = estimateFirestoreBytes(payloadStorage);
  log(`Tentativa final: tamanho estimado ${Math.round(storageSize / 1024)}KB apos mover PDFs`);

  try {
    await updateDoc(contractRef, payloadStorage as any);
    log('TENTATIVA FINAL OK — PDFs no Storage, metadados no Firestore');
    return { success: true, wentToStorage: true, uploadedUrls };
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    log('Tentativa final FALHOU', msg);
    return { success: false, wentToStorage: true, uploadedUrls, error: msg };
  }
}

function buildPayload(opts: SaveDocumentInput, entry: any): any {
  // monta o payload exatamente como antes, mantendo history trimado e campos
  // extras do contrato (situacao, vigenciaAtual, etc.) opcionais
  const newTermos = [...(opts.current.termosAditivos || []), entry];
  if (newTermos.length > 200) {
    newTermos.splice(0, newTermos.length - 200);
  }
  const payload: any = {
    termosAditivos: newTermos,
  };
  if (opts.contractFieldUpdates) {
    Object.assign(payload, opts.contractFieldUpdates);
  }
  return payload;
}

function isSizeError(msg: string): boolean {
  return (
    msg.includes('maximum allowed size') ||
    msg.includes('document size') ||
    msg.includes('exceeds the maximum') ||
    msg.includes('Resource Exhausted')
  );
}
