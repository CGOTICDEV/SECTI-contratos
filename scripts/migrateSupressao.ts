/*
Migration script: Fix legacy contracts where "supressao" termos aditivos were
incorrectly applied as acréscimo (added instead of subtracted).

PROBLEM:
  Before the fix in handleSaveTermoAditivo (App.tsx), the system always
  ADDED the `ajuste` value to `valorAtual` regardless of the `tipo` field.
  This meant that a "supressao" (suppression) termo aditivo — which should
  SUBTRACT from the contract value — was incorrectly added, inflating
  `valorAtual` and `saldoDisponivel`.

  Additionally, the `ajuste` field was stored as a POSITIVE number even for
  supressao entries. The UI display pattern `a.ajuste >= 0 ? '+' : ''`
  therefore showed "+R$ X,XX" for supressao instead of "-R$ X,XX".

WHAT THIS SCRIPT DOES:
  1. Fetches every contract from Firestore.
  2. For each contract that has a `termosAditivos` array:
     a. Negates the `ajuste` field of any supressao termo that has a
        positive ajuste (so the UI shows the correct "-" sign).
     b. Recalculates `valorAtual` starting from `valorInicial`.
     c. For each termo aditivo, applies the `ajuste` based on `tipo`:
        - "supressao"  → SUBTRACT abs(ajuste)
        - "acrescimo"  → ADD ajuste
        - "reajuste"   → ADD ajuste (reajuste is typically an increase)
        - other types  → ADD ajuste (default behavior, backward compatible)
     d. Recalculates `saldoDisponivel` = valorAtual - valorPagoAcumulado.
     e. If the recalculated values differ from what's stored OR any ajuste
        was negated, updates the contract document in Firestore.
  3. Prints a before/after report for each corrected contract.

SAFETY:
  - The script only updates contracts where the recalculated `valorAtual`
    differs from the stored value OR an ajuste sign was corrected.
  - `valorPagoAcumulado` is NOT recalculated — it is preserved as-is.
  - A dry-run mode is available: set DRY_RUN = true below to preview changes
    without writing to Firestore.

USAGE:
  node -r ts-node/register scripts/migrateSupressao.ts

  (or compile first, then run with `node scripts/migrateSupressao.js`)
*/

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// ─── CONFIG ────────────────────────────────────────────────────────────────
// Set to true to preview changes WITHOUT writing to Firestore.
const DRY_RUN = true;

// Firebase Auth credentials (email must be verified in Firestore rules).
// Set via environment variables or hardcode here for the migration run.
const AUTH_EMAIL = process.env.MIGRATE_EMAIL || '';
const AUTH_PASSWORD = process.env.MIGRATE_PASSWORD || '';
// ────────────────────────────────────────────────────────────────────────────

// copy your firebaseConfig from src/firebase.ts
const firebaseConfig = {
  apiKey: 'AIzaSyCWZadCCM_6iYv9u3bvSyKY9ACDMnsC1OI',
  authDomain: 'contratossecti.firebaseapp.com',
  projectId: 'contratossecti',
  storageBucket: 'contratossecti.firebasestorage.app',
  messagingSenderId: '297313871015',
  appId: '1:297313871015:web:fd9f749ad34bf266d4a782',
  measurementId: 'G-5XZD1HZEC2',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Round a number to 2 decimal places to avoid floating-point precision errors.
 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Recalculate valorAtual from valorInicial + termosAditivos.
 *
 * - supressao  → subtract abs(ajuste)
 * - acrescimo  → add ajuste
 * - reajuste   → add ajuste
 * - other      → add ajuste (backward compatible)
 */
function recalcValorAtual(
  valorInicial: number,
  termosAditivos: any[]
): number {
  let valor = valorInicial || 0;
  for (const t of termosAditivos) {
    const ajuste = Number(t.ajuste) || 0;
    if (ajuste === 0) continue;
    if (t.tipo === 'supressao') {
      valor -= Math.abs(ajuste);
    } else {
      // acrescimo, reajuste, prorrogacao, outros → add
      valor += ajuste;
    }
  }
  return round2(valor);
}

async function run() {
  console.log(`[migrateSupressao] DRY_RUN = ${DRY_RUN}`);

  // Authenticate before accessing Firestore (rules require verified email)
  if (!AUTH_EMAIL || !AUTH_PASSWORD) {
    console.error('[migrateSupressao] Missing credentials!');
    console.error('Set MIGRATE_EMAIL and MIGRATE_PASSWORD env vars:');
    console.error('  $env:MIGRATE_EMAIL="user@example.com"; $env:MIGRATE_PASSWORD="secret"');
    process.exit(1);
  }
  console.log(`[migrateSupressao] Signing in as ${AUTH_EMAIL}...`);
  await signInWithEmailAndPassword(auth, AUTH_EMAIL, AUTH_PASSWORD);
  console.log('[migrateSupressao] Authenticated. Fetching contracts...');

  const contractsCol = collection(db, 'contracts');
  const snap = await getDocs(contractsCol);
  console.log(`[migrateSupressao] Found ${snap.size} contracts`);

  let corrected = 0;
  let skipped = 0;
  let noTermos = 0;

  for (const c of snap.docs) {
    const data: any = c.data();
    const termosAditivos: any[] = Array.isArray(data.termosAditivos) ? data.termosAditivos : [];

    if (termosAditivos.length === 0) {
      noTermos++;
      continue;
    }

    // Check if any termo is a supressao (the ones that were likely miscalculated)
    const hasSupressao = termosAditivos.some((t) => t.tipo === 'supressao');
    if (!hasSupressao) {
      skipped++;
      continue;
    }

    const valorInicial = Number(data.valorInicial) || 0;
    const valorAtualStored = Number(data.valorAtual) || 0;
    const valorPagoAcumulado = Number(data.valorPagoAcumulado) || 0;
    const saldoStored = Number(data.saldoDisponivel) || 0;

    // ── Step 1: Fix ajuste sign for supressao entries ──────────────
    // Legacy supressao entries stored ajuste as positive. Negate them so
    // the UI display pattern `a.ajuste >= 0 ? '+' : ''` shows "-R$ X,XX".
    let ajusteFixed = false;
    const termosFixed = termosAditivos.map((t) => {
      if (t.tipo === 'supressao') {
        const aj = Number(t.ajuste) || 0;
        if (aj > 0) {
          ajusteFixed = true;
          return { ...t, ajuste: -Math.abs(aj) };
        }
      }
      return t;
    });

    const valorAtualCorrect = recalcValorAtual(valorInicial, termosFixed);
    const saldoCorrect = round2(valorAtualCorrect - valorPagoAcumulado);

    // Compare with a small tolerance for floating-point
    const valorDiff = Math.abs(valorAtualCorrect - valorAtualStored) > 0.01;
    const saldoDiff = Math.abs(saldoCorrect - saldoStored) > 0.01;

    if (!valorDiff && !saldoDiff && !ajusteFixed) {
      skipped++;
      continue;
    }

    console.log(`\n[CONTRACT] ${c.id} — ${data.numeroContrato || '(sem número)'}`);
    console.log(`  valorInicial:       R$ ${valorInicial.toFixed(2)}`);
    console.log(`  termosAditivos:    ${termosAditivos.length} (contém supressão)`);
    for (const t of termosAditivos) {
      const aj = Number(t.ajuste) || 0;
      const arrow = t.tipo === 'supressao' ? '−' : '+';
      console.log(`    • ${t.tipo || '?'}: R$ ${aj.toFixed(2)}  →  ${arrow} ${Math.abs(aj).toFixed(2)}`);
    }
    if (ajusteFixed) {
      console.log(`  ⚠ Ajuste sign corrected for ${termosFixed.filter((t, i) => Number(termosAditivos[i].ajuste) > 0 && t.tipo === 'supressao').length} supressao entry(ies)`);
    }
    console.log(`  valorAtual ANTES:  R$ ${valorAtualStored.toFixed(2)}`);
    console.log(`  valorAtual DEPOIS: R$ ${valorAtualCorrect.toFixed(2)}`);
    console.log(`  saldo ANTES:       R$ ${saldoStored.toFixed(2)}`);
    console.log(`  saldo DEPOIS:      R$ ${saldoCorrect.toFixed(2)}`);

    if (DRY_RUN) {
      console.log('  [DRY RUN] Skipping write.');
      corrected++;
      continue;
    }

    const updates: Record<string, any> = {};
    if (valorDiff) updates.valorAtual = valorAtualCorrect;
    if (saldoDiff) updates.saldoDisponivel = saldoCorrect;
    if (ajusteFixed) updates.termosAditivos = termosFixed;

    try {
      await updateDoc(doc(db, 'contracts', c.id), updates);
      console.log('  ✅ Updated in Firestore.');
      corrected++;
    } catch (err) {
      console.error(`  ❌ Failed to update ${c.id}:`, err);
    }
  }

  console.log('\n[migrateSupressao] Summary:');
  console.log(`  Total contracts:     ${snap.size}`);
  console.log(`  No termosAditivos:   ${noTermos}`);
  console.log(`  No supressao / OK:   ${skipped}`);
  console.log(`  Corrected:           ${corrected}`);
  console.log('[migrateSupressao] Done.');
}

run().catch((e) => {
  console.error('[migrateSupressao] Fatal error:', e);
  process.exit(1);
});
