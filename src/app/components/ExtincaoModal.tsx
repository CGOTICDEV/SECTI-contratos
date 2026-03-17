import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from './ui/sheet';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Contract, TermoAditivoDocument } from '../types/contract';
import { FileX, FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../utils/contract-helpers';
import { 
  fileToBase64, 
  downloadBase64File, 
  formatFileSize, 
  isValidFileType, 
  isValidFileSize 
} from '../utils/file-helpers';

interface ExtincaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  onSave: (
    contractId: string,
    tipo: 'termoRecisaoUnilateral' | 'termoRecisaoAmigavel',
    note: string,
    dataExtincao?: string,
    documents?: TermoAditivoDocument[]
  ) => void;
}

export function ExtincaoModal({ isOpen, onClose, contract, onSave }: ExtincaoModalProps) {
  const [tipo, setTipo] = useState<'termoRecisaoUnilateral' | 'termoRecisaoAmigavel' | ''>('');
  const [note, setNote] = useState('');
  const [dataExtincao, setDataExtincao] = useState('');
  const [documents, setDocuments] = useState<TermoAditivoDocument[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTipo('');
      setNote('');
      setDataExtincao('');
      setDocuments([]);
      return;
    }

    if (contract) {
      // prefill with current end of vigência as a convenience
      setDataExtincao(contract.vigenciaAtual || new Date().toISOString().slice(0, 10));
      setNote('');
      setTipo('');
      setDocuments([]);
    }
  }, [isOpen, contract]);

  const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  const MAX_FILE_SIZE_MB = 2; // 2 MB máximo por arquivo
  const MAX_TOTAL_SIZE_MB = 0.5; // ~500KB total em base64 para Firestore

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const newDocuments: TermoAditivoDocument[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!isValidFileType(file, ALLOWED_TYPES)) {
          toast.error(`${file.name}: tipo de arquivo não permitido. Use PDF, DOC ou DOCX.`);
          continue;
        }

        if (!isValidFileSize(file, MAX_FILE_SIZE_MB)) {
          toast.error(`${file.name}: arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE_MB} MB.`);
          continue;
        }

        const base64 = await fileToBase64(file);

        const doc: TermoAditivoDocument = {
          id: `${Date.now()}_${i}`,
          name: file.name,
          type: file.type,
          base64,
          uploadedAt: new Date().toISOString(),
          size: file.size,
        };

        newDocuments.push(doc);
      }

      if (newDocuments.length > 0) {
        const currentTotalSize = documents.reduce((sum, doc) => sum + (doc.base64?.length || 0), 0);
        const newTotalSize = newDocuments.reduce((sum, doc) => sum + (doc.base64?.length || 0), 0);
        const combinedSize = currentTotalSize + newTotalSize;
        const maxSizeBytes = MAX_TOTAL_SIZE_MB * 1024 * 1024;

        if (combinedSize > maxSizeBytes) {
          toast.error(
            `Limite total de ${Math.round(MAX_TOTAL_SIZE_MB * 1024)}KB excedido. ` +
            `Tamanho atual: ${Math.round(combinedSize / 1024)}KB. ` +
            `Remova alguns arquivos ou use versões menores.`
          );
        } else {
          setDocuments(prev => [...prev, ...newDocuments]);
          toast.success(
            `${newDocuments.length} arquivo(s) adicionado(s). ` +
            `Total: ${Math.round(combinedSize / 1024)}KB de ${Math.round(maxSizeBytes / 1024)}KB`
          );
        }
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao processar arquivo(s).');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveDocument = (docId: string) => {
    setDocuments(prev => prev.filter((doc) => doc.id !== docId));
  };

  const handleDownloadDocument = (doc: TermoAditivoDocument) => {
    downloadBase64File(doc.base64, doc.name, doc.type);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;

    if (!tipo) {
      toast.error('Selecione se é recisão unilateral ou amigável.');
      return;
    }

    onSave(contract.id, tipo, note.trim(), dataExtincao || undefined, documents.length ? documents : undefined);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-lg w-full border-l border-secti-border bg-[#F8FAFC] p-0 flex flex-col shadow-2xl">
        <SheetHeader className="p-6 bg-[#0B2046] text-white shadow-md z-10">
          <SheetTitle className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <FileX className="w-6 h-6 text-[#00D1FF]" />
            Extinção Contratual
          </SheetTitle>
          <SheetDescription className="text-[#00D1FF]/80 font-mono text-xs uppercase tracking-widest mt-1">
            {contract ? `Contrato ID: ${contract.id}` : 'Nenhum contrato selecionado'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-lg border border-secti-border shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-3">Tipo de Extinção</h3>
              <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as any)} className="flex flex-col gap-3">
                <label className="flex items-center gap-3">
                  <RadioGroupItem value="termoRecisaoUnilateral" />
                  <span className="text-sm cursor-pointer hover:underline">Recisão Unilateral</span>
                </label>
                <label className="flex items-center gap-3">
                  <RadioGroupItem value="termoRecisaoAmigavel" />
                  <span className="text-sm cursor-pointer hover:underline">Recisão Amigável</span>
                </label>
              </RadioGroup>
            </div>

            {contract?.termosAditivos && contract.termosAditivos.length > 0 && (
              <div className="bg-white p-5 rounded-lg border border-secti-border shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-3">Termos anteriores</h3>
                <ul className="space-y-3 max-h-40 overflow-y-auto">
                  {contract.termosAditivos.map((t, idx) => (
                    <li key={idx} className="text-xs text-gray-700">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-mono text-[11px] text-gray-500">{formatDate(t.timestamp)}</p>
                          <p className="font-medium">{t.tipo ? t.tipo : 'Termo'}</p>
                          <p className="text-gray-600 truncate">{t.note}</p>
                        </div>
                        {t.documents && t.documents.length > 0 && (
                          <span className="text-[11px] text-gray-500">Anexos: {t.documents.length}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-white p-5 rounded-lg border border-secti-border shadow-sm">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-secti-muted">Data da Extinção</Label>
                  <input
                    type="date"
                    value={dataExtincao}
                    onChange={(e) => setDataExtincao(e.target.value)}
                    className="w-full bg-gray-50 border border-secti-border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-secti-muted">Observações / Motivo</Label>
                  <Textarea
                    className="bg-gray-50 border-secti-border min-h-[120px] resize-none"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Descreva brevemente a razão da extinção..."
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase text-secti-muted">Anexos (opcional)</Label>
                  <div className="flex items-center gap-2">
                    <label
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-secti-border bg-white px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                      title="Adicionar documento"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Adicionar arquivo</span>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                    {uploading && <span className="text-xs text-secti-muted">Carregando...</span>}
                  </div>

                  {documents.length > 0 && (
                    <div className="rounded-lg border border-secti-border bg-gray-50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-700">Arquivos a serem anexados</span>
                        <span className="text-xs text-gray-500">{documents.length}</span>
                      </div>
                      <ul className="space-y-2">
                        {documents.map((doc) => (
                          <li key={doc.id} className="flex items-center justify-between gap-3 text-xs text-gray-700">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <div className="flex flex-col">
                                <span className="truncate max-w-[220px]">{doc.name}</span>
                                <span className="text-[11px] text-gray-500">{formatFileSize(doc.size)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleDownloadDocument(doc)}
                                className="text-blue-600 hover:text-blue-800 text-[11px]"
                              >
                                Baixar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveDocument(doc.id)}
                                className="text-red-600 hover:text-red-800 text-[11px]"
                              >
                                Remover
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>

        <SheetFooter className="p-6 bg-white border-t border-secti-border mt-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex w-full gap-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-300 text-gray-600 uppercase text-xs font-bold hover:bg-gray-50 h-11"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              className="flex-1 text-white uppercase text-xs font-bold bg-[#0B2046] hover:bg-blue-900 transition-colors h-11"
            >
              Registrar Extinção
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
