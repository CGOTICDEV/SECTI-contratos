import { Contract, StatusInfo, HistoryChange } from '../types/contract';
import { format } from 'date-fns';

// helper to determine if a given instrumento type should be treated as a convênio.
export function isConvenioType(tipo?: string): boolean {
  if (!tipo) return false;
  const lower = tipo.toLowerCase();
  return lower.includes('convênio') || lower.includes('convenio');
}

export function calculateDaysRemaining(vigenciaAtual: string): number {
  const today = new Date();
  if (!vigenciaAtual) return Infinity;
  const endDate = new Date(vigenciaAtual);
  if (isNaN(endDate.getTime())) return Infinity;
  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function getContractStatus(contract: Contract): StatusInfo {
  // Status "Encerrado" encerra o contrato: nenhum email de vencimento e emitido
  // e o contrato nao aparece nas faixas <15/<30/<60/<90 dias.
  if (contract.situacao === 'Encerrado') {
    return {
      type: 'expired',
      daysRemaining: -1,
      label: 'Encerrado',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-300',
    };
  }

  const daysRemaining = calculateDaysRemaining(contract.vigenciaAtual);

  if (daysRemaining < 0 || contract.situacao === 'Vencido') {
    return {
      type: 'expired',
      daysRemaining,
      label: 'Vencido',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
    };
  }

  // thresholds have been updated to reflect the new requirements: critical < 15 days, warning < 30 days
  // safe threshold is considered < 60 days, although anything above 60 is still treated as safe.
  if (daysRemaining <= 15) {
    return {
      type: 'critical',
      daysRemaining,
      label: `Faltam ${daysRemaining} dias`,
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
    };
  }

  if (daysRemaining <= 30) {
    return {
      type: 'warning',
      daysRemaining,
      label: `Faltam ${daysRemaining} dias`,
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-200',
    };
  }

  if (daysRemaining <= 60) {
    return {
      type: 'safe',
      daysRemaining,
      label: `Faltam ${daysRemaining} dias`,
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-green-200',
    };
  }

  return {
    type: 'safe',
    daysRemaining,
    label: `Faltam ${daysRemaining} dias`,
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  };
}

export function formatCurrency(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  // Strings no formato YYYY-MM-DD (ou YYYY-MM-DDTHH:MM:SS...) sao interpretadas
  // como meia-noite em UTC pelo construtor Date. Ao converter para o timezone
  // local do usuario (potencialmente UTC-3), o calendario retrocede um dia.
  // Para datas puras (sem hora) tratamos como data local no mesmo dia.
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(dateString);
  if (dateOnlyMatch) {
    const [, y, m, d] = dateOnlyMatch;
    const day = parseInt(d, 10);
    const month = parseInt(m, 10);
    const year = parseInt(y, 10);
    if (day > 0 && day <= 31 && month > 0 && month <= 12 && year > 0) {
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    }
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  try {
    return format(date, 'dd/MM/yyyy');
  } catch {
    return '-';
  }
}


export function formatPhoneNumber(value?: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function computeChanges(
  before: Partial<Contract> | null,
  after: Partial<Contract>
): HistoryChange[] {
  const changes: HistoryChange[] = [];
  const base = before || ({} as Contract);

  for (const key of Object.keys(after) as (keyof Contract)[]) {
    // avoid dumping large or self‑referential arrays into history; they
    // are stored elsewhere and/or trimmed by other logic.  If we record
    // every apostila or the whole history we blow past Firestore's 1 MB
    // document limit very quickly.
    if (key === 'apostilas' || key === 'history') continue;

    const oldVal = (base as any)[key];
    const newVal = (after as any)[key];
    if (newVal === undefined) continue;
    if (oldVal !== newVal) {
      changes.push({
        field: key,
        before: oldVal ?? null,
        after: newVal,
        // alterações no valor inicial são consideradas sensíveis e ganham
        // destaque especial no histórico do contrato
        ...(key === 'valorInicial' ? { special: true } : {}),
      });
    }
  }

  return changes;
}
