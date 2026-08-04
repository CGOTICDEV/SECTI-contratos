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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
// KPI cards were replaced by a tabbed filter control
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { ContractsTable } from './components/ContractsTable';
import { ContractModal } from './components/ContractModal';
import { ContractDetailsModal } from './components/ContractDetailsModal';
import { ExtincaoModal } from './components/ExtincaoModal';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
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
import { Contract, TermoAditivoDocument } from './types/contract';
import { UserProfile } from './types/user';
import { getContractStatus, computeChanges } from './utils/contract-helpers';
import { Toaster, toast } from 'sonner';
import { extractGestorFiscalFromText } from './utils/gestores-oficiais';
import { saveTermoWithFallback } from './utils/save-termo';

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
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  documentId,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';

type FilterType = 'Todos' | '<15' | '<30' | '<60' | '<90';
type ViewMode = 'dashboard' | 'charts' | 'profile';

/** chaves de classificação disponíveis para a tabela */
type TableSortKey = 'tipo' | 'alfabetica' | 'adicao' | 'valor' | 'saldo' | 'vigencia' | 'restantes';
type TableSortDir = 'asc' | 'desc';

/** direção padrão de cada modo de classificação */
const SORT_DEFAULTS: Record<TableSortKey, TableSortDir> = {
  tipo: 'asc',
  alfabetica: 'asc',
  adicao: 'desc', // recém-adicionados primeiro
  valor: 'desc', // maior valor primeiro
  saldo: 'desc', // maior saldo primeiro
  vigencia: 'asc', // mais próxima de vencer primeiro
  restantes: 'asc', // menor prazo restante primeiro
};

const TABLE_SCAN_BATCH_SIZE = 150;

interface TableFilterContext {
  activeFilter: FilterType;
  searchQuery: string;
  advancedFilters: AdvancedFilters;
}

interface TablePaginationCache {
  signature: string;
  filteredMatches: Contract[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  reachedEnd: boolean;
}

const normalizeContractSnapshot = (snapshotDoc: QueryDocumentSnapshot<DocumentData>): Contract => {
  const raw: any = { id: snapshotDoc.id, ...(snapshotDoc.data() as any) };

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
};

const contractMatchesFilters = (contract: Contract, context: TableFilterContext) => {
  const { activeFilter, searchQuery, advancedFilters } = context;

  if (activeFilter !== 'Todos') {
    const status = getContractStatus(contract);
    const days = status.daysRemaining;

    if (activeFilter === '<15' && !(days < 15 || status.type === 'expired')) {
      return false;
    }

    if (activeFilter === '<30' && !(days < 30 && days >= 15)) {
      return false;
    }

    if (activeFilter === '<60' && !(days < 60 && days >= 30)) {
      return false;
    }

    if (activeFilter === '<90' && !(days < 90 && days >= 60)) {
      return false;
    }
  }

  if (advancedFilters.tipoRegistro && advancedFilters.tipoRegistro !== 'todos') {
    if (contract.tipoRegistro !== advancedFilters.tipoRegistro) {
      return false;
    }
  }

  if (advancedFilters.situacao && advancedFilters.situacao !== 'todos') {
    if (contract.situacao !== advancedFilters.situacao) {
      return false;
    }
  }

  if (advancedFilters.gestor) {
    if (!contract.gestor?.toLowerCase().includes(advancedFilters.gestor.toLowerCase())) {
      return false;
    }
  }

  if (advancedFilters.fiscal) {
    if (!contract.fiscal?.toLowerCase().includes(advancedFilters.fiscal.toLowerCase())) {
      return false;
    }
  }

  if (advancedFilters.empresa || advancedFilters.convenente) {
    const termo = (advancedFilters.empresa || advancedFilters.convenente || '').toLowerCase();
    const empresaMatch = contract.empresa?.toLowerCase().includes(termo);
    const convenenteMatch = contract.convenente?.toLowerCase().includes(termo);

    if (!empresaMatch && !convenenteMatch) {
      return false;
    }
  }

  if (advancedFilters.valorMin !== undefined && (contract.valorAtual || 0) < advancedFilters.valorMin) {
    return false;
  }

  if (advancedFilters.valorMax !== undefined && (contract.valorAtual || 0) > advancedFilters.valorMax) {
    return false;
  }

  if (advancedFilters.diasVencimentoMin !== undefined || advancedFilters.diasVencimentoMax !== undefined) {
    const status = getContractStatus(contract);
    const days = status.daysRemaining;

    if (advancedFilters.diasVencimentoMin !== undefined && days < advancedFilters.diasVencimentoMin) {
      return false;
    }

    if (advancedFilters.diasVencimentoMax !== undefined && days > advancedFilters.diasVencimentoMax) {
      return false;
    }
  }

  if (searchQuery.trim()) {
    const queryText = searchQuery.toLowerCase();

    const matchesSearch =
      contract.empresa?.toLowerCase().includes(queryText) ||
      contract.numeroContrato?.toLowerCase().includes(queryText) ||
      contract.objeto?.toLowerCase().includes(queryText) ||
      contract.gestor?.toLowerCase().includes(queryText) ||
      contract.fiscal?.toLowerCase().includes(queryText) ||
      (contract.convenente ? contract.convenente.toLowerCase().includes(queryText) : false) ||
      (contract.numeroConvenio ? contract.numeroConvenio.toLowerCase().includes(queryText) : false) ||
      (contract.numeroAcordoCooperacaoTecnica ? contract.numeroAcordoCooperacaoTecnica.toLowerCase().includes(queryText) : false) ||
      (contract.numeroTermoCooperacaoTecnica ? contract.numeroTermoCooperacaoTecnica.toLowerCase().includes(queryText) : false) ||
      (contract.apostilas ? contract.apostilas.some((a) => a.note.toLowerCase().includes(queryText)) : false);

    if (!matchesSearch) {
      return false;
    }
  }

  return true;
};

// retorna a estimativa de quando o registro foi adicionado ao sistema:
// createdAt (novo) ou, para registros antigos, o timestamp do primeiro
// registro de histórico.
const getContractAddedAt = (contract: Contract): number => {
  if (contract.createdAt) {
    const t = new Date(contract.createdAt).getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (contract.history && contract.history.length > 0) {
    const t = new Date(contract.history[0].timestamp).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
};

const getContractNome = (contract: Contract): string =>
  (contract.convenente || contract.empresa || contract.numeroContrato || '').toString().toLowerCase();

const sortContractMatches = (matches: Contract[], key: TableSortKey, dir: TableSortDir) => {
  if (matches.length < 2) return;

  const multiplier = dir === 'asc' ? 1 : -1;

  matches.sort((a, b) => {
    let cmp = 0;

    switch (key) {
      case 'tipo': {
        cmp = (a.tipoRegistro || '')
          .toString()
          .toLowerCase()
          .localeCompare((b.tipoRegistro || '').toString().toLowerCase());
        if (cmp === 0) {
          cmp = (a.numeroContrato || a.numeroConvenio || '')
            .toString()
            .localeCompare((b.numeroContrato || b.numeroConvenio || '').toString());
        }
        break;
      }
      case 'alfabetica':
        cmp = getContractNome(a).localeCompare(getContractNome(b), 'pt-BR');
        break;
      case 'adicao':
        cmp = getContractAddedAt(a) - getContractAddedAt(b);
        break;
      case 'valor':
        cmp = (a.valorAtual || 0) - (b.valorAtual || 0);
        break;
      case 'saldo':
        cmp = (a.saldoDisponivel || 0) - (b.saldoDisponivel || 0);
        break;
      case 'vigencia':
        cmp = (a.vigenciaAtual || '').localeCompare(b.vigenciaAtual || '');
        break;
      case 'restantes':
        cmp = getContractStatus(a).daysRemaining - getContractStatus(b).daysRemaining;
        break;
    }

    cmp = cmp * multiplier;

    // desempate: numero do contrato/convênio para uma ordem estável
    if (cmp === 0) {
      cmp = (a.numeroContrato || a.numeroConvenio || '')
        .toString()
        .localeCompare((b.numeroContrato || b.numeroConvenio || '').toString());
    }
    return cmp;
  });
};

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
  const [tableContracts, setTableContracts] = useState<Contract[]>([]);
  const [tableCurrentPage, setTableCurrentPage] = useState(1);
  const [tableHasNextPage, setTableHasNextPage] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [tablePageSize, setTablePageSize] = useState(25);
  const [tableTotalPages, setTableTotalPages] = useState(1);
  const [tableReloadToken, setTableReloadToken] = useState(0);
  const [tableSortKey, setTableSortKey] = useState<TableSortKey>('tipo');
  const [tableSortDir, setTableSortDir] = useState<TableSortDir>('asc');
  const tableCacheRef = useRef<TablePaginationCache>({
    signature: '',
    filteredMatches: [],
    lastDoc: null,
    reachedEnd: false,
  });
  const tableRequestIdRef = useRef(0);
  
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

  const sanitizeFirestoreData = <T extends object>(data: T) => {
    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    ) as unknown as T;
  };

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
      const data: Contract[] = snapshot.docs.map(normalizeContractSnapshot);
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

  const tableFilterContext = useMemo<TableFilterContext>(() => {
    return {
      activeFilter,
      searchQuery,
      advancedFilters,
    };
  }, [activeFilter, searchQuery, advancedFilters]);

  const tableFilterSignature = useMemo(() => {
    return JSON.stringify({
      activeFilter: tableFilterContext.activeFilter,
      searchQuery: tableFilterContext.searchQuery.trim().toLowerCase(),
      sortKey: tableSortKey,
      sortDir: tableSortDir,
      advancedFilters: {
        tipoRegistro: tableFilterContext.advancedFilters.tipoRegistro || '',
        situacao: tableFilterContext.advancedFilters.situacao || '',
        gestor: tableFilterContext.advancedFilters.gestor || '',
        fiscal: tableFilterContext.advancedFilters.fiscal || '',
        empresa: tableFilterContext.advancedFilters.empresa || '',
        convenente: tableFilterContext.advancedFilters.convenente || '',
        valorMin: tableFilterContext.advancedFilters.valorMin === undefined ? null : tableFilterContext.advancedFilters.valorMin,
        valorMax: tableFilterContext.advancedFilters.valorMax === undefined ? null : tableFilterContext.advancedFilters.valorMax,
        diasVencimentoMin:
          tableFilterContext.advancedFilters.diasVencimentoMin === undefined
            ? null
            : tableFilterContext.advancedFilters.diasVencimentoMin,
        diasVencimentoMax:
          tableFilterContext.advancedFilters.diasVencimentoMax === undefined
            ? null
            : tableFilterContext.advancedFilters.diasVencimentoMax,
      },
    });
  }, [tableFilterContext, tableSortKey, tableSortDir]);

  const invalidateTableCache = (resetToFirstPage = false) => {
    tableCacheRef.current = {
      signature: '',
      filteredMatches: [],
      lastDoc: null,
      reachedEnd: false,
    };
    setTableReloadToken((prev) => prev + 1);
    if (resetToFirstPage) {
      setTableCurrentPage(1);
    }
  };

  const handlePageSizeChange = (newSize: string) => {
    setTablePageSize(Number(newSize));
    setTableCurrentPage(1);
  };

  useEffect(() => {
    setTableCurrentPage(1);
  }, [tableFilterSignature]);

  useEffect(() => {
    if (!isAuthenticated) {
      tableCacheRef.current = {
        signature: '',
        filteredMatches: [],
        lastDoc: null,
        reachedEnd: false,
      };
      setTableContracts([]);
      setTableCurrentPage(1);
      setTableHasNextPage(false);
      setTableLoading(false);
      return;
    }

    const requestId = tableRequestIdRef.current + 1;
    tableRequestIdRef.current = requestId;
    let isCancelled = false;

    const loadTablePage = async () => {
      setTableLoading(true);

      try {
        const cache = tableCacheRef.current;
        if (cache.signature !== tableFilterSignature) {
          cache.signature = tableFilterSignature;
          cache.filteredMatches = [];
          cache.lastDoc = null;
          cache.reachedEnd = false;
        }

        const requiredMatches = tableCurrentPage * tablePageSize + 1;

        while (cache.filteredMatches.length < requiredMatches && !cache.reachedEnd) {
          const pageQuery = cache.lastDoc
            ? query(
                collection(db, 'contracts'),
                orderBy(documentId()),
                startAfter(cache.lastDoc),
                limit(TABLE_SCAN_BATCH_SIZE)
              )
            : query(collection(db, 'contracts'), orderBy(documentId()), limit(TABLE_SCAN_BATCH_SIZE));

          const snapshot = await getDocs(pageQuery);

          if (isCancelled || requestId !== tableRequestIdRef.current) {
            return;
          }

          if (snapshot.empty) {
            cache.reachedEnd = true;
            break;
          }

          cache.lastDoc = snapshot.docs[snapshot.docs.length - 1];

          snapshot.docs.forEach((contractDoc) => {
            const contract = normalizeContractSnapshot(contractDoc);
            if (contractMatchesFilters(contract, tableFilterContext)) {
              cache.filteredMatches.push(contract);
            }
          });

          if (snapshot.size < TABLE_SCAN_BATCH_SIZE) {
            cache.reachedEnd = true;
          }
        }

        if (isCancelled || requestId !== tableRequestIdRef.current) {
          return;
        }

        // Quando todo o conjunto ja esta carregado (reachedEnd), ordenamos
        // conforme o modo de classificacao escolhido pelo usuario
        // (padrao: tipo de instrumento + numero do contrato).  Isso garante
        // ordem estavel e previsivel sem quebrar a paginacao partial do Firestore.
        if (cache.reachedEnd && cache.filteredMatches.length > 1) {
          sortContractMatches(cache.filteredMatches, tableSortKey, tableSortDir);
        }

        const startIndex = (tableCurrentPage - 1) * tablePageSize;
        const endIndex = startIndex + tablePageSize;
        const currentRows = cache.filteredMatches.slice(startIndex, endIndex);

        setTableContracts(currentRows);
        setTableHasNextPage(cache.filteredMatches.length > endIndex);
        setTableTotalPages(cache.reachedEnd
          ? Math.max(1, Math.ceil(cache.filteredMatches.length / tablePageSize))
          : Math.max(1, Math.ceil(cache.filteredMatches.length / tablePageSize)));

        if (currentRows.length === 0 && tableCurrentPage > 1) {
          setTableCurrentPage((prev) => Math.max(1, prev - 1));
        }
      } catch (err) {
        console.error(err);
        toast.error('Falha ao carregar os registros da tabela.');
      } finally {
        if (!isCancelled && requestId === tableRequestIdRef.current) {
          setTableLoading(false);
        }
      }
    };

    void loadTablePage();

    return () => {
      isCancelled = true;
    };
  }, [
    isAuthenticated,
    tableCurrentPage,
    tablePageSize,
    tableFilterSignature,
    tableReloadToken,
    tableFilterContext,
  ]);

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

      // Quando o registro e uma Portaria (ou outro instrumento que costuma
      // nomear gestores/fiscais), tentamos extrair do objeto/descricao os
      // emails e nomes citados e aplica-los automaticamente ao contrato.
      let autoUpdateFromText: Partial<Contract> = {};
      const searchText = [
        contractData.objeto,
        contractData.ultimoTermoAditivo,
        contractData.numeroContrato,
      ].filter(Boolean).join('\n');
      if (contractData.tipoRegistro === 'portaria' && searchText) {
        const parsed = extractGestorFiscalFromText(searchText);
        if (parsed.gestorEmail) {
          autoUpdateFromText.gestor = parsed.gestor;
          autoUpdateFromText.gestorEmail = parsed.gestorEmail;
        }
        if (parsed.fiscalEmails && parsed.fiscalEmails.length > 0) {
          autoUpdateFromText.fiscal = parsed.fiscal;
          autoUpdateFromText.fiscalEmail = parsed.fiscalEmails.length === 1 ? parsed.fiscalEmails[0] : parsed.fiscalEmails;
        }
      }
      const mergedData: Partial<Contract> = { ...contractData, ...autoUpdateFromText };

      if (editingContract) {
        const ref = doc(db, 'contracts', editingContract.id);
        // merge incoming values with existing contract
        const after: Contract = { ...editingContract, ...mergedData } as Contract;

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

          const sanitizedUpdate = sanitizeFirestoreData({
            ...mergedData,
            ...(after.emailEditor ? { emailEditor: after.emailEditor } : {}),
            history: historyToWrite,
          });

          await updateDoc(ref, sanitizedUpdate as any);
          toast.success('Sincronização concluída: Registro atualizado.');
        } else {
          toast.info('Nenhuma alteração detectada.');
        }
      } else {
        const newContract: any = { ...mergedData, history: [], apostilasCount: 0, createdAt: new Date().toISOString() };
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

        const sanitizedNewContract = sanitizeFirestoreData(newContract);
        await addDoc(collection(db, 'contracts'), sanitizedNewContract as any);
        toast.success('Novo registro integrado com sucesso.');
      }

      invalidateTableCache(true);
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

  // --- Extinção contratual modal ---
  const [isExtincaoOpen, setIsExtincaoOpen] = useState(false);
  const [extincaoContract, setExtincaoContract] = useState<Contract | null>(null);

  const handleOpenExtincao = (c: Contract) => {
    setExtincaoContract(c);
    setIsExtincaoOpen(true);
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

      // Detectar gestores/fiscais citados na apostila (texto pode ser uma
      // portaria/nomeacao que troca os responsaveis do contrato).
      const parsed = extractGestorFiscalFromText(note);
      const gestorChanges: any = {};
      if (parsed.gestorEmail && parsed.gestorEmail !== current.gestorEmail) {
        gestorChanges.gestor = parsed.gestor || current.gestor;
        gestorChanges.gestorEmail = parsed.gestorEmail;
      }
      const currentFiscalEmails: string[] = Array.isArray(current.fiscalEmail)
        ? current.fiscalEmail
        : (current.fiscalEmail ? [current.fiscalEmail] : []);
      const newFiscalEmails = parsed.fiscalEmails ?? [];
      const fiscalChanged =
        newFiscalEmails.length > 0 &&
        JSON.stringify([...newFiscalEmails].sort()) !==
          JSON.stringify([...currentFiscalEmails].sort());
      if (fiscalChanged) {
        gestorChanges.fiscal = parsed.fiscal || current.fiscal;
        gestorChanges.fiscalEmail = newFiscalEmails.length === 1 ? newFiscalEmails[0] : newFiscalEmails;
      }

      const updated: Contract = {
        ...current,
        valorAtual: novoValorAtual,
        valorPagoAcumulado: novoValorPagoAcumulado,
        saldoDisponivel: novoSaldo,
        apostilas: newApostilas,
        ...gestorChanges,
      };

      // compute minimal change log; computeChanges now ignores apostilas/history
      const changes = computeChanges(current, updated);

      // we still want to note that an apostila was added so auditors can see counts
      changes.push({
        field: 'apostilas',
        before: current.apostilas ? current.apostilas.length : 0,
        after: newApostilas.length,
      });
      if (Object.keys(gestorChanges).length > 0) {
        changes.push({
          field: 'gestorEmail',
          before: current.gestorEmail ?? null,
          after: gestorChanges.gestorEmail ?? null,
        });
        changes.push({
          field: 'fiscalEmail',
          before: currentFiscalEmails.length ? currentFiscalEmails : null,
          after: gestorChanges.fiscalEmail ?? null,
        });
      }

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

      const payload: any = {
        valorAtual: updated.valorAtual,
        valorPagoAcumulado: updated.valorPagoAcumulado,
        saldoDisponivel: updated.saldoDisponivel,
        apostilas: newApostilas,
        apostilasCount: newApostilas.length,
        history: historyToWrite,
      };
      // adiciona campos derivados da apostila (troca de gestor/fiscal)
      if (gestorChanges.gestor !== undefined) payload.gestor = gestorChanges.gestor;
      if (gestorChanges.gestorEmail !== undefined) payload.gestorEmail = gestorChanges.gestorEmail;
      if (gestorChanges.fiscal !== undefined) payload.fiscal = gestorChanges.fiscal;
      if (gestorChanges.fiscalEmail !== undefined) payload.fiscalEmail = gestorChanges.fiscalEmail;

      await updateDoc(ref, payload as any);

      // atualiza estado local imediatamente para refletir troca de gestor/fiscal
      setContracts((prev) => prev.map((c) => (c.id === id ? { ...c, ...gestorChanges, valorAtual: updated.valorAtual, valorPagoAcumulado: updated.valorPagoAcumulado, saldoDisponivel: updated.saldoDisponivel, apostilas: newApostilas } : c)));

      if (Object.keys(gestorChanges).length > 0) {
        toast.success('Apostila registrada. Gestor/fiscal atualizados conforme texto informado.');
      } else {
        toast.success('Apostila registrada com sucesso.');
      }
      setApostilaContract(null);
      invalidateTableCache();
    } catch (err) {
      console.error(err);
      toast.error('Falha ao salvar apostila.');
    }
  };

  // handler for termo aditivo entries
  const handleSaveTermoAditivo = async (
    id: string,
    note: string,
    tipo?: string,
    ajuste: number = 0,
    vigenciaInicial?: string,
    prorrogacao?: string,
    documents?: any[]
  ) => {
    const step = (msg: string, data?: any) => console.log(`[TermoAditivo ${id}] ${msg}`, data ?? '');
    try {
      if (!termoAditivoContract) {
        step('abortado: termoAditivoContract nulo');
        return;
      }
      const current = termoAditivoContract;
      step('inicio', { note: note.slice(0, 50), ajuste, vigenciaInicial, prorrogacao, docCount: documents?.length ?? 0 });

      // Prepara documentos serializaveis (sem compressao — fica por conta do
      // fallback caso o documento exceda o limite do Firestore).
      const serializedDocs = (documents ?? []).map((d: any) => {
        const s: any = {
          id: d.id,
          name: d.name,
          type: d.type,
          base64: d.base64,
          uploadedAt: d.uploadedAt,
          size: d.size,
        };
        if (userProfile?.email || userProfile?.uid) {
          s.uploadedBy = userProfile.email?.toLowerCase() || userProfile.uid;
        }
        return s;
      });

      const timestamp = new Date().toISOString();
      const entry: any = {
        timestamp,
        note,
        documents: serializedDocs.length > 0 ? serializedDocs : undefined,
      };
      if (userProfile?.email || userProfile?.uid) {
        entry.user = userProfile.email?.toLowerCase() || userProfile.uid;
      }
      if (tipo) entry.tipo = tipo;
      if (current.vigenciaAtual) entry.originalVigencia = current.vigenciaAtual;
      if (ajuste && ajuste !== 0) entry.ajuste = ajuste;
      if (vigenciaInicial) entry.vigenciaInicial = vigenciaInicial;
      if (prorrogacao) entry.prorrogacao = prorrogacao;

      //Calcula novos valores
      let novoValorAtual = current.valorAtual || 0;
      if (ajuste > 0) novoValorAtual += ajuste;
      const novoSaldo = Math.round((novoValorAtual - (current.valorPagoAcumulado || 0)) * 100) / 100;

      const contractFieldUpdates: any = {
        valorAtual: novoValorAtual,
        saldoDisponivel: novoSaldo,
      };
      if (vigenciaInicial) contractFieldUpdates.vigenciaInicial = vigenciaInicial;
      if (prorrogacao) contractFieldUpdates.vigenciaAtual = prorrogacao;

      // Inicia spinner visual: toast de progresso
      const progressToast = toast.loading('Salvando termo aditivo...');

      const result = await saveTermoWithFallback({
        id,
        tipo: 'termo',
        entry,
        current,
        contractFieldUpdates,
        log: step,
      });

      toast.dismiss(progressToast);

      if (!result.success) {
        step('Falha final', result.error);
        const err = result.error || '';
        if (err.includes('Falha no upload') || err.includes('Storage') || err.includes('storage')) {
          toast.error('Falha ao enviar documento para o Storage. Verifique conexao/permissoes.');
        } else {
          toast.error('Falha ao salvar termo aditivo.');
        }
        return;
      }

      // Atualiza estado local imediatamente para feedback visual
      const updatedTermos = [...(current.termosAditivos || []), entry];
      if (updatedTermos.length > 200) updatedTermos.splice(0, updatedTermos.length - 200);

      const updated: Contract = {
        ...current,
        valorAtual: novoValorAtual,
        saldoDisponivel: novoSaldo,
        termosAditivos: updatedTermos,
      };
      if (vigenciaInicial) updated.vigenciaInicial = vigenciaInicial;
      if (prorrogacao) updated.vigenciaAtual = prorrogacao;

      setContracts((prev) => prev.map((c) => (c.id === id ? updated : c)));
      if (termoAditivoContract && termoAditivoContract.id === id) {
        setTermoAditivoContract(updated);
      }

      if (result.wentToStorage) {
        toast.success(`Termo aditivo salvo. ${result.uploadedUrls.length} documento(s) enviado(s) ao Storage.`);
      } else {
        toast.success('Termo aditivo registrado com sucesso.');
      }
      invalidateTableCache();
    } catch (err: any) {
      console.error('[TermoAditivo] erro inesperado', err);
      toast.error('Falha ao salvar termo aditivo.');
    }
  };

  const handleSaveExtincao = async (
    id: string,
    tipo: 'termoRecisaoUnilateral' | 'termoRecisaoAmigavel',
    note: string,
    dataExtincao?: string,
    documents?: TermoAditivoDocument[]
  ) => {
    const step = (msg: string, data?: any) => console.log(`[Extincao ${id}] ${msg}`, data ?? '');
    try {
      if (!extincaoContract) {
        step('abortado: extincaoContract nulo');
        return;
      }
      const current = extincaoContract;
      const now = new Date().toISOString();
      step('inicio', { tipo, note: note.slice(0, 50), dataExtincao, docCount: documents?.length ?? 0 });

      const fecha = dataExtincao || current.vigenciaAtual || new Date().toISOString().slice(0, 10);

      const serializedDocs = (documents ?? []).map((d: any) => {
        const s: any = {
          id: d.id,
          name: d.name,
          type: d.type,
          base64: d.base64,
          uploadedAt: d.uploadedAt,
          size: d.size,
        };
        if (userProfile?.email || userProfile?.uid) {
          s.uploadedBy = userProfile.email?.toLowerCase() || userProfile.uid;
        }
        return s;
      });

      const entry: any = {
        timestamp: now,
        user: userProfile?.email?.toLowerCase() || userProfile?.uid || undefined,
        tipo,
        note,
        documents: serializedDocs.length > 0 ? serializedDocs : undefined,
      };

      const contractFieldUpdates: any = {
        situacao: 'Encerrado',
        vigenciaAtual: fecha,
      };

      const progressToast = toast.loading('Registrando extinção...');
      const result = await saveTermoWithFallback({
        id,
        tipo: 'extincao',
        entry,
        current,
        contractFieldUpdates,
        log: step,
      });
      toast.dismiss(progressToast);

      if (!result.success) {
        step('Falha final', result.error);
        const err = result.error || '';
        if (err.includes('Falha no upload') || err.includes('Storage') || err.includes('storage')) {
          toast.error('Falha ao enviar documento para o Storage. Verifique conexao/permissoes.');
        } else {
          toast.error('Falha ao registrar extinção contratual.');
        }
        return;
      }

      // Atualiza estado local
      const updatedTermos = [...(current.termosAditivos || []), entry];
      if (updatedTermos.length > 200) updatedTermos.splice(0, updatedTermos.length - 200);

      const updated: Contract = {
        ...current,
        situacao: 'Encerrado',
        vigenciaAtual: fecha,
        termosAditivos: updatedTermos,
      };

      setContracts((prev) => prev.map((c) => (c.id === id ? updated : c)));
      if (extincaoContract && extincaoContract.id === id) {
        setExtincaoContract(updated);
      }

      if (result.wentToStorage) {
        toast.success(`Extinção registrada. ${result.uploadedUrls.length} documento(s) enviado(s) ao Storage. Contrato marcado como Encerrado.`);
      } else {
        toast.success('Extinção contratual registrada — contrato marcado como Encerrado.');
      }
      invalidateTableCache();
    } catch (err: any) {
      console.error('[Extincao] erro inesperado', err);
      toast.error('Falha ao registrar extinção contratual.');
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

  const getPageNumbers = (current: number, total: number): (number | 'ellipsis')[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | 'ellipsis')[] = [1];
    if (current > 3) pages.push('ellipsis');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push('ellipsis');
    pages.push(total);
    return pages;
  };

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

                    {/* SEARCH / FILTER / SORT PANEL */}
                    <div className="bg-white p-4 sm:p-5 rounded-lg border border-secti-border shadow-sm mb-4 sm:mb-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
                      <div className="relative w-full lg:max-w-xl">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Pesquisar por empresa, contrato, convênio..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 h-11 w-full border-gray-200 bg-gray-50 focus:bg-white focus:ring-1 focus:ring-[#00D1FF] transition-colors rounded-md text-sm"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full lg:w-auto">
                        <AdvancedFiltersPanel
                          filters={advancedFilters}
                          onFiltersChange={setAdvancedFilters}
                          gestores={uniqueGestores}
                          fiscais={uniqueFiscais}
                        />
                        {/* Classificação da tabela */}
                        <div className="flex items-center gap-1.5">
                          <Select
                            value={tableSortKey}
                            onValueChange={(v) => {
                              const key = v as TableSortKey;
                              setTableSortKey(key);
                              setTableSortDir(SORT_DEFAULTS[key]);
                              setTableCurrentPage(1);
                            }}
                          >
                            <SelectTrigger className="h-11 w-full sm:w-[230px] bg-gray-50 border-gray-200 text-sm" aria-label="Classificar por">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tipo">Tipo + Número</SelectItem>
                              <SelectItem value="alfabetica">Nome (A–Z)</SelectItem>
                              <SelectItem value="adicao">Adição no sistema</SelectItem>
                              <SelectItem value="valor">Valor atual</SelectItem>
                              <SelectItem value="saldo">Saldo disponível</SelectItem>
                              <SelectItem value="vigencia">Vigência (término)</SelectItem>
                              <SelectItem value="restantes">Prazo restante</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-11 w-11 shrink-0 border-gray-200 text-gray-600"
                            onClick={() => setTableSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                            title={tableSortDir === 'asc' ? 'Ordem crescente — clique para decrescente' : 'Ordem decrescente — clique para crescente'}
                            aria-label="Alternar direção da ordem"
                          >
                            {tableSortDir === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* TABLE AREA */}
                    <div className="bg-white rounded-lg border border-secti-border shadow-sm overflow-x-auto w-full">
                      <div className="min-w-[800px]">
                        {tableLoading && tableContracts.length === 0 ? (
                          <div className="p-8 text-sm text-secti-muted">Carregando registros...</div>
                        ) : (
                          <ContractsTable
                            contracts={tableContracts}
                            allContracts={contracts}
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
                        )}
                      </div>
                      <div className="border-t border-gray-100 px-4 py-3 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <p className="text-xs sm:text-sm text-secti-muted">
                            Página {tableCurrentPage} de {tableTotalPages} • {tableContracts.length} registro(s)
                          </p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-secti-muted">Exibir</span>
                            <Select
                              value={String(tablePageSize)}
                              onValueChange={handlePageSizeChange}
                            >
                              <SelectTrigger className="h-8 w-16 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={tableCurrentPage === 1 || tableLoading}
                            onClick={() => setTableCurrentPage((prev) => Math.max(1, prev - 1))}
                          >
                            <ChevronLeft className="w-4 h-4" />
                            <span className="hidden sm:inline ml-1">Anterior</span>
                          </Button>
                          {getPageNumbers(tableCurrentPage, tableTotalPages).map((page, idx) =>
                            page === 'ellipsis' ? (
                              <span key={`ellipsis-${idx}`} className="px-1 text-secti-muted select-none">...</span>
                            ) : (
                              <Button
                                key={page}
                                variant={page === tableCurrentPage ? "default" : "outline"}
                                size="sm"
                                className="min-w-9"
                                disabled={tableLoading}
                                onClick={() => setTableCurrentPage(page)}
                              >
                                {page}
                              </Button>
                            )
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!tableHasNextPage || tableLoading}
                            onClick={() => setTableCurrentPage((prev) => prev + 1)}
                          >
                            <span className="hidden sm:inline mr-1">Próxima</span>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
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
              // passar informações do usuário sempre que houver perfil
              currentUser={
                userProfile
                  ? {
                      email: userProfile.email,
                      role: userProfile.role,
                      displayName: userProfile.displayName,
                    }
                  : undefined
              }
              onAddTermoAditivo={
                userProfile && (userProfile.role === 'ccc' || userProfile.role === 'gestor' || userProfile.role === 'fiscal')
                  ? handleAddTermoAditivoClick
                  : undefined
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

            <ExtincaoModal
              isOpen={isExtincaoOpen}
              onClose={() => setIsExtincaoOpen(false)}
              contract={extincaoContract}
              onSave={handleSaveExtincao}
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
                onRequestExtincao={
                  userProfile && (userProfile.role === 'ccc' || userProfile.role === 'gestor' || userProfile.role === 'fiscal')
                    ? handleOpenExtincao
                    : undefined
                }
              />
            )}
          </div>
        </SidebarProvider>
      )}
    </>
  );
}

export default App;
