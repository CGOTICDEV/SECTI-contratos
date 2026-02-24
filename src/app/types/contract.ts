export interface HistoryChange {
  field: keyof Contract;
  before: any;
  after: any;
}

export interface HistoryEntry {
  timestamp: string;
  user?: string;
  changes: HistoryChange[];
}

export interface Contract {
  id: string;
  numeroContrato: string;
  empresa: string;
  objeto: string;
  gestor: string;
  fiscal: string;
  situacao: 'Vigente' | 'Vencido' | 'Suspenso';
  vigenciaInicial: string;
  vigenciaAtual: string;
  ultimoTermoAditivo?: string;
  valorInicial: number;
  valorAtual: number;
  saldoDisponivel: number;
  valorPagoAno: number;
  valorPagoAcumulado: number;
  apostila?: string;
  garantia?: string;
  history?: HistoryEntry[];
}

export type StatusType = 'critical' | 'warning' | 'safe' | 'expired';

export interface StatusInfo {
  type: StatusType;
  daysRemaining: number;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}
