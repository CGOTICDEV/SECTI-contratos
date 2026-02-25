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
  /** diferenciar um contrato comum de um registro de convênio */
  tipoRegistro: 'contrato' | 'convenio';

  // campos clássicos de contrato
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

  // campos exclusivos para convênios
  numeroAcordoCooperacaoTecnica?: string;
  numeroTermoCooperacaoTecnica?: string;
  numeroConvenio?: string;
  convenente?: string;
  termoAdesao?: string;

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
