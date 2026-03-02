import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from './ui/sheet';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { CurrencyInput } from './ui/currency-input';
import { Contract, TermoAditivo } from '../types/contract';
import { FilePlus } from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/contract-helpers';

interface TermoAditivoModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  /**
   * callback when user saves an termo aditivo
   * @param contractId id of the contract
   * @param note descriptive text
   * @param ajuste numeric adjustment (positive only)
   * @param vigenciaInicial optional new start date (YYYY-MM-DD)
   * @param vigenciaAtual optional new end/vigência date (YYYY-MM-DD)
   */
  onSave: (
    contractId: string,
    note: string,
    ajuste?: number,
    vigenciaInicial?: string,
    prorrogacao?: string
  ) => void;
}

export function TermoAditivoModal({ isOpen, onClose, contract, onSave }: TermoAditivoModalProps) {
  const [text, setText] = useState('');
  const [ajuste, setAjuste] = useState<number>(0);
  const [vigenciaInicial, setVigenciaInicial] = useState<string>('');
  const [prorrogacao, setProrrogacao] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      setText('');
      setAjuste(0);
      setVigenciaInicial('');
      setProrrogacao('');
    } else if (contract) {
      setVigenciaInicial(contract.vigenciaInicial || '');
      // do not prepopulate prorrogacao; user types new extension date
      setProrrogacao('');
    }
  }, [isOpen, contract]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (contract && text.trim()) {
      onSave(contract.id, text.trim(), ajuste, vigenciaInicial, prorrogacao);
      onClose();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-lg w-full border-l border-secti-border bg-[#F8FAFC] p-0 flex flex-col shadow-2xl">
        <SheetHeader className="p-6 bg-[#0B2046] text-white shadow-md z-10">
          <SheetTitle className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <FilePlus className="w-6 h-6 text-[#00D1FF]" />
            Adicionar Termo Aditivo
          </SheetTitle>
          <SheetDescription className="text-[#00D1FF]/80 font-mono text-xs uppercase tracking-widest mt-1">
            Contrato ID: {contract?.id}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="space-y-4">
            {contract?.termosAditivos && contract.termosAditivos.length > 0 && (
              <div className="bg-white p-4 rounded-lg border border-secti-border shadow-sm space-y-2">
                <h4 className="text-sm font-semibold text-gray-700">Termos Aditivos Anteriores</h4>
                <ul className="list-disc list-inside text-xs text-gray-600 max-h-32 overflow-y-auto">
                  {contract.termosAditivos.map((a: TermoAditivo, idx: number) => (
                    <li key={idx}>
                      <span className="font-mono">{formatDate(a.timestamp)}</span> – {a.note}
                      {typeof a.ajuste === 'number' && a.ajuste !== 0 && (
                        <span className="ml-1 font-mono text-xs text-gray-500">
                          {a.ajuste >= 0 ? '+' : ''}{formatCurrency(a.ajuste)}
                        </span>
                      )}
                      {(a.originalVigencia || a.vigenciaInicial || a.prorrogacao) && (
                        <span className="ml-2 text-[11px] text-gray-500">
                          {a.originalVigencia && `orig ${a.originalVigencia}`} 
                          {(a.vigenciaInicial || a.prorrogacao) && 
                            `→ ${a.prorrogacao || a.vigenciaInicial}`}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-secti-muted">Descrição do Termo Aditivo</label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="bg-gray-50 border-secti-border min-h-[120px] resize-none"
                placeholder="Descreva o conteúdo do termo aditivo..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-secti-muted">Data da Prorrogação</label>
                <input
                  type="date"
                  className="bg-gray-50 border-secti-border w-full"
                  value={prorrogacao}
                  onChange={(e) => setProrrogacao(e.target.value)}
                />
                <p className="text-[11px] text-gray-500">Prorrogação altera a <strong>vigência atual</strong> do contrato para esta data.</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-secti-muted">
                Acréscimo no valor do contrato
              </label>
              <CurrencyInput
                className="bg-gray-50 border-secti-border font-mono"
                value={ajuste}
                onValueChange={(num) => setAjuste(num)}
                placeholder="0,00"
              />
            </div>
          </div>
        </form>

        <SheetFooter className="p-6 bg-white border-t border-secti-border mt-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
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
              Adicionar Termo
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}