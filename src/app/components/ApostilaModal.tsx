import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from './ui/sheet';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Contract, Apostila } from '../types/contract';
import { FilePlus } from 'lucide-react';
import { formatDate } from '../utils/contract-helpers';

interface ApostilaModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  onSave: (contractId: string, note: string) => void;
}

export function ApostilaModal({ isOpen, onClose, contract, onSave }: ApostilaModalProps) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (!isOpen) setText('');
  }, [isOpen, contract]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (contract && text.trim()) {
      onSave(contract.id, text.trim());
      onClose();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-lg w-full border-l border-secti-border bg-[#F8FAFC] p-0 flex flex-col shadow-2xl">
        <SheetHeader className="p-6 bg-[#0B2046] text-white shadow-md z-10">
          <SheetTitle className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <FilePlus className="w-6 h-6 text-[#00D1FF]" />
            Adicionar Apostila
          </SheetTitle>
          <SheetDescription className="text-[#00D1FF]/80 font-mono text-xs uppercase tracking-widest mt-1">
            Contrato ID: {contract?.id}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="space-y-4">
            {contract?.apostilas && contract.apostilas.length > 0 && (
              <div className="bg-white p-4 rounded-lg border border-secti-border shadow-sm space-y-2">
                <h4 className="text-sm font-semibold text-gray-700">Apostilas Anteriores</h4>
                <ul className="list-disc list-inside text-xs text-gray-600 max-h-32 overflow-y-auto">
                  {contract.apostilas.map((a: Apostila, idx: number) => (
                    <li key={idx}>
                      <span className="font-mono">{formatDate(a.timestamp)}</span> – {a.note}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-secti-muted">Descrição da Apostila</label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="bg-gray-50 border-secti-border min-h-[120px] resize-none"
                placeholder="Descreva a mudança que está sendo registrada como apostila..."
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
              Adicionar Apostila
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
