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
import { Calendar, DollarSign, Info } from 'lucide-react';
import { formatCurrency } from '../utils/contract-helpers';

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
  // additional adjustment amount to increment/decrement existing contract values
  const [ajuste, setAjuste] = useState<number>(0);

  // helper: convert string to number for numeric contract fields
  const numericFields: Array<keyof Contract> = [
    'valorInicial',
    'valorAtual',
    'saldoDisponivel',
    'valorPagoAno',
    'valorPagoAcumulado',
  ];

  // Reseta o estado quando o modal abre ou muda de contrato
  React.useEffect(() => {
    if (contract) {
      setFormData(contract);
    } else {
      setFormData(computeInitial());
    }
    setAjuste(0);
  }, [contract, currentUser]);

  // Calcula SEMPRE o Saldo Disponível dinamicamente
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

    // Aplica o ajuste de aditivo/supressão (se houver) ao Valor Atual final
    const novoValorAtual = baseValorAtual + ajuste;
    payload.valorAtual = novoValorAtual;
    
    // Garante o cálculo final exato do saldo no momento de salvar
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
      <SheetContent className="sm:max-w-xl w-full border-l border-secti-border bg-[#F8FAFC] p-0 flex flex-col">
        <SheetHeader className="p-6 bg-[#0B2046] text-white">
          <SheetTitle className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            {contract
              ? `Ajustar ${contract.tipoRegistro === 'convenio' ? 'Convênio' : 'Contrato'}`
              : 'Novo Registro'}
          </SheetTitle>
          <SheetDescription className="text-[#00D1FF]/70 font-mono text-xs uppercase tracking-widest">
            ID: {contract?.id || 'Sem registro'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-secti-border bg-white h-12 px-6">
              <TabsTrigger value="info" className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-secti-primary">
                <Info className="w-4 h-4" /> Geral
              </TabsTrigger>
              <TabsTrigger value="dates" className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-secti-primary">
                <Calendar className="w-4 h-4" /> Cronograma
              </TabsTrigger>
              <TabsTrigger value="finance" className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-secti-primary">
                <DollarSign className="w-4 h-4" /> Financeiro
              </TabsTrigger>
            </TabsList>

            <div className="p-6 space-y-6">
              <TabsContent value="info" className="space-y-4 m-0">
                {/* Tipo de registro */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-secti-muted">Tipo</Label>
                  <Select
                    value={formData.tipoRegistro}
                    onValueChange={(v) => handleChange('tipoRegistro', v as 'contrato' | 'convenio')}
                  >
                    <SelectTrigger className="bg-white border-secti-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contrato">Contrato</SelectItem>
                      <SelectItem value="convenio">Informações sobre Convênios</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numeroContrato" className="text-xs font-bold uppercase text-secti-muted">
                    Código do Contrato{formData.tipoRegistro === 'convenio' ? ' (opcional)' : ''}
                  </Label>
                  <Input
                    id="numeroContrato"
                    className="font-mono bg-white border-secti-border focus:ring-secti-accent"
                    value={formData.numeroContrato}
                    onChange={(e) => handleChange('numeroContrato', e.target.value)}
                    placeholder={formData.tipoRegistro === 'convenio' ? 'Pode ficar em branco para convênios' : 'Ex: 001/2024-SECTI'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empresa" className="text-xs font-bold uppercase text-secti-muted">
                    {formData.tipoRegistro === 'convenio' ? 'Convenente' : 'Unidade Contratada'}
                  </Label>
                  <Input
                    id="empresa"
                    className="bg-white border-secti-border"
                    value={formData.empresa}
                    onChange={(e) => handleChange('empresa', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gestor" className="text-xs font-bold uppercase text-secti-muted">Gestor</Label>
                  <Input
                    id="gestor"
                    className="bg-white border-secti-border"
                    value={formData.gestor}
                    onChange={(e) => handleChange('gestor', e.target.value)}
                    placeholder="Usuário responsável"
                    disabled={!isGestor}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fiscal" className="text-xs font-bold uppercase text-secti-muted">Fiscal</Label>
                  <Input
                    id="fiscal"
                    className="bg-white border-secti-border"
                    value={formData.fiscal}
                    onChange={(e) => handleChange('fiscal', e.target.value)}
                    placeholder="Usuário responsável"
                    disabled={!isFiscal}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="objeto" className="text-xs font-bold uppercase text-secti-muted">
                    Relatório de Objeto
                  </Label>
                  <Textarea
                    id="objeto"
                    className="bg-white border-secti-border min-h-[120px] resize-none"
                    value={formData.objeto}
                    onChange={(e) => handleChange('objeto', e.target.value)}
                  />
                </div>
                {formData.tipoRegistro === 'convenio' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-secti-muted">
                        Nº do Acordo de Cooperação Técnica
                      </Label>
                      <Input
                        className="bg-white border-secti-border"
                        value={formData.numeroAcordoCooperacaoTecnica}
                        onChange={(e) => handleChange('numeroAcordoCooperacaoTecnica', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-secti-muted">
                        Nº Termo de Cooperação Técnica
                      </Label>
                      <Input
                        className="bg-white border-secti-border"
                        value={formData.numeroTermoCooperacaoTecnica}
                        onChange={(e) => handleChange('numeroTermoCooperacaoTecnica', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-secti-muted">Nº do Convênio</Label>
                      <Input
                        className="bg-white border-secti-border"
                        value={formData.numeroConvenio}
                        onChange={(e) => handleChange('numeroConvenio', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-secti-muted">
                        Termo de Adesão
                      </Label>
                      <Input
                        className="bg-white border-secti-border"
                        value={formData.termoAdesao}
                        onChange={(e) => handleChange('termoAdesao', e.target.value)}
                      />
                    </div>
                  </>
                )}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-secti-muted">Status Atual</Label>
                    <Select value={formData.situacao} onValueChange={(v) => handleChange('situacao', v)}>
                      <SelectTrigger className="bg-white border-secti-border">
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
              </TabsContent>

              <TabsContent value="dates" className="space-y-4 m-0">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-secti-muted">Início da Operação</Label>
                    <Input type="date" className="bg-white font-mono" value={formData.vigenciaInicial} onChange={(e) => handleChange('vigenciaInicial', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-secti-muted">Vigência Final</Label>
                    <Input type="date" className="bg-white font-mono border-orange-200" value={formData.vigenciaAtual} onChange={(e) => handleChange('vigenciaAtual', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-secti-muted">Último Termo Aditivo</Label>
                  <Textarea
                    className="bg-white border-secti-border min-h-[80px] resize-none"
                    value={formData.ultimoTermoAditivo}
                    onChange={(e) => handleChange('ultimoTermoAditivo', e.target.value)}
                    placeholder="Descreva o conteúdo do último termo aditivo (datas, prorrogações, etc.)"
                  />
                </div>  
              </TabsContent>

              <TabsContent value="finance" className="space-y-4 m-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-secti-muted">Aporte Inicial (R$)</Label>
                    <CurrencyInput
                      className="bg-white font-mono text-lg"
                      value={formData.valorInicial ?? 0}
                      onValueChange={(num) => {
                        // same logic as before: update valorInicial and, for new records, valorAtual
                        setFormData((prev) => ({
                          ...prev,
                          valorInicial: num,
                          valorAtual: prev.valorAtual === 0 ? num : prev.valorAtual,
                        }));
                      }}
                      disabled={!!contract} // Bloqueia apenas se for um contrato já salvo no banco
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-secti-muted">Valor Atual do Contrato (R$)</Label>
                    <CurrencyInput
                      className="bg-white font-mono text-lg" // Removido o bg-slate-100 para indicar editabilidade
                      value={formData.valorAtual ?? 0}
                      onValueChange={(num) => handleChange('valorAtual', num)}
                      // Campo DESBLOQUEADO para permitir migração de histórico com aditivos
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-secti-muted">Pago em 2025 (R$)</Label>
                    <CurrencyInput
                      className="bg-white font-mono text-lg"
                      value={formData.valorPagoAno ?? 0}
                      onValueChange={(num) => handleChange('valorPagoAno', num)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-secti-muted">Valor Pago Acumulado (R$)</Label>
                    <CurrencyInput
                      className="bg-white font-mono text-lg"
                      value={formData.valorPagoAcumulado ?? 0}
                      onValueChange={(num) => handleChange('valorPagoAcumulado', num)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-secti-muted">Saldo Disponível (R$)</Label>
                    <Input
                      type="number"
                      className="bg-white font-mono text-lg text-green-600 bg-green-50"
                      value={formData.saldoDisponivel}
                      disabled // Sempre calculado automaticamente pela fórmula: Valor Atual - Pago Acumulado
                    />
                  </div>

                  {contract && (
                    <>
                      <div className="space-y-2 mt-6 pt-4 border-t border-secti-border">
                        <Label className="text-xs font-bold uppercase text-secti-muted">
                          Novo Ajuste de Valor (+ Aditivo / - Supressão)
                        </Label>
                        <CurrencyInput
                          className="bg-white font-mono text-lg focus:ring-blue-500 border-blue-200"
                          placeholder="Ex: 50000 para aditivo, -20000 para supressão"
                          value={ajuste}
                          onValueChange={(num) => setAjuste(num)}
                        />
                      </div>

                      <div className="space-y-2 text-sm text-slate-700 bg-slate-100 p-4 rounded-md border border-slate-200 shadow-inner">
                        <p className="font-semibold text-xs uppercase text-slate-500 mb-2">Simulação do Ajuste</p>
                        <div className="flex justify-between">
                          <span>Novo Valor Atual:</span>
                          <span className="font-mono font-bold">
                            {formatCurrency((formData.valorAtual ?? 0) + ajuste)}
                          </span>
                        </div>
                        <div className="flex justify-between text-green-700 mt-1">
                          <span>Novo Saldo Disponível:</span>
                          <span className="font-mono font-bold">
                            {formatCurrency(((formData.valorAtual ?? 0) + ajuste) - (formData.valorPagoAcumulado ?? 0))}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </form>

        <SheetFooter className="p-6 bg-white border-t border-secti-border mt-auto">
          <div className="flex w-full gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 border-secti-border text-secti-muted uppercase text-xs font-bold">
              Sair
            </Button>
            <Button onClick={handleSubmit} className="flex-1 text-white uppercase text-xs font-bold bg-[#0B2046] hover:bg-blue-800">
              {contract ? 'Salvar Alterações' : 'Confirmar Registro'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}