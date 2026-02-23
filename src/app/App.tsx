import { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';
import { KpiCard } from './components/KpiCard';
import { ContractsTable } from './components/ContractsTable';
import { ContractModal } from './components/ContractModal';
import { Login } from './components/Login';
import { ProfilePage } from './components/ProfilePage';
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
} from './components/ui/sidebar';
import { Contract } from './types/contract';
import { getContractStatus } from './utils/contract-helpers';
import { Toaster, toast } from 'sonner';

// Firebase imports
import { auth, db, addUser, subscribeUser } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  arrayUnion,
} from 'firebase/firestore';

type FilterType = 'all' | 'critical' | 'warning' | 'safe';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);

  // view state: dashboard or profile
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'profile'>('dashboard');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | undefined>();

  // listen for auth state changes
  useEffect(() => {
    let unsubUser: (() => void) | undefined;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      if (user) {
        // subscribe to profile doc
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

  // subscribe to firestore contracts when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    const q = collection(db, 'contracts');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Contract[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setContracts(data);
    });
    return unsubscribe;
  }, [isAuthenticated]);

  const kpis = useMemo(() => {
    const critical = contracts.filter((c) => {
      const status = getContractStatus(c);
      return status.type === 'critical' || status.type === 'expired';
    }).length;

    const warning = contracts.filter((c) => {
      const status = getContractStatus(c);
      return status.type === 'warning';
    }).length;

    const safe = contracts.filter((c) => {
      const status = getContractStatus(c);
      return status.type === 'safe';
    }).length;

    return { total: contracts.length, critical, warning, safe };
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    let filtered = contracts;

    if (activeFilter !== 'all') {
      filtered = filtered.filter((contract) => {
        const status = getContractStatus(contract);
        if (activeFilter === 'critical') {
          return status.type === 'critical' || status.type === 'expired';
        }
        return status.type === activeFilter;
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
          contract.fiscal.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [contracts, activeFilter, searchQuery]);

  const handleSaveContract = async (contractData: Partial<Contract>) => {
    try {
      if (editingContract) {
        const ref = doc(db, 'contracts', editingContract.id);
        // prepare history entry
        const after: Contract = { ...editingContract, ...contractData } as Contract;
        const entry = {
          timestamp: new Date().toISOString(),
          user: userProfile?.email || userProfile?.uid || null,
          before: editingContract,
          after,
        };
        await updateDoc(ref, {
          ...contractData,
          history: arrayUnion(entry),
        } as any);
        toast.success('Sincronização concluída: Registro atualizado.');
      } else {
        // when creating a new contract ensure gestor/fiscal reflect creator
        const newContract: any = { ...contractData, history: [] };
        if (userProfile) {
          const nameOrEmail = userProfile.displayName || userProfile.email;
          if (userProfile.role === 'gestor') newContract.gestor = nameOrEmail;
          if (userProfile.role === 'fiscal') newContract.fiscal = nameOrEmail;
        }
        const createdEntry = {
          timestamp: new Date().toISOString(),
          user: userProfile?.email || userProfile?.uid || null,
          before: null,
          after: newContract,
        };
        newContract.history = [createdEntry];
        await addDoc(collection(db, 'contracts'), newContract);
        toast.success('Nova unidade de contrato integrada.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Falha ao salvar no Firebase.');
    }

    setEditingContract(undefined);
  };

  // translate firebase auth error codes into Portuguese
  function translateAuthError(code: string | undefined, defaultMsg: string) {
    switch (code) {
      case 'auth/invalid-email':
        return 'Formato de e‑mail inválido.';
      case 'auth/user-disabled':
        return 'Conta de usuário desabilitada.';
      case 'auth/user-not-found':
        return 'Usuário não encontrado.';
      case 'auth/wrong-password':
        return 'Senha incorreta.';
      case 'auth/email-already-in-use':
        return 'E‑mail já está em uso.';
      case 'auth/weak-password':
        return 'Senha muito fraca (mínimo 6 caracteres).';
      case 'auth/operation-not-allowed':
        return 'Operação não permitida. Contate o administrador.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas. Aguarde alguns minutos.';
      default:
        return defaultMsg;
    }
  }

  // authentication helpers
  const handleLogin = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Autenticado com sucesso.');
    } catch (err: any) {
      console.error(err);
      const msg = translateAuthError(err.code, 'Falha na autenticação.');
      toast.error(msg);
    }
  };

  const handleRegister = async (
    username: string,
    email: string,
    password: string,
    role: 'gestor' | 'fiscal',
    photoBase64: string
  ) => {
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: username });
      }
      // create corresponding Firestore user document
      try {
        await addUser({
          uid: userCred.user.uid,
          email: userCred.user.email,
          displayName: username,
          role,
          photoBase64,
          createdAt: new Date().toISOString(),
        });
      } catch (fireErr) {
        console.error('Erro ao criar usuário no Firestore', fireErr);
        // non-blocking: we still consider registration successful
      }
      toast.success(`Conta criada como ${role === 'gestor' ? 'Gestor' : 'Fiscal'} e você está logado.`);
    } catch (err: any) {
      console.error(err);
      const msg = translateAuthError(err.code, 'Falha ao criar conta.');
      toast.error(msg);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // onAuthStateChanged listener will update isAuthenticated
      setCurrentPage('dashboard');
      setUserProfile(null);
      toast.success('Desconectado.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao sair.');
    }
  };

  // global toaster rendered regardless of auth state
  return (
    <>
      <Toaster position="top-right" richColors />
      {!isAuthenticated ? (
        <Login onLogin={handleLogin} onRegister={handleRegister} />
      ) : (
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-[#F8FAFC]">
            <Sidebar className="bg-[#0B2046] border-r border-secti-border">
              <SidebarContent className="bg-[#0B2046] text-white">
                <div className="p-6">
                  <h2 className="text-2xl font-bold tracking-tighter text-[#00D1FF]">SECTI - CONTRATOS</h2>
                  <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest">Administrativo</p>
                </div>
                <SidebarGroup>
                  <SidebarGroupLabel className="text-white/40 text-[10px] uppercase font-bold px-6">Frota de Contratos</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton 
                          onClick={() => setCurrentPage('dashboard')}
                          className="px-6 h-12 hover:bg-[#0056B3] transition-colors text-white gap-3"
                        >
                          <LayoutDashboard className="w-5 h-5 text-[#00D1FF]" />
                          <span className="font-medium">Dashboard Geral</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => { setEditingContract(undefined); setIsModalOpen(true); }}
                          className="px-6 h-12 hover:bg-[#0056B3] transition-colors text-white gap-3"
                        >
                          <Plus className="w-5 h-5 text-[#00D1FF]" />
                          <span className="font-medium">Novo Registro</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => setCurrentPage('profile')}
                          className="px-6 h-12 hover:bg-[#0056B3] transition-colors text-white gap-3"
                        >
                          <User className="w-5 h-5 text-[#00D1FF]" />
                          <span className="font-medium">Meu Perfil</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
                <div className="mt-auto p-4">
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full justify-start text-white/70 hover:text-white hover:bg-red-500/20 gap-3"
                  >
                    <LogOut className="w-5 h-5" />
                    Sair do Sistema
                  </Button>
                </div>
              </SidebarContent>
            </Sidebar>

            <main className="flex-1 overflow-y-auto">
              {currentPage === 'profile' ? (
                <ProfilePage profile={userProfile} />
              ) : (
                <> 
                  <header className="bg-white border-b border-secti-border h-20 flex items-center px-8 sticky top-0 z-10 shadow-sm">
                    <div className="flex flex-col">
                      <h1 className="text-2xl font-bold text-secti-primary font-sans">Monitoramento de Contratos</h1>
                    </div>
                  </header>

              <div className="p-8 max-w-[1600px] mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <KpiCard title="Ativos Totais" value={kpis.total} icon={FileText} variant="neutral" isActive={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
                  <KpiCard title="STATUS + 30 DIAS" value={kpis.critical} icon={AlertTriangle} variant="critical" isActive={activeFilter === 'critical'} onClick={() => setActiveFilter('critical')} />
                  <KpiCard title="STATUS + 60 DIAS" value={kpis.warning} icon={Clock} variant="warning" isActive={activeFilter === 'warning'} onClick={() => setActiveFilter('warning')} />
                  <KpiCard title="STATUS + 90 DIAS" value={kpis.safe} icon={CheckCircle2} variant="safe" isActive={activeFilter === 'safe'} onClick={() => setActiveFilter('safe')} />
                </div>

                <div className="bg-white p-6 rounded-lg border border-secti-border shadow-card mb-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative w-full max-w-xl">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secti-muted" />
                      <Input
                        placeholder="Varredura por empresa, contrato ou gestor..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 border-secti-border font-sans bg-[#F8FAFC]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-secti-muted uppercase font-mono">Filtro Ativo:</span>
                      <span className="px-3 py-1 bg-secti-primary/10 text-secti-primary rounded text-xs font-bold font-mono">{activeFilter.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                <ContractsTable contracts={filteredContracts} onEdit={(c) => { setEditingContract(c); setIsModalOpen(true); }} />
              </div>
                </>
              )}
            </main>

            <ContractModal
              isOpen={isModalOpen}
              onClose={() => { setIsModalOpen(false); setEditingContract(undefined); }}
              onSave={handleSaveContract}
              contract={editingContract}              currentUser={userProfile}            />
          </div>
        </SidebarProvider>
      )}
      </>
    );
}

      export default App;