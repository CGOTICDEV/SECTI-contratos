export interface HistoryChange {
  field: keyof Contract;
  before: any;
  after: any;
}

export interface HistoryEntry {
  timestamp: string;
  user?: string; // email (preferred) or uid of the user who made the change
  // `userPhoto` used to be stored here, but we no longer save a copy of the
  // avatar with every history entry.  When the UI needs an image it will
  // look up the user by email and read `photoBase64` from the users
  // collection.  The field is kept for backwards compatibility but should
  // never be written going forward.
  userPhoto?: string;
  changes: HistoryChange[];
}

export interface Apostila {
  timestamp: string;
  user?: string;
  note: string;
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
  // campo legado mantido por compatibilidade, mas a nova estrutura é um array
  apostila?: string;
  apostilas?: Apostila[];
  garantia?: string;

  /** lista de e-mails de quem alterou o contrato em algum momento */
  emailEditor?: string[];

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
