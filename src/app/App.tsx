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

type FilterType = 'all' | 'critical' | 'warning' | 'safe';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const creatingUserRef = useRef(false);

  const [currentPage, setCurrentPage] = useState<'dashboard' | 'profile'>('dashboard');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | undefined>();

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
        const after: Contract = { ...editingContract, ...contractData } as Contract;
        const changes = computeChanges(editingContract, after);
        if (changes.length > 0) {
          const entry = {
            timestamp: new Date().toISOString(),
            user: userProfile?.email || userProfile?.uid || null,
            changes,
          };
          await updateDoc(ref, {
            ...contractData,
            history: arrayUnion(entry),
          } as any);
          toast.success('Sincronização concluída: Registro atualizado.');
        } else {
          toast.info('Nenhuma alteração detectada.');
        }
      } else {
        const newContract: any = { ...contractData, history: [] };
        if (userProfile) {
          const nameOrEmail = userProfile.displayName || userProfile.email;
          if (userProfile.role === 'gestor') newContract.gestor = nameOrEmail;
          if (userProfile.role === 'fiscal') newContract.fiscal = nameOrEmail;
        }
        const changes = computeChanges(null, newContract);
        const createdEntry = {
          timestamp: new Date().toISOString(),
          user: userProfile?.email || userProfile?.uid || null,
          changes,
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
        toast.error(
          'Sua conta ainda não foi verificada. Enviamos um e‑mail com instruções, confira sua caixa de entrada.'
        );
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
    role: 'gestor' | 'fiscal',
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
          email: userCred.user.email,
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
        `Conta criada como ${
          role === 'gestor' ? 'Gestor' : 'Fiscal'
        }. Verifique seu e‑mail para ativar a conta.`
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
      toast.success('Desconectado.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao sair.');
    }
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
            <Sidebar className="bg-[#0B2046] border-r border-secti-border">
              <SidebarContent className="bg-[#0B2046] text-white">
                <div className="p-6">
                  <h2 className="text-2xl font-bold tracking-tighter text-[#00D1FF]">SECTI - CONTRATOS</h2>
                  <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest">Administrativo</p>
                </div>
                <SidebarGroup>
                  <SidebarGroupLabel className="text-white/40 text-[10px] uppercase font-bold px-6">Ferramentas</SidebarGroupLabel>
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
              contract={editingContract}
              currentUser={
                userProfile && (userProfile.role === 'gestor' || userProfile.role === 'fiscal')
                  ? {
                      email: userProfile.email,
                      role: userProfile.role,
                      displayName: userProfile.displayName,
                    }
                  : undefined
              } />
          </div>
        </SidebarProvider>
      )}
    </>
  );
}

export default App;