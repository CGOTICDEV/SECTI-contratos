import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from './ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { formatDate, formatCurrency } from '../utils/contract-helpers';
import { Contract, HistoryEntry, HistoryChange } from '../types/contract';

interface ContractDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract;
}

export function ContractDetailsModal({ isOpen, onClose, contract }: ContractDetailsModalProps) {
  const renderHistory = () => {
    if (!contract.history || contract.history.length === 0) {
      return <p className="text-sm text-secti-muted">Sem histórico disponível.</p>;
    }

    return (
      <div className="space-y-6">
        {contract.history
          .slice()
          .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
          .map((entry: HistoryEntry, idx: number) => (
            <div key={idx} className="p-4 border rounded-md bg-white shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono text-secti-muted">
                  {formatDate(entry.timestamp)} {new Date(entry.timestamp).toLocaleTimeString('pt-BR')}
                </span>
                {entry.user && <span className="text-xs text-secti-muted">{entry.user}</span>}
              </div>
              <ul className="list-disc list-inside text-sm space-y-1">
                {entry.changes.map((chg: HistoryChange, ci: number) => (
                  <li key={ci}>
                    <strong className="capitalize">{chg.field}</strong>: {String(chg.before) || '-'} &rarr; {String(chg.after)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl w-full border-l border-secti-border bg-[#F8FAFC] p-0 flex flex-col">
        <SheetHeader className="p-6 bg-[#0B2046] text-white">
          <SheetTitle className="text-2xl font-bold tracking-tight text-white">
            Detalhes do {contract.tipoRegistro === 'convenio' ? 'Convênio' : 'Contrato'}
          </SheetTitle>
          <SheetDescription className="text-[#00D1FF]/70 font-mono text-xs uppercase tracking-widest">
            ID: {contract.id}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="resumo" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-secti-border bg-white h-12 px-6">
              <TabsTrigger value="resumo" className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-secti-primary">
                Resumo
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-secti-primary">
                Histórico
              </TabsTrigger>
            </TabsList>

            <div className="p-6 space-y-6">
              <TabsContent value="resumo" className="space-y-4 m-0">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase text-secti-muted">Número</span>
                  <p className="font-mono">{contract.numeroContrato}</p>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase text-secti-muted">Empresa / Convênente</span>
                  <p>{contract.empresa || contract.convenente}</p>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase text-secti-muted">Objeto</span>
                  <p>{contract.objeto}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase text-secti-muted">Gestor</span>
                    <p>{contract.gestor}</p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase text-secti-muted">Fiscal</span>
                    <p>{contract.fiscal}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase text-secti-muted">Início</span>
                    <p>{formatDate(contract.vigenciaInicial)}</p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase text-secti-muted">Fim</span>
                    <p>{formatDate(contract.vigenciaAtual)}</p>
                  </div>
                </div>
                {contract.ultimoTermoAditivo && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase text-secti-muted">Último Termo Aditivo</span>
                    <p className="whitespace-pre-line text-sm">{contract.ultimoTermoAditivo}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase text-secti-muted">Valor Atual</span>
                    <p>{formatCurrency(contract.valorAtual)}</p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase text-secti-muted">Saldo Disponível</span>
                    <p>{formatCurrency(contract.saldoDisponivel)}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="historico" className="space-y-4 m-0">
                {renderHistory()}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <SheetFooter className="p-6 bg-white border-t border-secti-border mt-auto">
          <Button variant="outline" onClick={onClose} className="flex-1 border-secti-border text-secti-muted uppercase text-xs font-bold">
            Fechar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
