import { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  Search,
  LogOut,
  LayoutDashboard,
  User,
  HelpCircle,
  BarChart3,
  Bell,
} from 'lucide-react';
// KPI cards were replaced by a tabbed filter control
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { ContractsTable } from './components/ContractsTable';
import { ContractModal } from './components/ContractModal';
import { ContractDetailsModal } from './components/ContractDetailsModal';
import { ApostilaModal } from './components/ApostilaModal';
import { TermoAditivoModal } from './components/TermoAditivoModal';
import { Login } from './components/Login';
import { ProfilePage } from './components/ProfilePage';
import { TutorialModal } from './components/TutorialModal';
import { NotificationCenter } from './components/NotificationCenter';
import { Dashboard } from './components/Dashboard';
import { AdvancedFiltersPanel, AdvancedFilters } from './components/AdvancedFilters';
import { BulkActions } from './components/BulkActions';
import { SessionManager } from './components/SessionManager';
import { HelpPanel } from './components/HelpSystem';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from './components/ui/sidebar';
import { Contract } from './types/contract';
import { UserProfile } from './types/user';
import { getContractStatus, computeChanges } from './utils/contract-helpers';
import { Toaster, toast } from 'sonner';

import { auth, db, addUser, subscribeUser } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendEmailVerification,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  arrayUnion,
} from 'firebase/firestore';

type FilterType = 'Todos' | '<15' | '<30' | '<60' | '<90';
type ViewMode = 'dashboard' | 'charts' | 'profile';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const creatingUserRef = useRef(false);

  const [currentPage, setCurrentPage] = useState<ViewMode>('dashboard');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('Todos');
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({});
  const [selectedContractIds, setSelectedContractIds] = useState<Set<string>>(new Set());
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  // the tabs component uses string values matching the FilterType union
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | undefined>();

  const [viewingContract, setViewingContract] = useState<Contract | undefined>();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // tutorial modal (accessible from sidebar)
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  // apostila modal state (only for CCC users)
  const [apostilaContract, setApostilaContract] = useState<Contract | null>(null);
  const [isApostilaOpen, setIsApostilaOpen] = useState(false);

  useEffect(() => {
    let unsubUser: (() => void) | undefined;

    if (isSignInWithEmailLink(auth, window.location.href)) {
      let storedEmail = window.localStorage.getItem('emailForSignIn') || '';
      if (!storedEmail) {
        storedEmail = window.prompt('Confirme seu e‑mail para concluir o login via link:') || '';
      }
      if (storedEmail) {
        signInWithEmailLink(auth, storedEmail, window.location.href)
          .then(() => {
            window.localStorage.removeItem('emailForSignIn');
            toast.success('Autenticado via link!');
          })
          .catch((err) => {
            console.error(err);
            const msg = translateAuthError(err.code, 'Falha no login via link.');
            toast.error(msg);
          });
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !user.emailVerified && !creatingUserRef.current) {
        await signOut(auth);
        setIsAuthenticated(false);
        return;
      }

      setIsAuthenticated(!!user);
      if (user) {
        unsubUser = subscribeUser(user.uid, setUserProfile);
      } else {
        setUserProfile(null);
        if (unsubUser) unsubUser();
      }
    });
    return () => {
      unsubscribe();
      if (unsubUser) unsubUser();
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const q = collection(db, 'contracts');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Contract[] = snapshot.docs.map((d) => {
        const raw: any = { id: d.id, ...(d.data() as any) };
        // migrate legacy single-string apostila into new array structure
        if (raw.apostila && !raw.apostilas) {
          raw.apostilas = [
            {
              timestamp: '',
              note: raw.apostila,
            },
          ];
        }
        return raw as Contract;
      });
      setContracts(data);
    });
    return unsubscribe;
  }, [isAuthenticated]);

  const kpis = useMemo(() => {
    let less15 = 0;
    let less30 = 0;
    let less60 = 0;
    let less90 = 0;

    for (const c of contracts) {
      const status = getContractStatus(c);
      const days = status.daysRemaining;
      if (days < 15 || status.type === 'expired') {
        less15++;
      } else if (days < 30) {
        less30++;
      } else if (days < 60) {
        less60++;
      } else if (days < 90) {
        less90++;
      }
    }

    return { total: contracts.length, less15, less30, less60, less90 };
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    let filtered = contracts;

    if (activeFilter !== 'Todos') {
      filtered = filtered.filter((contract) => {
        const status = getContractStatus(contract);
        const days = status.daysRemaining;
        switch (activeFilter) {
          case '<15':
            return days < 15 || status.type === 'expired';
          case '<30':
            return days < 30 && days >= 15;
          case '<60':
            return days < 60 && days >= 30;
          case '<90':
            return days < 90 && days >= 60;
          default:
            return true;
        }
      });
    }

    // Filtros avançados
    if (advancedFilters.tipoRegistro && advancedFilters.tipoRegistro !== 'todos') {
      filtered = filtered.filter(c => c.tipoRegistro === advancedFilters.tipoRegistro);
    }

    if (advancedFilters.situacao && advancedFilters.situacao !== 'todos') {
      filtered = filtered.filter(c => c.situacao === advancedFilters.situacao);
    }

    if (advancedFilters.gestor) {
      filtered = filtered.filter(c => 
        c.gestor?.toLowerCase().includes(advancedFilters.gestor!.toLowerCase())
      );
    }

    if (advancedFilters.fiscal) {
      filtered = filtered.filter(c => 
        c.fiscal?.toLowerCase().includes(advancedFilters.fiscal!.toLowerCase())
      );
    }

    if (advancedFilters.empresa || advancedFilters.convenente) {
      const termo = (advancedFilters.empresa || advancedFilters.convenente || '').toLowerCase();
      filtered = filtered.filter(c => 
        c.empresa?.toLowerCase().includes(termo) || c.convenente?.toLowerCase().includes(termo)
      );
    }

    if (advancedFilters.valorMin !== undefined) {
      filtered = filtered.filter(c => (c.valorAtual || 0) >= advancedFilters.valorMin!);
    }

    if (advancedFilters.valorMax !== undefined) {
      filtered = filtered.filter(c => (c.valorAtual || 0) <= advancedFilters.valorMax!);
    }

    if (advancedFilters.diasVencimentoMin !== undefined || advancedFilters.diasVencimentoMax !== undefined) {
      filtered = filtered.filter(c => {
        const status = getContractStatus(c);
        const days = status.daysRemaining;
        if (advancedFilters.diasVencimentoMin !== undefined && days < advancedFilters.diasVencimentoMin) {
          return false;
        }
        if (advancedFilters.diasVencimentoMax !== undefined && days > advancedFilters.diasVencimentoMax) {
          return false;
        }
        return true;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (contract) =>
          contract.empresa.toLowerCase().includes(query) ||
          contract.numeroContrato.toLowerCase().includes(query) ||
          contract.objeto.toLowerCase().includes(query) ||
          contract.gestor.toLowerCase().includes(query) ||
          contract.fiscal.toLowerCase().includes(query) ||
          (contract.convenente ? contract.convenente.toLowerCase().includes(query) : false) ||
          (contract.numeroConvenio ? contract.numeroConvenio.toLowerCase().includes(query) : false) ||
          (contract.numeroAcordoCooperacaoTecnica ? contract.numeroAcordoCooperacaoTecnica.toLowerCase().includes(query) : false) ||
          (contract.numeroTermoCooperacaoTecnica ? contract.numeroTermoCooperacaoTecnica.toLowerCase().includes(query) : false) ||
          (contract.apostilas ? contract.apostilas.some(a => a.note.toLowerCase().includes(query)) : false)
      );
    }

    return filtered;
  }, [contracts, activeFilter, searchQuery, advancedFilters]);

  // Extrair gestores e fiscais únicos para os filtros
  const uniqueGestores = useMemo(() => {
    const set = new Set<string>();
    contracts.forEach(c => {
      if (c.gestor) set.add(c.gestor);
    });
    return Array.from(set).sort();
  }, [contracts]);

  const uniqueFiscais = useMemo(() => {
    const set = new Set<string>();
    contracts.forEach(c => {
      if (c.fiscal) set.add(c.fiscal);
    });
    return Array.from(set).sort();
  }, [contracts]);

  const handleSaveContract = async (contractData: Partial<Contract>) => {
    try {
      // ensure editor array is updated with current user email
      const editorEmail = userProfile?.email?.toLowerCase();

      if (editingContract) {
        const ref = doc(db, 'contracts', editingContract.id);
        // merge incoming values with existing contract
        const after: Contract = { ...editingContract, ...contractData } as Contract;

        // add current user to emailEditor if not already present
        if (editorEmail) {
          const list = after.emailEditor ? [...after.emailEditor] : [];
          if (!list.includes(editorEmail)) {
            list.push(editorEmail);
          }
          after.emailEditor = list;
        }

        const changes = computeChanges(editingContract, after);
        if (changes.length > 0) {
          const entry: any = {
            timestamp: new Date().toISOString(),
            // prefer email and always lowercase so we can match easily later
            user: userProfile?.email?.toLowerCase() || userProfile?.uid || undefined,
            // do not save photo on each entry any more
            changes,
          };
          // build bounded history array rather than arrayUnion so we can trim
          let historyToWrite: any = entry;
          if (editingContract.history) {
            const harr = [...editingContract.history, entry];
            historyToWrite = harr.slice(-MAX_HISTORY_ENTRIES);
          }
          await updateDoc(ref, {
            ...contractData,
            // also store the modified editor list
            ...(after.emailEditor ? { emailEditor: after.emailEditor } : {}),
            history: historyToWrite,
          } as any);
          toast.success('Sincronização concluída: Registro atualizado.');
        } else {
          toast.info('Nenhuma alteração detectada.');
        }
      } else {
        const newContract: any = { ...contractData, history: [], apostilasCount: 0 };
        if (userProfile) {
          const nameOrEmail = userProfile.displayName || userProfile.email;
          if (userProfile.role === 'gestor') newContract.gestor = nameOrEmail;
          if (userProfile.role === 'fiscal') newContract.fiscal = nameOrEmail;
        }

        // initial editor list should include creator
        if (editorEmail) {
          newContract.emailEditor = [editorEmail];
        }

        const changes = computeChanges(null, newContract);
        const createdEntry: any = {
          timestamp: new Date().toISOString(),
          user: userProfile?.email?.toLowerCase() || userProfile?.uid || undefined,
          // no photo stored here anymore
          changes,
        };
        newContract.history = [createdEntry];
        await addDoc(collection(db, 'contracts'), newContract);
        toast.success('Novo registro integrado com sucesso.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Falha ao salvar no banco de dados.');
    }

    setEditingContract(undefined);
  };


  const handleAddApostilaClick = (c: Contract) => {
    setApostilaContract(c);
    setIsApostilaOpen(true);
  };

  // new: support termoaditivo modal
  const [isTermoAditivoOpen, setIsTermoAditivoOpen] = useState(false);
  const [termoAditivoContract, setTermoAditivoContract] = useState<Contract | null>(null);

  const handleAddTermoAditivoClick = (c: Contract) => {
    setTermoAditivoContract(c);
    setIsTermoAditivoOpen(true);
  };

  // keep arrays trimmed so the document remains under Firestore's 1 MB limit
  const MAX_HISTORY_ENTRIES = 300;
  const MAX_APOSTILAS = 200;

  const handleSaveApostila = async (id: string, note: string, ajuste: number = 0) => {
    try {
      if (!apostilaContract) return;
      const ref = doc(db, 'contracts', id);
      const current = apostilaContract;
      const newEntry: any = {
        timestamp: new Date().toISOString(),
        user: userProfile?.email?.toLowerCase() || userProfile?.uid || undefined,
        note,
      };
      if (ajuste && ajuste !== 0) {
        newEntry.ajuste = ajuste;
      }

      // apply adjustment to contract values
      // POSITIVE adjustment: increases VALOR ATUAL (term addendum)
      // NEGATIVE adjustment: increases VALOR PAGO ACUMULADO (payment/deduction)
      let novoValorAtual = current.valorAtual || 0;
      let novoValorPagoAcumulado = current.valorPagoAcumulado || 0;

      if (ajuste > 0) {
        novoValorAtual += ajuste;
      } else if (ajuste < 0) {
        novoValorPagoAcumulado += -ajuste;
      }

      // round to 2 decimal places to avoid floating-point precision errors
      const novoSaldo = Math.round((novoValorAtual - novoValorPagoAcumulado) * 100) / 100;

      // build new apostilas list and trim if necessary
      let newApostilas = [...(current.apostilas || []), newEntry];
      if (newApostilas.length > MAX_APOSTILAS) {
        newApostilas = newApostilas.slice(-MAX_APOSTILAS);
      }

      const updated: Contract = {
        ...current,
        valorAtual: novoValorAtual,
        valorPagoAcumulado: novoValorPagoAcumulado,
        saldoDisponivel: novoSaldo,
        apostilas: newApostilas,
      };

      // compute minimal change log; computeChanges now ignores apostilas/history
      const changes = computeChanges(current, updated);

      // we still want to note that an apostila was added so auditors can see counts
      changes.push({
        field: 'apostilas',
        before: current.apostilas ? current.apostilas.length : 0,
        after: newApostilas.length,
      });

      const historyEntry: any = {
        timestamp: new Date().toISOString(),
        user: userProfile?.email?.toLowerCase() || userProfile?.uid || null,
        changes,
      };

      // when appending history we can't trim with arrayUnion; read existing history
      // then replace whole field so we can keep it bounded
      let historyToWrite: any = historyEntry;
      if (current.history) {
        const arr = [...current.history, historyEntry];
        historyToWrite = arr.slice(-MAX_HISTORY_ENTRIES);
      }

      await updateDoc(ref, {
        valorAtual: updated.valorAtual,
        valorPagoAcumulado: updated.valorPagoAcumulado,
        saldoDisponivel: updated.saldoDisponivel,
        apostilas: newApostilas,
        apostilasCount: newApostilas.length,
        history: historyToWrite,
      } as any);
      toast.success('Apostila registrada com sucesso.');
      setApostilaContract(null);
    } catch (err) {
      console.error(err);
      toast.error('Falha ao salvar apostila.');
    }
  };

  // handler for termo aditivo entries
  const handleSaveTermoAditivo = async (
    id: string,
    note: string,
    ajuste: number = 0,
    vigenciaInicial?: string,
    prorrogacao?: string
  ) => {
    try {
      if (!termoAditivoContract) return;
      const ref = doc(db, 'contracts', id);
      const current = termoAditivoContract;
      const newEntry: any = {
        timestamp: new Date().toISOString(),
        user: userProfile?.email?.toLowerCase() || userProfile?.uid || undefined,
        note,
        originalVigencia: current.vigenciaAtual || undefined,
      };
      if (ajuste && ajuste !== 0) {
        newEntry.ajuste = ajuste;
      }
      if (vigenciaInicial) newEntry.vigenciaInicial = vigenciaInicial;
      if (prorrogacao) newEntry.prorrogacao = prorrogacao;

      // termoaditivo always increases valorAtual
      let novoValorAtual = current.valorAtual || 0;
      if (ajuste > 0) {
        novoValorAtual += ajuste;
      }
      const novoSaldo = Math.round((novoValorAtual - (current.valorPagoAcumulado || 0)) * 100) / 100;

      let newTermos = [...(current.termosAditivos || []), newEntry];
      // we may want to keep list bounded, reuse same MAX_APOSTILAS for simplicity
      if (newTermos.length > MAX_APOSTILAS) {
        newTermos = newTermos.slice(-MAX_APOSTILAS);
      }

      const updated: Contract = {
        ...current,
        valorAtual: novoValorAtual,
        saldoDisponivel: novoSaldo,
        termosAditivos: newTermos,
      };
      if (vigenciaInicial) updated.vigenciaInicial = vigenciaInicial;
      if (prorrogacao) {
        updated.vigenciaAtual = prorrogacao; // apply extension to contract itself
      }

      const changes = computeChanges(current, updated);
      changes.push({
        field: 'termosAditivos',
        before: current.termosAditivos ? current.termosAditivos.length : 0,
        after: newTermos.length,
      });

      const historyEntry: any = {
        timestamp: new Date().toISOString(),
        user: userProfile?.email?.toLowerCase() || userProfile?.uid || null,
        changes,
      };

      let historyToWrite: any = historyEntry;
      if (current.history) {
        const arr = [...current.history, historyEntry];
        historyToWrite = arr.slice(-MAX_HISTORY_ENTRIES);
      }

      const payload: any = {
        valorAtual: updated.valorAtual,
        saldoDisponivel: updated.saldoDisponivel,
        termosAditivos: updated.termosAditivos,
        history: historyToWrite,
      };
      if (vigenciaInicial) payload.vigenciaInicial = vigenciaInicial;
      if (prorrogacao) payload.vigenciaAtual = prorrogacao;
      await updateDoc(ref, payload as any);

      // also update local state so UI reflects change immediately
      setContracts((prev) => prev.map((c) => (c.id === id ? updated : c)));
      if (termoAditivoContract && termoAditivoContract.id === id) {
        setTermoAditivoContract(updated);
      }

      toast.success('Termo aditivo registrado com sucesso.');
    } catch (err) {
      console.error(err);
      toast.error('Falha ao salvar termo aditivo.');
    }
  };

  function translateAuthError(code: string | undefined, defaultMsg: string) {
    switch (code) {
      case 'auth/invalid-email': return 'Formato de e‑mail inválido.';
      case 'auth/user-disabled': return 'Conta de usuário desabilitada.';
      case 'auth/user-not-found': return 'Usuário não encontrado.';
      case 'auth/wrong-password': return 'Senha incorreta.';
      case 'auth/email-already-in-use': return 'E‑mail já está em uso.';
      case 'auth/weak-password': return 'Senha muito fraca (mínimo 6 caracteres).';
      case 'auth/operation-not-allowed': return 'Operação não permitida. Contate o administrador.';
      case 'auth/too-many-requests': return 'Muitas tentativas. Aguarde alguns minutos.';
      default: return defaultMsg;
    }
  }

  const handleLogin = async (email: string, password: string) => {
    if (!email || !password) {
      toast.error('Por favor informe e‑mail e senha');
      return;
    }
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (cred.user && !cred.user.emailVerified) {
        await sendEmailVerification(cred.user);
        await signOut(auth);
        toast.error('Sua conta ainda não foi verificada. Enviamos um e‑mail com instruções, confira sua caixa de entrada.');
        return;
      }
      toast.success('Autenticado com sucesso.');
    } catch (err: any) {
      console.error(err);
      const msg = translateAuthError(err.code, 'Falha na autenticação.');
      toast.error(msg);
    }
  };

  const emailExists = async (email: string): Promise<boolean> => {
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      return methods && methods.length > 0;
    } catch (err) {
      console.error('error fetching methods for email', err);
      return false;
    }
  };

  const handleForgotPassword = async (email: string) => {
    try {
      const exists = await emailExists(email);
      if (!exists) {
        toast.error('Nenhuma conta encontrada para o e‑mail informado.');
        return;
      }
      await sendPasswordResetEmail(auth, email);
      toast.success('Link de recuperação enviado. Verifique sua caixa de entrada.');
    } catch (err: any) {
      console.error(err);
      const msg = translateAuthError(err.code, 'Falha ao enviar e-mail de recuperação.');
      toast.error(msg);
    }
  };

  const handleSendEmailLink = async (email: string) => {
    try {
      const exists = await emailExists(email);
      if (!exists) {
        toast.error('Nenhuma conta encontrada para o e‑mail informado.');
        return;
      }
      const actionCodeSettings = {
        url: window.location.origin,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      toast.success('Link de acesso enviado. Verifique seu e‑mail institucional.');
    } catch (err: any) {
      console.error(err);
      const msg = translateAuthError(err.code, 'Falha ao enviar link de acesso.');
      toast.error(msg);
    }
  };

  const handleRegister = async (
    username: string,
    email: string,
    password: string,
    role: 'gestor' | 'fiscal' | 'ccc',
    photoBase64: string,
    phone?: string,
    department?: string
  ) => {
    creatingUserRef.current = true;
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      if (userCred.user) {
        await sendEmailVerification(userCred.user);
      }
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: username });
      }
      try {
        await addUser({
          uid: userCred.user.uid,
          // store email consistently as lowercase so lookups are easy
          email: userCred.user.email?.toLowerCase(),
          displayName: username,
          role,
          photoBase64,
          phone,
          department,
          createdAt: new Date().toISOString(),
        });
      } catch (fireErr) {
        console.error('Erro ao criar usuário no Firestore', fireErr);
      }
      await signOut(auth);
      toast.success(
        `Conta criada como ${role === 'gestor' ? 'Gestor' : 'Fiscal'}. Verifique seu e‑mail para ativar a conta.`
      );
    } catch (err: any) {
      console.error(err);
      const msg = translateAuthError(err.code, 'Falha ao criar conta.');
      toast.error(msg);
    } finally {
      creatingUserRef.current = false;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentPage('dashboard');
      setUserProfile(null);
      toast.success('Desconectado com sucesso.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao sair.');
    }
  };

  // Handlers para seleção em lote
  const handleSelectionChange = (id: string, selected: boolean) => {
    setSelectedContractIds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleBulkExport = async () => {
    const selectedContracts = contracts.filter(c => selectedContractIds.has(c.id));
    const { exportContractsToExcel } = await import('./utils/excel');
    exportContractsToExcel(selectedContracts);
    toast.success(`${selectedContracts.length} contratos exportados!`);
  };

  const handleClearSelection = () => {
    setSelectedContractIds(new Set());
  };

  // Helper para nome no Header
  const firstName = userProfile?.displayName?.split(' ')[0] || 'Usuário';

  return (
    <>
      <Toaster position="top-right" richColors />
      {!isAuthenticated ? (
        <Login
          onLogin={handleLogin}
          onRegister={handleRegister}
          onForgotPassword={handleForgotPassword}
          onSendEmailLink={handleSendEmailLink}
        />
      ) : (
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-[#F8FAFC]">
            
            {/* SIDEBAR */}
            <Sidebar className="bg-[#0B2046] border-r border-secti-border shadow-lg">
              <SidebarContent className="bg-[#0B2046] text-white">
                <div className="flex flex-col items-center">
                  <img
                    src="/sectilogo.svg"
                    alt="Logo SECTI"
                    className=" h-auto mb-2"
                  />
                </div>
                
                <SidebarGroup className="mt-2 sm:mt-4">
                  <SidebarGroupLabel className="text-white/40 text-[10px] uppercase font-bold px-4 sm:px-6 mb-2">
                    Navegação Principal
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="space-y-1">
                      
                      {/* Item: Dashboard */}
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => setCurrentPage('dashboard')}
                          className={`px-4 sm:px-6 h-12 transition-all text-white gap-3 rounded-none border-l-4 ${
                            currentPage === 'dashboard' 
                              ? 'bg-[#0056B3]/40 border-[#00D1FF] font-semibold' 
                              : 'border-transparent hover:bg-white/5 font-medium'
                          }`}
                        >
                          <LayoutDashboard className={`w-5 h-5 ${currentPage === 'dashboard' ? 'text-[#00D1FF]' : 'text-white/70'}`} />
                          <span className="flex items-center justify-between flex-1">
                            Painel Geral
                            {kpis.less15 > 0 && (
                              <Badge className="bg-red-600 text-white ml-2">{kpis.less15}</Badge>
                            )}
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      {/* Item: Gráficos */}
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => setCurrentPage('charts')}
                          className={`px-4 sm:px-6 h-12 transition-all text-white gap-3 rounded-none border-l-4 ${
                            currentPage === 'charts' 
                              ? 'bg-[#0056B3]/40 border-[#00D1FF] font-semibold' 
                              : 'border-transparent hover:bg-white/5 font-medium'
                          }`}
                        >
                          <BarChart3 className={`w-5 h-5 ${currentPage === 'charts' ? 'text-[#00D1FF]' : 'text-white/70'}`} />
                          <span>Dashboard Visual</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      {/* Item: Novo Registro (disponível para todos os perfis, incluindo CCC) */}
                      {userProfile &&
                        (userProfile.role === 'gestor' ||
                          userProfile.role === 'fiscal' ||
                          userProfile.role === 'ccc') && (
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            onClick={() => { setEditingContract(undefined); setIsModalOpen(true); }}
                            className="px-4 sm:px-6 h-12 hover:bg-white/5 transition-all text-white gap-3 rounded-none border-l-4 border-transparent font-medium group"
                          >
                            <Plus className="w-5 h-5 text-white/70 group-hover:text-[#00D1FF] transition-colors" />
                            <span>Novo Registro</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}

                      {/* Item: Perfil */}
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => setCurrentPage('profile')}
                          className={`px-4 sm:px-6 h-12 transition-all text-white gap-3 rounded-none border-l-4 ${
                            currentPage === 'profile' 
                              ? 'bg-[#0056B3]/40 border-[#00D1FF] font-semibold' 
                              : 'border-transparent hover:bg-white/5 font-medium'
                          }`}
                        >
                          <User className={`w-5 h-5 ${currentPage === 'profile' ? 'text-[#00D1FF]' : 'text-white/70'}`} />
                          <span>Meu Perfil</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      {/* Item: Tutorial (sempre visível) */}
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => setIsTutorialOpen(true)}
                          className="px-4 sm:px-6 h-12 hover:bg-white/5 transition-all text-white gap-3 rounded-none border-l-4 border-transparent font-medium group"
                        >
                          <HelpCircle className="w-5 h-5 text-white/70 group-hover:text-[#00D1FF] transition-colors" />
                          <span>Tutorial</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>

                <div className="mt-auto p-4 border-t border-white/10">
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full justify-start text-white/70 hover:text-white hover:bg-red-500/20 gap-3 rounded-md"
                  >
                    <LogOut className="w-4 h-4" /> 
                    Sair do Sistema
                  </Button>
                </div>
              </SidebarContent>
            </Sidebar>

            {/* MAIN CONTENT */}
            <main className="flex-1 overflow-y-auto flex flex-col w-full relative">
              {/* Session Manager */}
              <SessionManager 
                inactivityTimeout={30}
                warningTime={60}
                onSessionExpired={() => setIsAuthenticated(false)}
              />

              {/* Help Panel */}
              <HelpPanel isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

              {currentPage === 'profile' ? (
                <div className="animate-in fade-in duration-300 h-full">
                  <ProfilePage profile={userProfile} onBackToDashboard={() => setCurrentPage('dashboard')} />
                </div>
              ) : currentPage === 'charts' ? (
                <div className="animate-in fade-in duration-300 h-full">
                  <Dashboard contracts={contracts} />
                </div>
              ) : (
                <div className="flex flex-col min-h-full animate-in fade-in duration-300">
                  
                  {/* HEADER */}
                  <header className="bg-white border-b border-secti-border h-[72px] flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-10 shadow-sm shrink-0">
                    <div className="flex items-center gap-3">
                      <SidebarTrigger className="md:hidden text-[#0B2046]" />
                      <div>
                        <h1 className="text-lg sm:text-xl font-bold text-[#0B2046] tracking-tight">Painel Geral</h1>
                        <p className="text-[10px] sm:text-xs text-gray-500 font-medium mt-0.5">Gestão unificada de contratos e convênios</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Notificações */}
                      <NotificationCenter 
                        contracts={contracts}
                        currentUserUid={userProfile?.uid}
                        onContractClick={(contract) => {
                          setViewingContract(contract);
                          setIsDetailsOpen(true);
                        }}
                      />

                      {/* Ajuda */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsHelpOpen(true)}
                        className="hover:bg-gray-100"
                        aria-label="Ajuda"
                      >
                        <HelpCircle className="w-5 h-5" />
                      </Button>

                      {userProfile && (
                        <div
                          className="flex items-center gap-2 bg-gray-50 px-2 sm:px-3 py-1.5 rounded-full border border-gray-100 cursor-pointer"
                          role="button"
                          onClick={() => setCurrentPage('profile')}
                        >
                          <span className="hidden sm:inline text-sm text-gray-600">Olá, <strong className="text-[#0B2046]">{firstName}</strong></span>
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden flex items-center justify-center bg-[#00D1FF]/20">
                            {userProfile.photoBase64 ? (
                              <img
                                src={userProfile.photoBase64}
                                alt="avatar"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[#0B2046] text-[10px] sm:text-xs font-bold">
                                {firstName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </header>

                  {/* DASHBOARD BODY */}
                  <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto flex-1 flex flex-col">
                    
                    {/* FILTER TABS – more compact and modern alternative to KPI cards */}
                    <div className="w-full overflow-x-auto pb-2 mb-4 sm:mb-6 scrollbar-hide">
                      <Tabs
                        value={activeFilter}
                        onValueChange={(val) => setActiveFilter(val as FilterType)}
                        className="w-min sm:w-full"
                      >
                        <TabsList className="flex w-fit sm:w-full justify-start flex-nowrap h-10">
                          <TabsTrigger value="Todos" className="whitespace-nowrap">
                            Todos <Badge className="ml-1" variant="outline">{kpis.total}</Badge>
                          </TabsTrigger>
                          <TabsTrigger value="<15" className="whitespace-nowrap">
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            <span className="flex items-center">
                              &lt;15 <Badge className="ml-1" variant="destructive">{kpis.less15}</Badge>
                            </span>
                          </TabsTrigger>
                          <TabsTrigger value="<30" className="whitespace-nowrap">
                            <Clock className="w-4 h-4 mr-1" />
                            <span className="flex items-center">
                              &lt;30 <Badge className="ml-1 bg-orange-100 text-orange-700" variant="outline">{kpis.less30}</Badge>
                            </span>
                          </TabsTrigger>
                          <TabsTrigger value="<60" className="whitespace-nowrap">
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            <span className="flex items-center">
                              &lt;60 <Badge className="ml-1 bg-green-100 text-green-700" variant="outline">{kpis.less60}</Badge>
                            </span>
                          </TabsTrigger>
                          <TabsTrigger value="<90" className="whitespace-nowrap">
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            <span className="flex items-center">
                              &lt;90 <Badge className="ml-1 bg-green-100 text-green-700" variant="outline">{kpis.less90}</Badge>
                            </span>
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    {/* SEARCH / FILTER PANEL */}
                    <div className="bg-white p-4 sm:p-5 rounded-lg border border-secti-border shadow-sm mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                      <div className="relative w-full sm:max-w-xl">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Pesquisar por empresa, contrato, convênio..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 h-11 w-full border-gray-200 bg-gray-50 focus:bg-white focus:ring-1 focus:ring-[#00D1FF] transition-colors rounded-md text-sm"
                        />
                      </div>
                      <AdvancedFiltersPanel
                        filters={advancedFilters}
                        onFiltersChange={setAdvancedFilters}
                        gestores={uniqueGestores}
                        fiscais={uniqueFiscais}
                      />
                    </div>

                    {/* TABLE AREA */}
                    <div className="bg-white rounded-lg border border-secti-border shadow-sm overflow-x-auto w-full">
                      <div className="min-w-[800px]">
                        <ContractsTable
                          contracts={filteredContracts}
                          onEdit={
                            userProfile &&
                            (userProfile.role === 'gestor' || userProfile.role === 'fiscal' || userProfile.role === 'ccc')
                              ? (c) => { setEditingContract(c); setIsModalOpen(true); }
                              : undefined
                          }
                          onView={(c) => { setViewingContract(c); setIsDetailsOpen(true); }}
                          onAddApostila={
                            userProfile?.role === 'ccc' ? handleAddApostilaClick : undefined
                          }
                          onAddTermoAditivo={
                            userProfile && (userProfile.role === 'ccc' || userProfile.role === 'gestor' || userProfile.role === 'fiscal')
                              ? handleAddTermoAditivoClick
                              : undefined
                          }
                        />
                      </div>
                    </div>

                    {/* Bulk Actions */}
                    <BulkActions
                      selectedCount={selectedContractIds.size}
                      onExport={handleBulkExport}
                      onClearSelection={handleClearSelection}
                    />
                  </div>
                </div>
              )}
            </main>

            {/* MODALS */}
            <ContractModal
              isOpen={isModalOpen}
              onClose={() => { setIsModalOpen(false); setEditingContract(undefined); }}
              onSave={handleSaveContract}
              contract={editingContract}
              currentUser={
                userProfile && (userProfile.role === 'gestor' || userProfile.role === 'fiscal')
                  ? {
                      email: userProfile.email,
                      role: userProfile.role,
                      displayName: userProfile.displayName,
                    }
                  : undefined
              } 
              onAddTermoAditivo={
                userProfile?.role === 'ccc' ? handleAddTermoAditivoClick : undefined
              }
            />
            <ApostilaModal
              isOpen={isApostilaOpen}
              onClose={() => setIsApostilaOpen(false)}
              contract={apostilaContract}
              onSave={handleSaveApostila}
            />

            <TermoAditivoModal
              isOpen={isTermoAditivoOpen}
              onClose={() => setIsTermoAditivoOpen(false)}
              contract={termoAditivoContract}
              onSave={handleSaveTermoAditivo}
            />

            {/* tutorial modal for authenticated users */}
            <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />

            {viewingContract && (
              <ContractDetailsModal
                isOpen={isDetailsOpen}
                onClose={() => {
                  setIsDetailsOpen(false);
                  setViewingContract(undefined);
                }}
                contract={viewingContract}
              />
            )}
          </div>
        </SidebarProvider>
      )}
    </>
  );
}

export default App;