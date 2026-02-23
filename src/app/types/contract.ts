export interface HistoryChange {
  field: keyof Contract;      // the name of the property that was modified
  before: any;                // value prior to change (null when creating)
  after: any;                 // value after change
}

export interface HistoryEntry {
  timestamp: string;          // ISO string with the moment the change occurred
  user?: string;              // optional user/email responsible for the change
  changes: HistoryChange[];   // list of fields that were modified
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
  history?: HistoryEntry[];   // optional history array of modifications
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
