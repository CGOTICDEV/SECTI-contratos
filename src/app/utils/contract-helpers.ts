import { Contract, StatusInfo, HistoryChange } from '../types/contract';
import { format } from 'date-fns';

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

  if (daysRemaining <= 30) {
    return {
      type: 'critical',
      daysRemaining,
      label: `Faltam ${daysRemaining} dias`,
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
    };
  }

  if (daysRemaining <= 90) {
    return {
      type: 'warning',
      daysRemaining,
      label: `Faltam ${daysRemaining} dias`,
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-200',
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
    const oldVal = (base as any)[key];
    const newVal = (after as any)[key];
    if (newVal === undefined) continue;
    if (oldVal !== newVal) {
      changes.push({ field: key, before: oldVal ?? null, after: newVal });
    }
  }

  return changes;
}
