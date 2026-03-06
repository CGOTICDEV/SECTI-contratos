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
  /** Valor financeiro agregado pela apostila. Pode ser positivo (incremento) ou negativo (dedução). */
  ajuste?: number;
}

export interface TermoAditivoDocument {
  id: string;
  name: string;
  type: string; // MIME type (application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document)
  base64: string; // conteúdo do arquivo em base64
  uploadedBy?: string;
  uploadedAt: string;
  size: number; // tamanho em bytes
}

export interface TermoAditivo {
  timestamp: string;
  user?: string;
  note: string;
  /** tipo do termo aditivo */
  tipo?: string;
  /** acréscimo de valor; sempre positivo nos termos aditivos */
  ajuste?: number;
  /** vigência inicial do contrato no momento do termo */
  vigenciaInicial?: string;
  /** data da prorrogação (novo término registrado) */
  prorrogacao?: string;
  /** data de término que estava vigente antes da prorrogação */
  originalVigencia?: string;
  /** documentos anexados ao termo aditivo (PDF, DOC, DOCX) */
  documents?: TermoAditivoDocument[];
}

export interface Comment {
  id: string;
  timestamp: string;
  user: string;
  userEmail: string;
  content: string;
  type?: 'comment' | 'approval' | 'rejection';
}

export interface Document {
  id: string;
  name: string;
  type: string; // MIME type
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  size: number;
}

export interface Contract {
  id: string;
  /** diferenciar um contrato comum de um registro de convênio */
  tipoRegistro: 'contrato' | 'convenio' | 'termoAdesao' | 'acordoCooperacaoTecnica' | 
    'acordoConsorcial' | 'acordoCooperacaoInternacional' | 'convenioCooperacaoTecnica' | 
    'termoCooperacaoTecnica' | 'termoCessaoUsoMovel' | 'termoRecisaoUnilateral' | 
    'termoRecisaoAmigavel' | 'termoDoacaoMoveis' | 'convenioEspacoColaborar' | 
    'convenioEspacoFazer' | 'convenioEspacoPensar' | 'conveniosFederais' | 
    'termoCessaoVeiculos' | 'contratoGestao' | 'portaria' | 'outro';

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
  /** cached number of apostilas, kept in the root document to avoid querying a subcollection */
  apostilasCount?: number;
  /** lista de termos aditivos associados ao contrato */
  termosAditivos?: TermoAditivo[];
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
  
  // novos campos
  comments?: Comment[];
  documents?: Document[];
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  verifiedAt?: string;
  verifiedBy?: string;

  /** lista de uids que dispensaram ou leram notificações sobre este contrato */
  readBy?: string[];
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
