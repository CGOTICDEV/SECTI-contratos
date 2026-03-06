// List of document/instrument types supported by the application.
// Shared across form selection, filters, and data model typing.

export const INSTRUMENT_TYPES = [
  'Contrato',
  'Convênio',
  'Termo de Adesão',
  'Acordo de Cooperação Técnica',
  'Acordo Consorcial',
  'Acordo de Cooperação Internacional',
  'Convênio de Cooperação Técnica',
  'Termo de Cooperação Técnica',
  'Termo de Cessão de Uso Bem Móvel',
  'Termo de Recisão Unilateral',
  'Termo de Recisão Amigável',
  'Termo de Doação de Bens Móveis',
  'Convênio de Cooperação Espaço Colaborar',
  'Convênio de Cooperação Espaço Fazer',
  'Convênio de Cooperação Espaço Pensar',
  'Convênios Federais',
  'Termo de Cessão de Veículos',
  'Contrato de Gestão',
  'Portaria',
] as const;

export type InstrumentType = (typeof INSTRUMENT_TYPES)[number];
