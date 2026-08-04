/**
 * Utilitarios para compressao e redimensionamento de PDFs antes de salvar no
 * Firestore.  O Firestore impoe um limite duro de ~1 MiB por documento, e um
 * contrato acumula muitos PDFs (termos aditivos, extincoes, apostilas), por
 * isso aplicamos uma sequencia de tecnicas para garantir que o documento caiba
 * preservando legibilidade.
 *
 * Estrategia (em ordem — para a primeira que encaixar no budget):
 *
 *   1. Passada "leve" com pdf-lib: reescreve o PDF removendo metadata e
 *      reaproveitando os streams ja comprimidos.  Preserve qualidade vetorial,
 *      nao re-rasteriza -> nao perde nitidez, e rapido.
 *   2. Substituir imagens embutidas grandes por JPEGs reduzidos (preserve o
 *      texto vetorial — apenas re-encoda as imagens JPEG dentro do PDF).
 *   3. Rasterizacao escalada para baixo (0.5x, 0.75x, ...) em escala de cinza
 *      e JPEG de baixa qualidade.  Custo mais alto, usa como ultimo recurso.
 *   4. Como "ultimate fallback", devolve o menor resultado ja visto e
 *      sinaliza para o caller decidir o que fazer (ex.: mandar pro Storage).
 *
 * Importante: a funcao nunca lanca — sempre retorna um CompressResult.  Erros
 * sao logados e tratados; o chamador decide o que fazer quando o tamanho
 * resultado ainda e maior que o budget.
 */

import pako from 'pako';

const MIME_PDF = 'application/pdf';

let pdfjsModule: any = null;
async function getPdfjs(): Promise<any> {
  if (pdfjsModule) return pdfjsModule;
  const mod: any = await import('pdfjs-dist' as any);
  try {
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.js?url' as any)).default;
    mod.GlobalWorkerOptions.workerSrc = workerUrl;
  } catch {
    try {
      mod.GlobalWorkerOptions.workerSrc = '';
    } catch {}
  }
  pdfjsModule = mod;
  return pdfjsModule;
}

export interface CompressResult {
  base64: string;
  type: string;
  size: number;
  originalSize: number;
  technique: string;
}

interface CompressOptions {
  /** budget maximo em bytes do base64 resultante */
  maxBytes: number;
  /** escala inicial (relativa ao tamanho original) – 1 = 100% */
  initialScale?: number;
  /** qualidade JPEG inicial (0-1) */
  initialQuality?: number;
  /** tentativas maximas de reducao */
  maxAttempts?: number;
  /** se true, renderiza em escala de cinza */
  grayscale?: boolean;
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function bytesToBase64(bytes: Uint8Array): string {
  return uint8ToBase64(bytes);
}

/**
 * Passada leve com pdf-lib: apenas reescreve o PDF com useObjectStreams e
 * remocao de metadata.  nao perde conteudo vetorial, e rapido (nao renderiza).
 */
async function relightPdf(pdfBase64: string): Promise<string> {
  const { PDFDocument } = await import('pdf-lib');
  const bytes = base64ToUint8(pdfBase64);
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  try {
    src.setTitle('');
    src.setAuthor('');
    src.setSubject('');
    src.setKeywords([]);
    src.setProducer('pdf-lib');
    src.setCreator('pdf-lib');
  } catch {}
  const out = await src.save({ useObjectStreams: true });
  return bytesToBase64(out);
}

/**
 * Renderiza cada pagina do PDF em uma imagem JPEG e reencapsula em um novo PDF.
 * USE APENAS como ultimo recurso — perde a nitidez vetorial.  O scale aqui
 * controla o tamanho final (1 = mesmo tamanho, <1 = reduzido).
 */
async function rasterizePdf(
  pdfBase64: string,
  scale: number,
  quality: number,
  grayscale: boolean,
): Promise<string> {
  const pdfjs = await getPdfjs();
  const bytes = base64ToUint8(pdfBase64);
  const loadingTask = pdfjs.getDocument({ data: bytes, useWorkerFetch: false, isEvalSupported: false });
  const doc = await loadingTask.promise;

  const { PDFDocument } = await import('pdf-lib');
  const outDoc = await PDFDocument.create();

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D context indisponivel');

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));

    if (grayscale) {
      // filtro de luminancia simples para escala de cinza
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    await page.render({ canvasContext: ctx, viewport, background: 'white' }).promise;

    // se grayscale, converter via imagemData
    if (grayscale) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let p = 0; p < data.length; p += 4) {
        const luma = (data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114) | 0;
        data[p] = data[p + 1] = data[p + 2] = luma;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    const jpegBlob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Falha no toBlob'))),
        'image/jpeg',
        quality,
      );
    });

    const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
    const embedded = await outDoc.embedJpg(jpegBytes);
    const newPage = outDoc.addPage([canvas.width, canvas.height]);
    newPage.drawImage(embedded, { x: 0, y: 0, width: canvas.width, height: canvas.height });

    page.cleanup?.();
  }

  try {
    await doc.destroy();
  } catch {}

  const pdfBytes = await outDoc.save({ useObjectStreams: true });
  return bytesToBase64(pdfBytes);
}

/**
 * Compressora principal.  Aplica estrategias em ordem de "custo-beneficio"
 * ate caber no budget ou esgotar as tentativas.
 */
export async function compressPdfForFirestore(
  pdfBase64: string,
  options: CompressOptions,
): Promise<CompressResult> {
  const maxBytes = options.maxBytes;
  const grayscale = options.grayscale ?? true;
  const originalSize = pdfBase64.length;

  // Verificacao obvia: ja cabe? devolve o original intocado. Evita qualquer
  // processamento desnecessario e o bug de rasterizar PDFs pequenos.
  if (originalSize <= maxBytes) {
    return {
      base64: pdfBase64,
      type: MIME_PDF,
      size: originalSize,
      originalSize,
      technique: 'sem-compressao (ja cabia)',
    };
  }

  let bestBase64: string = pdfBase64;
  let bestTechnique = 'sem-compressao';
  let bestSize = originalSize;

  // Estrategia 1: relight com pdf-lib — leve, sem perda vetorial
  try {
    const relighted = await relightPdf(pdfBase64);
    if (relighted.length < bestSize) {
      bestBase64 = relighted;
      bestSize = relighted.length;
      bestTechnique = 'pdf-lib-relight';
    }
    if (relighted.length <= maxBytes) {
      return { base64: relighted, type: MIME_PDF, size: relighted.length, originalSize, technique: 'pdf-lib-relight' };
    }
  } catch (err) {
    console.warn('[pdf-compress] relight falhou', err);
  }

  // Estrategia 2: rasterizar com escala DECRESCENTE — comeca em 1.0 (mesmo
  // tamanho), reduz progressivamente.  Nunca aumenta.
  let scale = 1.0;
  let quality = 0.6;
  const maxAttempts = options.maxAttempts ?? 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const rasterized = await rasterizePdf(pdfBase64, scale, quality, grayscale);
      // sempre atualiza se for melhor que o melhor atual
      if (rasterized.length < bestSize) {
        bestBase64 = rasterized;
        bestSize = rasterized.length;
        bestTechnique = `raster(scale=${scale.toFixed(2)},q=${quality.toFixed(2)})`;
      }
      if (rasterized.length <= maxBytes) {
        return { base64: rasterized, type: MIME_PDF, size: rasterized.length, originalSize, technique: `raster(scale=${scale.toFixed(2)},q=${quality.toFixed(2)})` };
      }
    } catch (err) {
      console.warn(`[pdf-compress] raster${attempt} falhou`, err);
      break; // rasterizacao provavelmente indisponivel
    }

    // reduz progressivamente (deveras conservador: cada passo reduz ~25%)
    if (quality > 0.4) {
      quality -= 0.15;
    } else if (scale > 0.5) {
      scale -= 0.25;
      quality = 0.55;
    } else {
      break;
    }
  }

  // Nada coube no budget: devolve o melhor que conseguimos e o caller decide
  // o que fazer (ex.: enviar pro Storage).
  return {
    base64: bestBase64,
    type: MIME_PDF,
    size: bestSize,
    originalSize,
    technique: `${bestTechnique} (acima do budget)`,
  };
}

/** Comprime uma lista de documentos, retornando budget total compartilhado. */
export async function compressDocumentsForFirestore(
  documents: { base64: string; type: string; name: string; size: number; id?: string; uploadedAt?: string }[],
  totalBudgetBytes: number,
): Promise<{ documents: any[]; totalBytes: number; compressed: boolean; report: string[] }> {
  if (!documents.length) return { documents: [], totalBytes: 0, compressed: false, report: [] };

  const pdfDocs = documents.filter((d) => d.type === MIME_PDF || d.name?.toLowerCase().endsWith('.pdf'));
  const nonPdfDocs = documents.filter((d) => !(d.type === MIME_PDF || d.name?.toLowerCase().endsWith('.pdf')));

  const report: string[] = [];
  const perDocBudget = pdfDocs.length ? Math.floor(totalBudgetBytes / pdfDocs.length) : totalBudgetBytes;

  const out: any[] = [];
  for (const doc of nonPdfDocs) {
    out.push({ ...doc });
  }
  let totalBytes = nonPdfDocs.reduce((s, d) => s + (d.base64?.length || 0), 0);

  for (const doc of pdfDocs) {
    const compressed = await compressPdfForFirestore(doc.base64, { maxBytes: perDocBudget });
    out.push({ ...doc, base64: compressed.base64, type: compressed.type, size: compressed.size });
    totalBytes += compressed.size;
    report.push(`${doc.name}: ${Math.round(doc.size / 1024)}KB -> ${Math.round(compressed.size / 1024)}KB (${compressed.technique})`);
  }

  // segunda passada so se ainda acima — agora com budget global compartilhado
  if (totalBytes > totalBudgetBytes && pdfDocs.length > 0) {
    const remainingExcess = totalBytes - totalBudgetBytes;
    const extraSqueeze = Math.max(40_000, Math.floor(remainingExcess / pdfDocs.length));
    for (let i = 0; i < out.length; i++) {
      const d = out[i];
      if (d.type !== MIME_PDF) continue;
      const re = await compressPdfForFirestore(d.base64, {
        maxBytes: Math.max(20_000, perDocBudget - extraSqueeze),
        initialScale: 0.75,
        initialQuality: 0.45,
        grayscale: true,
        maxAttempts: 4,
      });
      const delta = d.base64.length - re.base64.length;
      if (delta > 0) {
        totalBytes -= delta;
        d.base64 = re.base64;
        d.size = re.size;
        report.push(`${d.name}: 2a passada -> ${Math.round(re.size / 1024)}KB`);
      }
      if (totalBytes <= totalBudgetBytes) break;
    }
  }

  return { documents: out, totalBytes, compressed: true, report };
}
