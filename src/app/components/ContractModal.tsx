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
import { ShieldCheck, Calendar, DollarSign, Info } from 'lucide-react';

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

  // sync when contract or user changes
  React.useEffect(() => {
    if (contract) {
      setFormData(contract);
    } else {
      setFormData(computeInitial());
    }
  }, [contract, currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleChange = (field: keyof Contract, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl w-full border-l border-secti-border bg-[#F8FAFC] p-0 flex flex-col">
        <SheetHeader className="p-6 bg-[#0B2046] text-white">
          <SheetTitle className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#00D1FF]" />
            {contract ? 'Ajustar Contrato' : 'Novo Registro'}
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
                <div className="space-y-2">
                  <Label htmlFor="numeroContrato" className="text-xs font-bold uppercase text-secti-muted">Código do Contrato</Label>
                  <Input
                    id="numeroContrato"
                    className="font-mono bg-white border-secti-border focus:ring-secti-accent"
                    value={formData.numeroContrato}
                    onChange={(e) => handleChange('numeroContrato', e.target.value)}
                    placeholder="Ex: 001/2024-SECTI"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empresa" className="text-xs font-bold uppercase text-secti-muted">Unidade Contratada</Label>
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
                  <Label htmlFor="objeto" className="text-xs font-bold uppercase text-secti-muted">Relatório de Objeto</Label>
                  <Textarea
                    id="objeto"
                    className="bg-white border-secti-border min-h-[120px] resize-none"
                    value={formData.objeto}
                    onChange={(e) => handleChange('objeto', e.target.value)}
                  />
                </div>
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
              </TabsContent>

              <TabsContent value="finance" className="space-y-4 m-0">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg mb-4">
                  <p className="text-[10px] font-bold text-blue-800 uppercase">Resumo de Tesouraria</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-secti-muted">Aporte Inicial (R$)</Label>
                    <Input type="number" className="bg-white font-mono text-lg" value={formData.valorInicial} onChange={(e) => handleChange('valorInicial', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-secti-muted">Saldo em Caixa (R$)</Label>
                    <Input type="number" className="bg-white font-mono text-lg text-green-600" value={formData.saldoDisponivel} onChange={(e) => handleChange('saldoDisponivel', e.target.value)} />
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </form>

        <SheetFooter className="p-6 bg-white border-t border-secti-border">
          <div className="flex w-full gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 border-secti-border text-secti-muted uppercase text-xs font-bold">
              Sair
            </Button>
            <Button onClick={handleSubmit} className="flex-1 text-white uppercase text-xs font-bold hover:bg-secti-secondary">
              {contract ? 'Salvar Alterações' : 'Confirmar Registro'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}