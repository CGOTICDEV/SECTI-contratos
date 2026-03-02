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
import { Calendar, DollarSign, Info, FileText, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/contract-helpers';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contract: Partial<Contract>) => void;
  contract?: Contract;
  currentUser?: {
    email?: string;
    role?: 'gestor' | 'fiscal';
    displayName?: string;
  };
}

export function ContractModal({ isOpen, onClose, onSave, contract, currentUser }: ContractModalProps) {
  const defaultData: Partial<Contract> = {
    tipoRegistro: 'contrato',
    numeroContrato: '',
    empresa: '',
    objeto: '',
    gestor: '',
    fiscal: '',
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
    termoAdesao: '',
  };

  const computeInitial = () => {
    if (contract) return contract;
    const base = { ...defaultData };
    if (currentUser) {
      const nameOrEmail = currentUser.displayName || currentUser.email || '';
      if (currentUser.role === 'gestor') base.gestor = nameOrEmail;
      if (currentUser.role === 'fiscal') base.fiscal = nameOrEmail;
    }
    return base;
  };

  const isGestor = currentUser?.role === 'gestor';
  const isFiscal = currentUser?.role === 'fiscal';

  const [formData, setFormData] = useState<Partial<Contract>>(computeInitial());
  const [ajuste, setAjuste] = useState<number>(0);

  const numericFields: Array<keyof Contract> = [
    'valorInicial',
    'valorAtual',
    'saldoDisponivel',
    'valorPagoAno',
    'valorPagoAcumulado',
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
    
    setFormData((prev) => ({
      ...prev,
      saldoDisponivel: valorAtual - pagoAcumulado,
    }));
  }, [formData.valorAtual, formData.valorPagoAcumulado]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let payload: Partial<Contract> = { ...formData };
    
    const baseValorAtual = payload.valorAtual ?? 0;
    const vpa = payload.valorPagoAcumulado ?? 0;

    const novoValorAtual = baseValorAtual + ajuste;
    payload.valorAtual = novoValorAtual;
    
    payload.saldoDisponivel = novoValorAtual - vpa; 

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

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl w-full border-l border-secti-border bg-[#F8FAFC] p-0 flex flex-col shadow-2xl">
        
        {/* HEADER */}
        <SheetHeader className="p-6 bg-[#0B2046] text-white shadow-md z-10">
          <SheetTitle className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <FileText className="w-6 h-6 text-[#00D1FF]" />
            {contract
              ? `Ajustar ${contract.tipoRegistro === 'convenio' ? 'Convênio' : 'Contrato'}`
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
                <Calendar className="w-4 h-4" /> Cronograma
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-secti-muted">Tipo de Registro</Label>
                      <Select value={formData.tipoRegistro} onValueChange={(v) => handleChange('tipoRegistro', v as 'contrato' | 'convenio')}>
                        <SelectTrigger className="bg-gray-50 border-secti-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contrato">Contrato</SelectItem>
                          <SelectItem value="convenio">Convênio</SelectItem>
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
                  <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-2">Dados do {formData.tipoRegistro === 'convenio' ? 'Convênio' : 'Contrato'}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="numeroContrato" className="text-xs font-bold uppercase text-secti-muted">
                        Código {formData.tipoRegistro === 'convenio' ? '(Opcional)' : ''}
                      </Label>
                      <Input
                        id="numeroContrato"
                        className="font-mono bg-gray-50 border-secti-border focus:ring-secti-accent"
                        value={formData.numeroContrato}
                        onChange={(e) => handleChange('numeroContrato', e.target.value)}
                        placeholder="Ex: 001/2024-SECTI"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="empresa" className="text-xs font-bold uppercase text-secti-muted">
                        {formData.tipoRegistro === 'convenio' ? 'Convenente' : 'Unidade Contratada'}
                      </Label>
                      <Input
                        id="empresa"
                        className="bg-gray-50 border-secti-border"
                        value={formData.empresa}
                        onChange={(e) => handleChange('empresa', e.target.value)}
                        placeholder="Nome da instituição"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gestor" className="text-xs font-bold uppercase text-secti-muted">Gestor</Label>
                      <Input
                        id="gestor"
                        className="bg-gray-50 border-secti-border disabled:opacity-70 disabled:bg-gray-100"
                        value={formData.gestor}
                        onChange={(e) => handleChange('gestor', e.target.value)}
                        placeholder="Nome do Gestor"
                        disabled={!isGestor}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fiscal" className="text-xs font-bold uppercase text-secti-muted">Fiscal</Label>
                      <Input
                        id="fiscal"
                        className="bg-gray-50 border-secti-border disabled:opacity-70 disabled:bg-gray-100"
                        value={formData.fiscal}
                        onChange={(e) => handleChange('fiscal', e.target.value)}
                        placeholder="Nome do Fiscal"
                        disabled={!isFiscal}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label htmlFor="objeto" className="text-xs font-bold uppercase text-secti-muted">Relatório de Objeto</Label>
                    <Textarea
                      id="objeto"
                      className="bg-gray-50 border-secti-border min-h-[100px] resize-none"
                      value={formData.objeto}
                      onChange={(e) => handleChange('objeto', e.target.value)}
                      placeholder="Descreva o objeto principal..."
                    />
                  </div>
                </div>

                {/* Bloco Exclusivo de Convênio */}
                {formData.tipoRegistro === 'convenio' && (
                  <div className="bg-[#F0F7FF] p-5 rounded-lg border border-[#BDE0FF] shadow-sm space-y-4">
                    <h3 className="text-sm font-semibold text-[#0B2046] border-b border-[#BDE0FF] pb-2 mb-2">Informações Específicas de Convênio</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-secti-muted">Nº Acordo Coop. Técnica</Label>
                        <Input className="bg-white border-[#BDE0FF]" value={formData.numeroAcordoCooperacaoTecnica} onChange={(e) => handleChange('numeroAcordoCooperacaoTecnica', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-secti-muted">Nº Termo Coop. Técnica</Label>
                        <Input className="bg-white border-[#BDE0FF]" value={formData.numeroTermoCooperacaoTecnica} onChange={(e) => handleChange('numeroTermoCooperacaoTecnica', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-secti-muted">Nº do Convênio</Label>
                        <Input className="bg-white border-[#BDE0FF]" value={formData.numeroConvenio} onChange={(e) => handleChange('numeroConvenio', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-secti-muted">Termo de Adesão</Label>
                        <Input className="bg-white border-[#BDE0FF]" value={formData.termoAdesao} onChange={(e) => handleChange('termoAdesao', e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ABA CRONOGRAMA */}
              <TabsContent value="dates" className="space-y-6 m-0 animate-in fade-in duration-300">
                <div className="bg-white p-5 rounded-lg border border-secti-border shadow-sm space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-secti-muted">Início da Operação</Label>
                      <Input type="date" className="bg-gray-50 font-mono" value={formData.vigenciaInicial} onChange={(e) => handleChange('vigenciaInicial', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-secti-muted">Vigência Final</Label>
                      {/* O border-orange-200 original foi mantido e reforçado para dar destaque de prazo */}
                      <Input type="date" className="bg-orange-50 font-mono border-orange-300 focus:ring-orange-400" value={formData.vigenciaAtual} onChange={(e) => handleChange('vigenciaAtual', e.target.value)} />
                    </div>
                  </div>
                  
                  <div className="space-y-2 border-t border-gray-100 pt-4">
                    <Label className="text-xs font-bold uppercase text-secti-muted">Histórico: Último Termo Aditivo</Label>
                    <Textarea
                      className="bg-gray-50 border-secti-border min-h-[100px] resize-none"
                      value={formData.ultimoTermoAditivo}
                      onChange={(e) => handleChange('ultimoTermoAditivo', e.target.value)}
                      placeholder="Descreva o conteúdo do último termo aditivo (datas, prorrogações, etc.)"
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
                      <Label className="text-xs font-bold uppercase text-secti-muted">Aporte Inicial (R$)</Label>
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
                      <Label className="text-xs font-bold uppercase text-secti-muted">Pago em 2025 (R$)</Label>
                      <CurrencyInput
                        className="bg-gray-50 font-mono text-lg"
                        value={formData.valorPagoAno ?? 0}
                        onValueChange={(num) => handleChange('valorPagoAno', num)}
                      />
                    </div>
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