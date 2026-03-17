import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CurrencyInput } from './ui/currency-input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Contract } from '../types/contract';
import { Calendar, DollarSign, Info, FileText, CheckCircle2, Handshake } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { formatCurrency, formatDate } from '../utils/contract-helpers';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contract: Partial<Contract>) => void;
  contract?: Contract;
  currentUser?: {
    email?: string;
    role?: string;
    displayName?: string;
  };
  onAddTermoAditivo?: (contract: Contract) => void;
}

export function ContractModal({ isOpen, onClose, onSave, contract, currentUser, onAddTermoAditivo }: ContractModalProps) {
  const defaultData: Partial<Contract> = {
    tipoRegistro: 'contrato',
    numeroContrato: '',
    empresa: '',
    objeto: '',
    situacao: 'Vigente',
    vigenciaInicial: '',
    vigenciaAtual: '',
    ultimoTermoAditivo: '',
    valorInicial: 0,
    valorAtual: 0,
    saldoDisponivel: 0,
    valorPagoAno: 0,
    valorPagoAcumulado: 0,

    // convênio fields
    numeroAcordoCooperacaoTecnica: '',
    numeroTermoCooperacaoTecnica: '',
    numeroConvenio: '',
    convenente: '',
    interveniente: '',
    repasse: false,
    descentralizacaoCredito: false,
    valorConcedente: 0,
    valorConvenente: 0,
    termoAdesao: '',
    // liberação de recursos (convênios)
    liberacaoRecurso: undefined,
    liberacaoRecursoObservacao: '',
  };

  const computeInitial = () => {
    if (contract) return contract;
    const base = { ...defaultData };
    if (currentUser) {
      const nameOrEmail = currentUser.displayName || currentUser.email || '';
      // Como apenas CCC criará registros, atribuímos CCC quando apropriado
      if (currentUser.role !== 'gestor' && currentUser.role !== 'fiscal') {
        base.ccc = nameOrEmail;
      }
    }
    return base;
  };

  const isCCC = !!currentUser && currentUser.role !== 'gestor' && currentUser.role !== 'fiscal';

  // Helper function to determine if a type should show convenio-specific fields
  const isConvenioLike = (tipo?: string) => {
    const convenioTypes = [
      'convenio',
      'convenioRepasse',  
      'termoAdesao',
      'acordoCooperacaoTecnica',
      'acordoConsorcial',
      'acordoCooperacaoInternacional',
      'convenioCooperacaoTecnica',
      'termoCooperacaoTecnica',
      'convenioEspacoColaborar',
      'convenioEspacoFazer',
      'convenioEspacoPensar',
      'conveniosFederais'
    ];
    return convenioTypes.includes(tipo || '');
  };

  // Helper function to get friendly name for tipo
  const getTipoFriendlyName = (tipo?: string) => {
    const names: Record<string, string> = {
      'contrato': 'Contrato',
      'convenio': 'Convênio',
      'convenioRepasse': 'Convênio de Repasse',
      'termoAdesao': 'Termo de Adesão',
      'acordoCooperacaoTecnica': 'Acordo de Cooperação Técnica',
      'acordoConsorcial': 'Acordo Consorcial',
      'acordoCooperacaoInternacional': 'Acordo de Cooperação Internacional',
      'convenioCooperacaoTecnica': 'Convênio de Cooperação Técnica',
      'termoCooperacaoTecnica': 'Termo de Cooperação Técnica',
      'termoCessaoUsoMovel': 'Termo de Cessão de Uso Bem Móvel',
      'termoRecisaoUnilateral': 'Termo de Recisão Unilateral',
      'termoRecisaoAmigavel': 'Termo de Recisão Amigável',
      'termoDoacaoMoveis': 'Termo de Doação de Bens Móveis',
      'convenioEspacoColaborar': 'Convênio de Cooperação Espaço Colaborar',
      'convenioEspacoFazer': 'Convênio de Cooperação Espaço Fazer',
      'convenioEspacoPensar': 'Convênio de Cooperação Espaço Pensar',
      'conveniosFederais': 'Convênios Federais',
      'termoCessaoVeiculos': 'Termo de Cessão de Veículos',
      'contratoGestao': 'Contrato de Gestão',
      'portaria': 'Portaria'
    };
    return names[tipo || ''] || 'Registro';
  };

  const [formData, setFormData] = useState<Partial<Contract>>(computeInitial());
  const [ajuste, setAjuste] = useState<number>(0);

  const numericFields: Array<keyof Contract> = [
    'valorInicial',
    'valorAtual',
    'saldoDisponivel',
    'valorPagoAno',
    'valorPagoAcumulado',
    'valorConcedente',
    'valorConvenente',
  ];

  React.useEffect(() => {
    if (contract) {
      setFormData(contract);
    } else {
      setFormData(computeInitial());
    }
    setAjuste(0);
  }, [contract, currentUser]);

  React.useEffect(() => {
    const valorAtual = formData.valorAtual ?? 0;
    const pagoAcumulado = formData.valorPagoAcumulado ?? 0;

    // round to 2 decimal places to avoid floating-point precision errors
    const saldo = Math.round((valorAtual - pagoAcumulado) * 100) / 100;

    setFormData((prev) => ({
      ...prev,
      saldoDisponivel: saldo,
    }));
  }, [formData.valorAtual, formData.valorPagoAcumulado]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isConvenioLike(formData.tipoRegistro)) {
      const conv = formData.convenente?.toString().trim();
      const inter = (formData as any).interveniente?.toString().trim();
      if (!conv && !inter) {
        window.alert('Em convênio é preciso informar o convenente, o interveniente, ou ambos.');
        return;
      }
    }

    let payload: Partial<Contract> = { ...formData };

    const baseValorAtual = payload.valorAtual ?? 0;
    let vpa = payload.valorPagoAcumulado ?? 0;

    let novoValorAtual = baseValorAtual;

    // POSITIVE adjustment: increases VALOR ATUAL (term addendum)
    // NEGATIVE adjustment: increases VALOR PAGO ACUMULADO (payment/deduction)
    if (ajuste > 0) {
      novoValorAtual += ajuste;
    } else if (ajuste < 0) {
      vpa += -ajuste;
    }

    payload.valorAtual = novoValorAtual;
    payload.valorPagoAcumulado = vpa;
    // round to 2 decimal places to avoid floating-point precision errors
    payload.saldoDisponivel = Math.round((novoValorAtual - vpa) * 100) / 100;

    onSave(payload);
    onClose();
  };

  const handleChange = (field: keyof Contract, value: string | number) => {
    let parsed: string | number = value;
    if (typeof value === 'string' && numericFields.includes(field)) {
      parsed = parseFloat(value) || 0;
    }
    setFormData((prev) => ({ ...prev, [field]: parsed }));
  };

  const getGarantiaStates = () => {
    const tipo = formData.garantiaTipo;
    return {
      tecnica: tipo === 'tecnica' || tipo === 'tecnicaEValor',
      valor: tipo === 'valor' || tipo === 'tecnicaEValor',
      tecnicaEValor: tipo === 'tecnicaEValor',
    };
  };

  const updateGarantiaFromCheckbox = (changes: { tecnica?: boolean; valor?: boolean; tecnicaEValor?: boolean }) => {
    const current = getGarantiaStates();
    const tecnica = changes.tecnica ?? current.tecnica;
    const valor = changes.valor ?? current.valor;
    const tecnicaEValor = changes.tecnicaEValor ?? current.tecnicaEValor;

    let nextTipo: Contract['garantiaTipo'] | undefined;
    if (tecnicaEValor || (tecnica && valor)) {
      nextTipo = 'tecnicaEValor';
    } else if (tecnica) {
      nextTipo = 'tecnica';
    } else if (valor) {
      nextTipo = 'valor';
    } else {
      nextTipo = undefined;
    }

    setFormData((prev) => ({ ...prev, garantiaTipo: nextTipo }));
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl w-full border-l border-secti-border bg-[#F8FAFC] p-0 flex flex-col shadow-2xl">

        {/* HEADER */}
        <SheetHeader className="p-6 bg-[#0B2046] text-white shadow-md z-10">
          <SheetTitle className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <FileText className="w-6 h-6 text-[#00D1FF]" />
            {contract
              ? `Ajustar ${getTipoFriendlyName(contract.tipoRegistro)}`
              : 'Novo Registro'}
          </SheetTitle>
          <SheetDescription className="text-[#00D1FF]/80 font-mono text-xs uppercase tracking-widest mt-1">
            ID: {contract?.id || 'NOVO REGISTRO'}
          </SheetDescription>
        </SheetHeader>

        {/* BODY */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
          <Tabs defaultValue="info" className="w-full flex flex-col min-h-full">
            <TabsList className="w-full justify-start rounded-none border-b border-secti-border bg-white h-14 px-6 sticky top-0 z-10 shadow-sm">
              <TabsTrigger value="info" className="gap-2 text-sm data-[state=active]:text-secti-primary data-[state=active]:border-b-2 data-[state=active]:border-secti-primary pb-3 pt-4">
                <Info className="w-4 h-4" /> Geral
              </TabsTrigger>
              <TabsTrigger value="dates" className="gap-2 text-sm data-[state=active]:text-secti-primary data-[state=active]:border-b-2 data-[state=active]:border-secti-primary pb-3 pt-4">
                <Calendar className="w-4 h-4" /> Prazo
              </TabsTrigger>
              <TabsTrigger value="finance" className="gap-2 text-sm data-[state=active]:text-secti-primary data-[state=active]:border-b-2 data-[state=active]:border-secti-primary pb-3 pt-4">
                <DollarSign className="w-4 h-4" /> Financeiro
              </TabsTrigger>
            </TabsList>

            <div className="p-6 flex-1">

              {/* ABA GERAL */}
              <TabsContent value="info" className="space-y-6 m-0 animate-in fade-in duration-300">

                {/* Bloco de Classificação */}
                <div className="bg-white p-5 rounded-lg border border-secti-border shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-secti-muted" />
                    <h3 className="text-sm font-semibold text-gray-700">Classificação e Status</h3>
                  </div>
                  <div className="grid">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-secti-muted">Modalidade da Licitação</Label>
                      <Select value={formData.tipoRegistro} onValueChange={(v) => handleChange('tipoRegistro', v)}>
                        <SelectTrigger className="bg-gray-50 border-secti-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value="contrato">Contrato</SelectItem>
                          <SelectItem value="convenio">Convênio</SelectItem>
                          <SelectItem value="termoAdesao">Termo de Adesão</SelectItem>
                          <SelectItem value="acordoCooperacaoTecnica">Acordo de Cooperação Técnica</SelectItem>
                          <SelectItem value="acordoConsorcial">Acordo Consorcial</SelectItem>
                          <SelectItem value="acordoCooperacaoInternacional">Acordo de Cooperação Internacional</SelectItem>
                          <SelectItem value="convenioCooperacaoTecnica">Convênio de Cooperação Técnica</SelectItem>
                          <SelectItem value="termoCooperacaoTecnica">Termo de Cooperação Técnica</SelectItem>
                          <SelectItem value="termoCessaoUsoMovel">Termo de Cessão de Uso Bem Móvel</SelectItem>
                          <SelectItem value="termoRecisaoUnilateral">Termo de Recisão Unilateral</SelectItem>
                          <SelectItem value="termoRecisaoAmigavel">Termo de Recisão Amigável</SelectItem>
                          <SelectItem value="termoDoacaoMoveis">Termo de Doação de Bens Móveis</SelectItem>
                          <SelectItem value="convenioEspacoColaborar">Convênio de Cooperação Espaço Colaborar</SelectItem>
                          <SelectItem value="convenioEspacoFazer">Convênio de Cooperação Espaço Fazer</SelectItem>
                          <SelectItem value="convenioEspacoPensar">Convênio de Cooperação Espaço Pensar</SelectItem>
                          <SelectItem value="conveniosFederais">Convênios Federais</SelectItem>
                          <SelectItem value="termoCessaoVeiculos">Termo de Cessão de Veículos</SelectItem>
                          <SelectItem value="contratoGestao">Contrato de Gestão</SelectItem>
                          <SelectItem value="portaria">Portaria</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-secti-muted">Status Atual</Label>
                      <Select value={formData.situacao} onValueChange={(v) => handleChange('situacao', v)}>
                        <SelectTrigger className="bg-gray-50 border-secti-border font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Vigente">Vigente</SelectItem>
                          <SelectItem value="Suspenso">Suspenso</SelectItem>
                          <SelectItem value="Vencido">Vencido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Bloco de Identificação */}
                <div className="bg-white p-5 rounded-lg border border-secti-border shadow-sm space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-2">Dados do {getTipoFriendlyName(formData.tipoRegistro)}</h3>

<div className={`grid grid-cols-1 ${isConvenioLike(formData.tipoRegistro) ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                    <div className="space-y-2">
                      <Label htmlFor="numeroContrato" className="text-xs font-bold uppercase text-secti-muted">
                        {isConvenioLike(formData.tipoRegistro) ? 'Nº do convênio' : 'Nº do contrato'}
                      </Label>
                      <Input
                        id="numeroContrato"
                        className="font-mono bg-gray-50 border-secti-border focus:ring-secti-accent"
                        value={formData.numeroContrato}
                        onChange={(e) => handleChange('numeroContrato', e.target.value)}
                        placeholder="Ex: 001/2024-SECTI"
                      />
                    </div>

                    {isConvenioLike(formData.tipoRegistro) ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="convenente" className="text-xs font-bold uppercase text-secti-muted">
                            Convenente
                          </Label>
                          <Input
                            id="convenente"
                            className="bg-gray-50 border-secti-border"
                            value={formData.convenente ?? ''}
                            onChange={(e) => handleChange('convenente', e.target.value)}
                            placeholder="Nome do convenente"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="interveniente" className="text-xs font-bold uppercase text-secti-muted">
                            Interveniente
                          </Label>
                          <Input
                            id="interveniente"
                            className="bg-gray-50 border-secti-border"
                            value={formData.interveniente ?? ''}
                            onChange={(e) => handleChange('interveniente', e.target.value)}
                            placeholder="Nome do interveniente"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="empresa" className="text-xs font-bold uppercase text-secti-muted">
                          Unidade Contratada
                        </Label>
                        <Input
                          id="empresa"
                          className="bg-gray-50 border-secti-border"
                          value={formData.empresa ?? ''}
                          onChange={(e) => handleChange('empresa', e.target.value)}
                          placeholder="Nome da instituição"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label htmlFor="objeto" className="text-xs font-bold uppercase text-secti-muted">
                      {isConvenioLike(formData.tipoRegistro) ? 'Objeto do convênio' : 'Objeto do contrato'}
                    </Label>
                    <Textarea
                      id="objeto"
                      className="bg-gray-50 border-secti-border min-h-[100px] resize-none"
                      value={formData.objeto}
                      onChange={(e) => handleChange('objeto', e.target.value)}
                      placeholder="Descreva o objeto principal..."
                    />
                  </div>

                </div>

                {/* Seção: Fiscalização do contrato */}
                <div className="bg-white p-5 rounded-lg border border-secti-border shadow-sm space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-2">Fiscalização do contrato</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-secti-muted">Gestor</Label>
                      <Input className="bg-gray-50 border-secti-border" value={formData.gestor ?? ''} onChange={(e) => handleChange('gestor', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-secti-muted">Fiscal</Label>
                      <Input className="bg-gray-50 border-secti-border" value={formData.fiscal ?? ''} onChange={(e) => handleChange('fiscal', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Seção: Garantia contratual */}
                <div className="bg-white p-5 rounded-lg border border-secti-border shadow-sm space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-2">Garantia contratual</h3>
                  <p className="text-xs text-secti-muted">Selecione o tipo de garantia aplicável</p>
                  <div className="flex flex-wrap gap-4">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-secti-primary border-secti-border rounded"
                        checked={getGarantiaStates().tecnica}
                        onChange={(e) => updateGarantiaFromCheckbox({ tecnica: e.target.checked })}
                      />
                      <span className="text-sm">Técnica</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-secti-primary border-secti-border rounded"
                        checked={getGarantiaStates().valor}
                        onChange={(e) => updateGarantiaFromCheckbox({ valor: e.target.checked })}
                      />
                      <span className="text-sm">Valor</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-secti-primary border-secti-border rounded"
                        checked={getGarantiaStates().tecnicaEValor}
                        onChange={(e) => updateGarantiaFromCheckbox({ tecnicaEValor: e.target.checked })}
                      />
                      <span className="text-sm">Técnica e Valor</span>
                    </label>
                  </div>
                </div>

              </TabsContent>

              {/* ABA PRAZO */}
              <TabsContent value="dates" className="space-y-6 m-0 animate-in fade-in duration-300">
                <div className="bg-white p-5 rounded-lg border border-secti-border shadow-sm space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-secti-muted">Início da Vigência</Label>
                      <Input type="date" className="bg-gray-50 font-mono" value={formData.vigenciaInicial} onChange={(e) => handleChange('vigenciaInicial', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-secti-muted">Término da Vigência</Label>
                      {/* O border-orange-200 original foi mantido e reforçado para dar destaque de prazo */}
                      <Input type="date" className="bg-orange-50 font-mono border-orange-300 focus:ring-orange-400" value={formData.vigenciaAtual} onChange={(e) => handleChange('vigenciaAtual', e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-gray-100 pt-4">
                    <Label className="text-xs font-bold uppercase text-secti-muted">Histórico/Alterações do {isConvenioLike(formData.tipoRegistro) ? 'convênio' : 'contrato'}</Label>
                    <Textarea
                      className="bg-gray-50 border-secti-border min-h-[100px] resize-none"
                      value={formData.ultimoTermoAditivo}
                      onChange={(e) => handleChange('ultimoTermoAditivo', e.target.value)}
                      placeholder="Descreva aqui as principais alterações, prorrogações ou aditivos relacionados a prazos..."
                    />
                  </div>
                  {formData.apostilas && formData.apostilas.length > 0 && (
                    <div className="space-y-1 pt-4 border-t border-gray-100">
                      <span className="text-[11px] font-bold uppercase text-secti-muted tracking-wider">Apostilas existentes</span>
                      <ul className="text-sm space-y-1">
                        {formData.apostilas.map((a, idx) => (
                          <li key={idx}>
                            <span className="font-mono text-xs">{formatDate(a.timestamp)}</span> – {a.note}
                            {typeof a.ajuste === 'number' && a.ajuste !== 0 && (
                              <span className="ml-1 font-mono text-xs text-gray-500">
                                ({a.ajuste >= 0 ? '+' : ''}{formatCurrency(a.ajuste)})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ABA FINANCEIRO */}
              <TabsContent value="finance" className="space-y-6 m-0 animate-in fade-in duration-300">

                {/* Bloco de Valores Principais */}
                <div className="bg-white p-5 rounded-lg border border-secti-border shadow-sm space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-2">Painel de Valores</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-secti-muted">Valor inicial do contrato (R$)</Label>
                      <CurrencyInput
                        className="bg-gray-50 font-mono text-lg"
                        value={formData.valorInicial ?? 0}
                        onValueChange={(num) => {
                          setFormData((prev) => ({
                            ...prev,
                            valorInicial: num,
                            valorAtual: prev.valorAtual === 0 ? num : prev.valorAtual,
                          }));
                        }}
                        disabled={!!contract}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-secti-muted">Valor Atual do Contrato (R$)</Label>
                      <CurrencyInput
                        className="bg-gray-50 font-mono text-lg"
                        value={formData.valorAtual ?? 0}
                        onValueChange={(num) => handleChange('valorAtual', num)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-secti-muted">Pago Acumulado (R$)</Label>
                      <CurrencyInput
                        className="bg-gray-50 font-mono text-lg"
                        value={formData.valorPagoAcumulado ?? 0}
                        onValueChange={(num) => handleChange('valorPagoAcumulado', num)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label className="text-xs font-bold uppercase text-secti-muted flex items-center gap-1">
                      Saldo Disponível Calculado (R$)
                    </Label>
                    <Input
                      type="text"
                      className="font-mono text-xl font-bold text-green-700 bg-green-50 border-green-200 h-12"
                      value={formatCurrency(formData.saldoDisponivel || 0)}
                      disabled
                    />
                  </div>
                </div>

                {/* Bloco Financeiro de Convênio */}
                {isConvenioLike(formData.tipoRegistro) && (
                  <div className="bg-white p-5 rounded-lg border border-secti-border shadow-sm space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-2">Dados Financeiros do Convênio</h3>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-secti-muted">Forma de repasse</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-secti-primary border-secti-border rounded"
                            checked={formData.repasse ?? false}
                            onChange={(e) => setFormData((prev) => ({ ...prev, repasse: e.target.checked }))}
                          />
                          <span className="text-sm">Repasse</span>
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-secti-primary border-secti-border rounded"
                            checked={formData.descentralizacaoCredito ?? false}
                            onChange={(e) => setFormData((prev) => ({ ...prev, descentralizacaoCredito: e.target.checked }))}
                          />
                          <span className="text-sm">Descentralização de crédito</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-secti-muted">Valor do concedente (R$)</Label>
                        <CurrencyInput
                          className="bg-gray-50 font-mono text-lg"
                          value={formData.valorConcedente ?? 0}
                          onValueChange={(num) => handleChange('valorConcedente', num)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-secti-muted">Valor do convenente (R$)</Label>
                        <CurrencyInput
                          className="bg-gray-50 font-mono text-lg"
                          value={formData.valorConvenente ?? 0}
                          onValueChange={(num) => handleChange('valorConvenente', num)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Bloco Liberação de Recurso (apenas para convênios) */}
                {isConvenioLike(formData.tipoRegistro) && (
                  <div className="bg-white p-5 rounded-lg border border-secti-border shadow-sm space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-2">Liberação de Recurso</h3>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-secti-muted">Forma de liberação</Label>
                      <RadioGroup
                        value={formData.liberacaoRecurso ?? ''}
                        onValueChange={(v) => handleChange('liberacaoRecurso' as any, v)}
                        className="grid grid-cols-1 md:grid-cols-3 gap-3"
                      >
                        <label
                          className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                            formData.liberacaoRecurso === 'parcelaUnica'
                              ? 'border-secti-primary bg-secti-primary/5'
                              : 'border-secti-border bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <RadioGroupItem value="parcelaUnica" />
                          <div className="leading-tight">
                            <p className="text-sm font-medium text-gray-800">Parcela única</p>
                          </div>
                        </label>

                        <label
                          className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                            formData.liberacaoRecurso === 'duasParcelas'
                              ? 'border-secti-primary bg-secti-primary/5'
                              : 'border-secti-border bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <RadioGroupItem value="duasParcelas" />
                          <div className="leading-tight">
                            <p className="text-sm font-medium text-gray-800">Duas parcelas</p>
                          </div>
                        </label>

                        <label
                          className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                            formData.liberacaoRecurso === 'outros'
                              ? 'border-secti-primary bg-secti-primary/5'
                              : 'border-secti-border bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <RadioGroupItem value="outros" />
                          <div className="leading-tight">
                            <p className="text-sm font-medium text-gray-800">Outros</p>
                          </div>
                        </label>
                      </RadioGroup>
                    </div>

                    {formData.liberacaoRecurso === 'outros' && (
                      <div className="space-y-2 rounded-lg border border-secti-border bg-gray-50 p-3">
                        <Label className="text-xs font-bold uppercase text-secti-muted">Especificar</Label>
                        <Input
                          className="bg-white border-secti-border"
                          value={formData.liberacaoRecursoObservacao ?? ''}
                          onChange={(e) => handleChange('liberacaoRecursoObservacao' as any, e.target.value)}
                          placeholder="Descreva como os recursos serão liberados"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Bloco de Aditivos/Supressão (Só aparece se estiver editando um existente) */}
                {contract && (
                  <div className="bg-blue-50/50 p-5 rounded-lg border border-blue-100 shadow-sm space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-[#0B2046]">
                        Novo Ajuste de Valor (+ Aditivo / - Supressão)
                      </Label>
                      <CurrencyInput
                        className="bg-white font-mono text-lg focus:ring-blue-500 border-blue-200 shadow-inner h-12"
                        placeholder="Ex: 50.000 para aditivo, -20.000 para supressão"
                        value={ajuste}
                        onValueChange={(num) => setAjuste(num)}
                      />
                      {contract && onAddTermoAditivo && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => onAddTermoAditivo(contract as Contract)}
                        >
                          <Handshake className="h-4 w-4 mr-1" />
                          Registrar Termo Aditivo
                        </Button>
                      )}
                    </div>

                    <div className="space-y-3 bg-white p-4 rounded-md border border-blue-100 shadow-sm">
                      <p className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">Simulação Final</p>

                      <div className="flex justify-between items-center text-sm border-b border-dashed border-gray-200 pb-2">
                        <span className="text-gray-600">Novo Valor Atualizado:</span>
                        <span className="font-mono font-bold text-gray-900 text-base">
                          {formatCurrency((formData.valorAtual ?? 0) + ajuste)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-sm pt-1">
                        <span className="text-green-700 font-medium">Novo Saldo Disponível:</span>
                        <span className="font-mono font-bold text-green-700 text-lg">
                          {formatCurrency(((formData.valorAtual ?? 0) + ajuste) - (formData.valorPagoAcumulado ?? 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </form>

        {/* FOOTER */}
        <SheetFooter className="p-6 bg-white border-t border-secti-border mt-auto z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex w-full gap-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-300 text-gray-600 uppercase text-xs font-bold hover:bg-gray-50 h-11"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 text-white uppercase text-xs font-bold bg-[#0B2046] hover:bg-blue-900 transition-colors h-11"
            >
              {contract ? 'Salvar Alterações' : 'Confirmar Registro'}
            </Button>
          </div>
        </SheetFooter>

      </SheetContent>
    </Sheet>
  );
}