import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from './ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { formatDate, formatCurrency } from '../utils/contract-helpers';
import { Contract, HistoryEntry, HistoryChange, Apostila } from '../types/contract';
import { 
  FileSearch, 
  FilePlus,
  Info, 
  History, 
  User, 
  Clock, 
  Calendar, 
  DollarSign, 
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// firestore helpers used to resolve user avatars
import { db } from '../../firebase';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';

interface ContractDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract;
}

export function ContractDetailsModal({ isOpen, onClose, contract }: ContractDetailsModalProps) {
  // mapear nomes de campo do contrato para rótulos amigáveis
  const fieldLabels: Record<string, string> = {
    numeroContrato: 'Nº Contrato',
    empresa: 'Empresa',
    objeto: 'Objeto',
    gestor: 'Gestor',
    fiscal: 'Fiscal',
    situacao: 'Situação',
    vigenciaInicial: 'Início',
    vigenciaAtual: 'Vigência Atual',
    ultimoTermoAditivo: 'Último Termo Aditivo',
    valorInicial: 'Valor Inicial',
    valorAtual: 'Valor Atual',
    saldoDisponivel: 'Saldo Disponível',
    valorPagoAno: 'Pago em 2025',
    valorPagoAcumulado: 'Pago Acumulado',
    garantia: 'Garantia',
    numeroAcordoCooperacaoTecnica: 'Nº Acordo Coop.',
    numeroTermoCooperacaoTecnica: 'Nº Termo Coop.',
    numeroConvenio: 'Nº Convênio',
    convenente: 'Convenente',
    termoAdesao: 'Termo de Adesão',
    apostilas: 'Apostilas',
    // adicionar outros se necessário
  };

  // Estado para controlar quais itens do histórico estão expandidos (guarda os índices)
  const [expandedEntries, setExpandedEntries] = useState<number[]>([]);

  // cache of user photos keyed by normalized email
  const [userPhotos, setUserPhotos] = useState<Record<string,string>>({});

  // if we've migrated to subcollections the arrays on the document will be
  // empty; load the separate collections so we can display the full history
  const [remoteHistory, setRemoteHistory] = useState<HistoryEntry[]>([]);
  const [remoteApostilas, setRemoteApostilas] = useState<Apostila[]>([]);

  useEffect(() => {
    if (!isOpen || !contract?.id) return;
    async function loadSubs() {
      try {
        const histSnap = await getDocs(collection(db, 'contracts', contract.id, 'history'));
        setRemoteHistory(histSnap.docs.map((d) => d.data() as HistoryEntry));
      } catch (e) {
        // ignore missing collection / permission errors
      }
      try {
        const apSnap = await getDocs(collection(db, 'contracts', contract.id, 'apostilas'));
        setRemoteApostilas(apSnap.docs.map((d) => d.data() as Apostila));
      } catch (e) {}
    }
    loadSubs();
  }, [isOpen, contract.id]);

  // whenever the contract history changes we want to pre‑fetch the avatars for the
  // users involved.  the logic will batch the email lookups to avoid Firestore's
  // 10-element `in` query limit and store results in `userPhotos`.
  useEffect(() => {
    async function loadPhotos() {
      // combine inline history with any documents pulled from the subcollection
      const entries: HistoryEntry[] = [];
      if (contract.history) entries.push(...contract.history);
      if (remoteHistory) entries.push(...remoteHistory);
      if (entries.length === 0) return;

      const emailCandidates: string[] = [];
      const uidCandidates: string[] = [];
      entries.forEach((e) => {
        const u = e.user?.toString();
        if (!u) return;
        if (u.includes('@')) {
          emailCandidates.push(u.toLowerCase());
        } else {
          uidCandidates.push(u);
        }
      });

      const uniqueEmails = Array.from(new Set(emailCandidates));
      const uniqueUids = Array.from(new Set(uidCandidates));
      if (uniqueEmails.length === 0 && uniqueUids.length === 0) return;

      const results: Record<string,string> = {};

      try {
        // query by email in chunks
        for (let i = 0; i < uniqueEmails.length; i += 10) {
          const chunk = uniqueEmails.slice(i, i + 10);
          const q = query(collection(db, 'users'), where('email', 'in', chunk));
          const snap = await getDocs(q);
          snap.forEach((docSnap) => {
            const data = docSnap.data() as any;
            if (data.email && data.photoBase64) {
              const emailKey = data.email.toLowerCase();
              results[emailKey] = data.photoBase64;
              // also map by uid in case history contains the uid later
              if (data.uid) results[data.uid] = data.photoBase64;
            }
          });
        }

        // fetch individual uids that weren't covered above
        for (const uid of uniqueUids) {
          if (results[uid]) continue; // already got it via email query
          try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
              const data = userDoc.data() as any;
              if (data.photoBase64) {
                results[uid] = data.photoBase64;
                if (data.email) results[data.email.toLowerCase()] = data.photoBase64;
              }
            }
          } catch {
            // ignore individual failures
          }
        }

        setUserPhotos(results);
      } catch (permErr: any) {
        // permission errors are expected if firestore rules prevent reading
        // other user profiles.  simply log and continue with no avatars.
        console.warn('could not load user photos:', permErr.message || permErr);
      }
    }

    loadPhotos();
  }, [contract.history]);

  const toggleEntry = (idx: number) => {
    setExpandedEntries((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const renderHistory = () => {
    // merge inline array with remote collection entries; use latest first
    const allHistory: HistoryEntry[] = [];
    if (contract.history) allHistory.push(...contract.history);
    if (remoteHistory) allHistory.push(...remoteHistory);
    if (allHistory.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg border border-dashed border-gray-300">
          <History className="w-8 h-8 text-gray-300 mb-2" />
          <p className="text-sm text-secti-muted font-medium">Sem histórico de alterações disponível.</p>
        </div>
      );
    }

    return (
      <div className="relative border-l-2 border-gray-200 ml-3 pl-5 space-y-6 py-2">
        {allHistory
          .slice()
          .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
          .map((entry: HistoryEntry, idx: number) => {
            const isExpanded = expandedEntries.includes(idx);

            return (
              <div key={idx} className="relative">
                {/* Timeline Dot */}
                <div className="absolute -left-[29px] top-4 w-4 h-4 bg-white border-2 border-[#0B2046] rounded-full" />
                
                <div className="border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-all overflow-hidden">
                  
                  {/* Cabeçalho Clicável (Resumo) */}
                  <button
                    type="button"
                    onClick={() => toggleEntry(idx)}
                    className="w-full flex flex-wrap justify-between items-center p-4 hover:bg-gray-50 transition-colors text-left gap-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-2 text-xs text-secti-muted font-mono bg-gray-100 px-2 py-1 rounded">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(entry.timestamp)} às {new Date(entry.timestamp).toLocaleTimeString('pt-BR')}
                      </div>
                      {entry.user && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                          {(
                            // try direct key, lowercase key (for email) and finally old photo
                            userPhotos[entry.user.toString()] ||
                            userPhotos[entry.user.toString().toLowerCase()] ||
                            entry.userPhoto
                          ) ? (
                            <img
                              src={
                                userPhotos[entry.user.toString()] ||
                                userPhotos[entry.user.toString().toLowerCase()] ||
                                entry.userPhoto!
                              }
                              alt={entry.user}
                              className="w-4 h-4 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-3.5 h-3.5 text-gray-400" />
                          )}
                          {entry.user}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                        {entry.changes.length} alteraç{entry.changes.length === 1 ? 'ão' : 'ões'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>
                  
                  {/* Conteúdo Expandido (Detalhes) */}
                  {isExpanded && (
                    <div className="p-4 pt-0 border-t border-gray-100 bg-gray-50/50 animate-in slide-in-from-top-2 duration-200">
                      <ul className="space-y-2 mt-4">
                        {entry.changes.map((chg: HistoryChange, ci: number) => (
                          <li key={ci} className="text-sm flex flex-col sm:flex-row sm:items-center gap-2 bg-white p-2.5 rounded border border-gray-200 shadow-sm">
                            <strong className="capitalize text-gray-700 min-w-[140px] flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                              {(fieldLabels[chg.field] || chg.field)}:
                            </strong>
                            <div className="flex items-center gap-3 text-gray-600 flex-1 overflow-hidden">
                              <span 
                                className="line-through opacity-60 bg-red-50 text-red-700 px-1.5 rounded truncate max-w-[120px]" 
                                title={String(chg.before) || 'Vazio'}
                              >
                                {String(chg.before) || 'Vazio'}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                              <span 
                                className="truncate font-medium text-green-700 bg-green-50 px-1.5 rounded max-w-[120px]" 
                                title={String(chg.after)}
                              >
                                {String(chg.after)}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              </div>
            );
          })}
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl w-full border-l border-secti-border bg-[#F8FAFC] p-0 flex flex-col shadow-2xl">
        
        {/* HEADER */}
        <SheetHeader className="p-6 bg-[#0B2046] text-white shadow-md z-10">
          <SheetTitle className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <FileSearch className="w-6 h-6 text-[#00D1FF]" />
            Detalhes do {contract.tipoRegistro === 'convenio' ? 'Convênio' : 'Contrato'}
          </SheetTitle>
          <SheetDescription className="text-[#00D1FF]/80 font-mono text-xs uppercase tracking-widest mt-1">
            ID: {contract.id}
          </SheetDescription>
        </SheetHeader>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <Tabs defaultValue="resumo" className="w-full flex flex-col min-h-full">
            <TabsList className="w-full justify-start rounded-none border-b border-secti-border bg-white h-14 px-6 sticky top-0 z-10 shadow-sm">
              <TabsTrigger value="resumo" className="gap-2 text-sm data-[state=active]:text-secti-primary data-[state=active]:border-b-2 data-[state=active]:border-secti-primary pb-3 pt-4">
                <Info className="w-4 h-4" /> Resumo
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-2 text-sm data-[state=active]:text-secti-primary data-[state=active]:border-b-2 data-[state=active]:border-secti-primary pb-3 pt-4">
                <History className="w-4 h-4" /> Histórico
              </TabsTrigger>
            </TabsList>

            <div className="p-6">
              
              {/* ABA RESUMO */}
              <TabsContent value="resumo" className="space-y-6 m-0 animate-in fade-in duration-300">
                
                {/* Bloco: Identificação */}
                <div className="bg-white p-5 rounded-lg border border-secti-border shadow-sm space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-gray-400" /> Identificação
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase text-secti-muted tracking-wider">Número</span>
                      <p className="font-mono text-sm text-gray-900 font-medium bg-gray-50 px-3 py-1.5 rounded border border-gray-100">
                        {contract.numeroContrato || 'Não informado'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase text-secti-muted tracking-wider">
                        {contract.tipoRegistro === 'convenio' ? 'Convenente' : 'Empresa Contratada'}
                      </span>
                      <p className="text-sm text-gray-900 font-medium px-1">
                        {contract.empresa || contract.convenente || 'Não informado'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 pt-2">
                    <span className="text-[11px] font-bold uppercase text-secti-muted tracking-wider">Objeto</span>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md border border-gray-100 leading-relaxed">
                      {contract.objeto || 'Sem descrição.'}
                    </p>
                  </div>
                </div>

                {/* Bloco: Prazos e Responsáveis */}
                <div className="bg-white p-5 rounded-lg border border-secti-border shadow-sm space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" /> Prazos e Responsáveis
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase text-secti-muted tracking-wider">Gestor</span>
                      <p className="text-sm text-gray-800">{contract.gestor || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase text-secti-muted tracking-wider">Fiscal</span>
                      <p className="text-sm text-gray-800">{contract.fiscal || '-'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase text-secti-muted tracking-wider">Início</span>
                      <p className="text-sm font-mono text-gray-800">{formatDate(contract.vigenciaInicial)}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase text-secti-muted tracking-wider">Fim (Vigência Atual)</span>
                      <p className="text-sm font-mono text-gray-800">{formatDate(contract.vigenciaAtual)}</p>
                    </div>
                  </div>

                  {contract.ultimoTermoAditivo && (
                    <div className="space-y-1 pt-2 border-t border-gray-50">
                      <span className="text-[11px] font-bold uppercase text-secti-muted tracking-wider">Último Termo Aditivo</span>
                      <p className="whitespace-pre-line text-sm text-gray-600 bg-orange-50/50 p-3 rounded border border-orange-100">
                        {contract.ultimoTermoAditivo}
                      </p>
                    </div>
                  )}

                  {contract.apostilas && contract.apostilas.length > 0 && (
                    <div className="space-y-1 pt-4 border-t border-gray-50">
                      <span className="text-[11px] font-bold uppercase text-secti-muted tracking-wider flex items-center gap-1">
                        <FilePlus className="w-4 h-4 text-gray-400" /> Apostilas
                      </span>
                      <ul className="mt-2 space-y-2">
                        {contract.apostilas.map((a, idx) => (
                          <li key={idx} className="text-sm">
                            <span className="font-mono text-xs text-gray-600">
                              {formatDate(a.timestamp)}
                            </span>{' '}- {a.note}
                            {typeof a.ajuste === 'number' && a.ajuste !== 0 && (
                              <span className="ml-1 font-mono text-xs text-gray-500">
                                ({a.ajuste >= 0 ? '+' : ''}{formatCurrency(a.ajuste)})
                              </span>
                            )}{' '}
                            {a.user && <span className="text-gray-500 text-xs">({a.user})</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Bloco: Financeiro */}
                <div className="bg-white p-5 rounded-lg border border-secti-border shadow-sm space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" /> Resumo Financeiro
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase text-secti-muted tracking-wider">Valor Inicial</span>
                      <p className="font-mono text-sm text-gray-800 truncate max-w-[200px]">{formatCurrency(contract.valorInicial)}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase text-secti-muted tracking-wider">Pago em 2025</span>
                      <p className="font-mono text-sm text-gray-800 truncate max-w-[200px]">{formatCurrency(contract.valorPagoAno)}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase text-secti-muted tracking-wider">Pago Acumulado</span>
                      <p className="font-mono text-sm text-gray-800 truncate max-w-[200px]">{formatCurrency(contract.valorPagoAcumulado)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase text-secti-muted tracking-wider">Valor Atual do Contrato</span>
                      <p className="font-mono text-base font-semibold text-gray-900 truncate max-w-[220px]">{formatCurrency(contract.valorAtual)}</p>
                    </div>
                    <div className="space-y-1 bg-green-50 p-3 rounded-md border border-green-200">
                      <span className="text-[11px] font-bold uppercase text-green-800 tracking-wider">Saldo Disponível</span>
                      <p className="font-mono text-lg font-bold text-green-700 truncate max-w-[220px]">{formatCurrency(contract.saldoDisponivel)}</p>
                    </div>
                  </div>
                </div>

              </TabsContent>

              {/* ABA HISTÓRICO */}
              <TabsContent value="historico" className="m-0 animate-in fade-in duration-300">
                <div className="bg-white p-5 rounded-lg border border-secti-border shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-4 mb-4">Registro de Modificações</h3>
                  {renderHistory()}
                </div>
              </TabsContent>
              
            </div>
          </Tabs>
        </div>

        {/* FOOTER */}
        <SheetFooter className="p-6 bg-white border-t border-secti-border mt-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="w-full border-gray-300 text-gray-700 uppercase text-xs font-bold hover:bg-gray-50 h-11 transition-colors"
          >
            Fechar Detalhes
          </Button>
        </SheetFooter>

      </SheetContent>
    </Sheet>
  );
}