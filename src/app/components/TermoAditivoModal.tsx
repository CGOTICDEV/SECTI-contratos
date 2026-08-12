import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from './ui/sheet';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { CurrencyInput } from './ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Contract, TermoAditivo, TermoAditivoDocument } from '../types/contract';
import { FilePlus, Upload, FileText, X, Download, Sparkles } from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/contract-helpers';
import { GuiaPanel } from './GuiaPanel';
import type { GuiaTermoSuggestion } from '../utils/guia';
import { 
  fileToBase64, 
  downloadBase64File, 
  formatFileSize, 
  isValidFileType, 
  isValidFileSize 
} from '../utils/file-helpers';
import { resolveDocumentBlob } from '../utils/storage-fallback';
import { toast } from 'sonner';

interface TermoAditivoModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  /**
   * callback when user saves an termo aditivo
   * @param contractId id of the contract
   * @param note descriptive text
   * @param tipo type of termo aditivo
   * @param ajuste numeric adjustment (positive only)
   * @param vigenciaInicial optional new start date (YYYY-MM-DD)
   * @param vigenciaAtual optional new end/vigência date (YYYY-MM-DD)
   * @param documents optional array of documents attached to the termo aditivo
   */
  onSave: (
    contractId: string,
    note: string,
    tipo?: string,
    ajuste?: number,
    vigenciaInicial?: string,
    prorrogacao?: string,
    documents?: TermoAditivoDocument[]
  ) => void;
}

export function TermoAditivoModal({ isOpen, onClose, contract, onSave }: TermoAditivoModalProps) {
  const [text, setText] = useState('');
  const [tipo, setTipo] = useState<string>('');
  const [ajuste, setAjuste] = useState<number>(0);
  const [vigenciaInicial, setVigenciaInicial] = useState<string>('');
  const [prorrogacao, setProrrogacao] = useState<string>('');
  const [documents, setDocuments] = useState<TermoAditivoDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [guiaOpen, setGuiaOpen] = useState(false);

  // Tipos de arquivo permitidos
  const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  const MAX_FILE_SIZE_MB = 5; // 5 MB maximo por arquivo (a compressao reduz depois)
  const MAX_TOTAL_SIZE_MB = 5; // budget flexivel — os PDFs sao comprimidos no save

  // Função helper para formatar o tipo do termo aditivo
  const formatTipo = (tipo?: string): string => {
    const tipos: Record<string, string> = {
      'prorrogacao': 'Prorrogação de Prazo',
      'acrescimo': 'Acréscimo de Valor',
      'supressao': 'Supressão de Valor',
      'termoRecisaoUnilateral': 'Termo de Recisão Unilateral',
      'termoRecisaoAmigavel': 'Termo de Recisão Amigável',
      'reajuste': 'Reajuste',
      'outro': 'Outro'
    };
    return tipos[tipo || ''] || '';
  };

  useEffect(() => {
    if (!isOpen) {
      setText('');
      setTipo('');
      setAjuste(0);
      setVigenciaInicial('');
      setProrrogacao('');
      setDocuments([]);
      setUploading(false);
    } else if (contract) {
      setVigenciaInicial(contract.vigenciaInicial || '');
      // do not prepopulate prorrogacao; user types new extension date
      setProrrogacao('');
      setDocuments([]);
    }
  }, [isOpen, contract]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    try {
      const newDocuments: TermoAditivoDocument[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validar tipo de arquivo
        if (!isValidFileType(file, ALLOWED_TYPES)) {
          toast.error(`${file.name}: tipo de arquivo não permitido. Use PDF, DOC ou DOCX.`);
          continue;
        }

        // Validar tamanho do arquivo
        if (!isValidFileSize(file, MAX_FILE_SIZE_MB)) {
          toast.error(`${file.name}: arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE_MB} MB.`);
          continue;
        }

        // Converter para base64
        const base64 = await fileToBase64(file);
        
        const doc: TermoAditivoDocument = {
          id: `${Date.now()}_${i}`,
          name: file.name,
          type: file.type,
          base64: base64,
          uploadedAt: new Date().toISOString(),
          size: file.size
        };

        newDocuments.push(doc);
      }

      if (newDocuments.length > 0) {
        // Verificar tamanho total antes de adicionar
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
      // Resetar o input para permitir upload do mesmo arquivo novamente
      e.target.value = '';
    }
  };

  const handleRemoveDocument = (docId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId));
  };

  const handleDownloadDocument = async (doc: TermoAditivoDocument) => {
    try {
      // Documentos salvos no Storage (storageUrl) sao baixados direto; os em
      // base64 seguem pelo fluxo tradicional. resolveDocumentBlob cobre ambos.
      const blob = await resolveDocumentBlob(doc as any);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download falhou, tentando abrir no navegador', err);
      // fallback: abrir a URL do Storage direto (bypass de CORS)
      if (doc.storageUrl) {
        window.open(doc.storageUrl, '_blank');
      } else {
        toast.error('Não foi possível baixar o documento.');
      }
    }
  };

  const handleGuiaSuggestion = (sugestao: GuiaTermoSuggestion) => {
    setTipo(sugestao.tipo);
    setAjuste(sugestao.ajuste || 0);
    if (sugestao.prorrogacao) setProrrogacao(sugestao.prorrogacao);
    setText(sugestao.minuta || sugestao.justificativa || '');
    setGuiaOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (contract && text.trim()) {
      onSave(
        contract.id, 
        text.trim(),
        tipo,
        ajuste, 
        vigenciaInicial, 
        prorrogacao,
        documents.length > 0 ? documents : undefined
      );
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setGuiaOpen(v => !v)}
            className={`absolute right-6 top-6 text-white border border-white/20 gap-2 text-xs font-bold uppercase h-8 ${guiaOpen ? 'bg-white/20' : 'hover:bg-white/10'}`}
          >
            GUIÁ
          </Button>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {guiaOpen && contract && (
            <div className="mb-4">
              <GuiaPanel
                mode="sugerir-termo"
                contract={contract}
                onTermoSuggestion={handleGuiaSuggestion}
              />
            </div>
          )}
          <div className="space-y-4">
            {contract?.termosAditivos && contract.termosAditivos.length > 0 && (
              <div className="bg-white p-4 rounded-lg border border-secti-border shadow-sm space-y-2">
                <h4 className="text-sm font-semibold text-gray-700">Termos Aditivos Anteriores</h4>
                <ul className="list-disc list-inside text-xs text-gray-600 max-h-32 overflow-y-auto">
                  {contract.termosAditivos.map((a: TermoAditivo, idx: number) => (
                    <li key={idx} className="mb-2">
                      <span className="font-mono">{formatDate(a.timestamp)}</span>
                      {a.tipo && (
                        <span className="ml-2 px-2 py-0.5 bg-[#0B2046]/10 text-[#0B2046] rounded text-[10px] font-semibold">
                          {formatTipo(a.tipo)}
                        </span>
                      )}
                      {' – '}{a.note}
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
                      {/* Mostrar documentos anexados */}
                      {a.documents && a.documents.length > 0 && (
                        <div className="ml-5 mt-1 space-y-1">
                          {a.documents.map((doc, docIdx) => (
                            <div key={docIdx} className="flex items-center gap-2 text-[11px]">
                              <FileText className="w-3 h-3 text-[#0B2046]" />
                              <span className="text-gray-600">{doc.name}</span>
                              {doc.storageUrl && (
                                <span className="text-[9px] text-blue-500 bg-blue-50 px-1 rounded" title={`Storage: ${doc.storagePath ?? ''}`}>Storage</span>
                              )}
                              <button
                                onClick={() => handleDownloadDocument(doc)}
                                className="text-blue-600 hover:text-blue-800 underline"
                                title="Baixar documento"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
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

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-secti-muted">Tipo de Termo Aditivo</label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="bg-gray-50 border-secti-border">
                  <SelectValue placeholder="Selecione o tipo (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prorrogacao">Prorrogação de Prazo</SelectItem>
                  <SelectItem value="acrescimo">Acréscimo de Valor</SelectItem>
                  <SelectItem value="supressao">Supressão de Valor</SelectItem>
                  <SelectItem value="termoRecisaoUnilateral">Termo de Recisão Unilateral</SelectItem>
                  <SelectItem value="termoRecisaoAmigavel">Termo de Recisão Amigável</SelectItem>
                  <SelectItem value="reajuste">Reajuste</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
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
                {tipo === 'supressao'
                  ? 'Supressão no valor do contrato'
                  : tipo === 'acrescimo'
                    ? 'Acréscimo no valor do contrato'
                    : tipo === 'reajuste'
                      ? 'Reajuste no valor do contrato'
                      : 'Ajuste no valor do contrato'}
              </label>
              <CurrencyInput
                className="bg-gray-50 border-secti-border font-mono"
                value={ajuste}
                onValueChange={(num) => setAjuste(num)}
                placeholder={tipo === 'supressao' ? 'Valor a suprimir (sempre positivo)' : '0,00'}
              />
              {tipo === 'supressao' && ajuste > 0 && contract && (
                <p className="text-[11px] text-red-600 font-medium">
                  Este valor será <strong>subtraído</strong> do valor atual do contrato.
                </p>
              )}
              {tipo === 'acrescimo' && ajuste > 0 && contract && (
                <p className="text-[11px] text-green-600 font-medium">
                  Este valor será <strong>somado</strong> ao valor atual do contrato.
                </p>
              )}
            </div>

            {/* Upload de Documentos */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-secti-muted">
                Documentos Anexos (PDF, DOC, DOCX)
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="document-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <label
                  htmlFor="document-upload"
                  className={`flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    uploading 
                      ? 'border-gray-300 bg-gray-100 cursor-not-allowed' 
                      : 'border-[#0B2046] bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <Upload className={`w-5 h-5 ${uploading ? 'text-gray-400' : 'text-[#0B2046]'}`} />
                  <span className={`text-sm font-medium ${uploading ? 'text-gray-400' : 'text-[#0B2046]'}`}>
                    {uploading ? 'Processando...' : 'Clique para selecionar arquivos'}
                  </span>
                </label>
              </div>
              <p className="text-[11px] text-gray-500">
                Tamanho máximo: {MAX_FILE_SIZE_MB} MB por arquivo. Os PDFs são
                comprimidos automaticamente antes de salvar para caber no Firestore.
              </p>

              {/* Lista de documentos anexados */}
              {documents.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-700">
                    Arquivos selecionados ({documents.length}) - {Math.round(documents.reduce((sum, doc) => sum + (doc.base64?.length || 0), 0) / 1024)}KB de {Math.round(MAX_TOTAL_SIZE_MB * 1024)}KB
                  </p>
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors group"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-[#0B2046] flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700 truncate">
                              {doc.name}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {formatFileSize(doc.size)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadDocument(doc)}
                            className="h-7 w-7 p-0 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Visualizar/Baixar"
                          >
                            <Download className="w-3.5 h-3.5 text-blue-600" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDocument(doc.id)}
                            className="h-7 w-7 p-0 hover:bg-red-50"
                            title="Remover"
                          >
                            <X className="w-3.5 h-3.5 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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