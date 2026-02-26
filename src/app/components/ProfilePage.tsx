import { useState, useEffect, ChangeEvent } from 'react';
import { User, Camera, ShieldAlert, LogOut, Mail, Lock, Phone, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { UserProfile } from '../types/user';
import { updateUser, auth } from '../../firebase';
import { formatPhoneNumber } from '../utils/contract-helpers';
import {
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  signOut,
} from 'firebase/auth';

interface ProfilePageProps {
  profile: UserProfile | null;
  onBackToDashboard?: () => void;
}

export function ProfilePage({ profile, onBackToDashboard }: ProfilePageProps) {
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  const formatRole = (role?: string) => {
    if (!role) return 'não informado';
    const lower = role.toLowerCase();
    if (lower === 'ccc') {
      return 'Coordenação de Convênios e Contratos';
    }
    return role;
  };

  useEffect(() => {
    if (profile) {
      setForm({
        ...profile,
        phone: formatPhoneNumber(profile.phone || ''),
      });
    }
  }, [profile]);

  const handleChange = (field: keyof UserProfile, value: any) => {
    if (field === 'phone') {
      value = formatPhoneNumber(value);
    }
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      handleChange('photoBase64', reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const updates: any = {
        displayName: form.displayName,
        photoBase64: form.photoBase64,
        // store only digits in backend; formatting is purely for UI
        phone: form.phone ? form.phone.replace(/\D/g, '') : undefined,
        department: form.department,
      };

      Object.keys(updates).forEach((key) => {
        if (updates[key as keyof typeof updates] === undefined) {
          delete updates[key as keyof typeof updates];
        }
      });

      await updateUser(form.uid, updates);

      if (auth.currentUser) {
        // Firebase Auth expects photoURL to be a valid URL; we store the
        // image as base64 in Firestore so we must be careful not to send the
        // raw data URI to the SDK (it will reject it as "too long"). Only
        // update the photoURL when it already looks like a proper link.
        const authUpdates: any = {
          displayName: form.displayName || undefined,
        };
        if (form.photoBase64 && form.photoBase64.startsWith('http')) {
          authUpdates.photoURL = form.photoBase64;
        }
        await updateProfile(auth.currentUser, authUpdates);
      }
      toast.success('Perfil atualizado com sucesso');
      setEditMode(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-secti-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-secti-muted text-sm font-medium">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full">
      <div className="bg-white border border-secti-border shadow-sm rounded-xl p-5 sm:p-8">
        {onBackToDashboard && (
          <button
            onClick={onBackToDashboard}
            className="mb-4 flex items-center gap-2 text-[#0B2046] hover:text-[#00D1FF] text-sm font-medium focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Voltar para Dashboard
          </button>
        )}
        {/* HEADER */}
        <header className="mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
          <User className="w-5 h-5 sm:w-6 sm:h-6 text-[#00D1FF]" />
          <h1 className="text-lg sm:text-xl font-bold text-[#0B2046]">Meu Perfil</h1>
        </header>

        {/* PROFILE INFO & AVATAR */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
          
          {/* Avatar Container */}
          <div className="flex flex-col items-center shrink-0">
            <div className="relative inline-block group">
              {form?.photoBase64 ? (
                <img
                  src={form.photoBase64}
                  alt="avatar"
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-gray-50 shadow-sm transition-transform group-hover:scale-[1.02]"
                />
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gray-100 flex items-center justify-center border-4 border-gray-50 shadow-sm">
                  <User className="w-10 h-10 sm:w-16 sm:h-16 text-gray-400" />
                </div>
              )}
              {editMode && (
                <label className="absolute bottom-0 right-0 sm:bottom-1 sm:right-1 bg-[#00D1FF] text-white rounded-full p-2 cursor-pointer shadow-md hover:bg-[#00b8e6] transition-colors hover:scale-110">
                  <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>
            <p className="text-[10px] text-gray-500 mt-3 text-center max-w-[140px] leading-tight hidden sm:block">
              Sua foto será exibida no histórico de ações.
            </p>
          </div>

          {/* Form or Display Info */}
          <div className="flex-1 w-full">
            {editMode ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-1.5">
                  <Label htmlFor="displayName" className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Nome Completo</Label>
                  <Input
                    id="displayName"
                    value={form?.displayName || ''}
                    onChange={(e) => handleChange('displayName', e.target.value)}
                    className="h-11 bg-gray-50 focus:bg-white border-gray-200"
                    placeholder="Seu nome"
                  />
                </div>
                
                <div className="space-y-1.5 opacity-70">
                  <Label htmlFor="email" className="text-xs font-semibold text-gray-700 uppercase tracking-wide">E-mail (Inalterável)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input id="email" value={form?.email || ''} disabled className="pl-9 h-11 bg-gray-100 cursor-not-allowed border-gray-200" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="phone"
                        value={form?.phone || ''}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        className="pl-9 h-11 bg-gray-50 focus:bg-white border-gray-200"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="department" className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Setor/Departamento</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="department"
                        value={form?.department || ''}
                        onChange={(e) => handleChange('department', e.target.value)}
                        className="pl-9 h-11 bg-gray-50 focus:bg-white border-gray-200"
                        placeholder="Ex: TI, Financeiro"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center sm:text-left animate-in fade-in duration-300">
                <h2 className="text-xl sm:text-2xl font-bold text-[#0B2046] mb-1">
                  {profile.displayName || 'Usuário sem nome'}
                </h2>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-gray-500 mb-4">
                  <Mail className="w-3.5 h-3.5" />
                  <p className="text-sm font-medium">{profile.email}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 mt-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Função no Sistema</span>
                    <span className="text-sm font-semibold text-gray-800 capitalize">{formatRole(profile.role)}</span>
                  </div>
                  
                  {profile.department && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Setor</span>
                      <span className="text-sm font-medium text-gray-800">{profile.department}</span>
                    </div>
                  )}
                  
                  {profile.phone && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Telefone</span>
                      <span className="text-sm font-medium text-gray-800">{formatPhoneNumber(profile.phone)}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Membro desde</span>
                    <span className="text-sm font-medium text-gray-800">
                      {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('pt-BR') : '-'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-4">
          
          {/* Edit / Save Actions */}
          {editMode ? (
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto bg-[#0B2046] hover:bg-[#1a3668] text-white h-11"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditMode(false);
                  setForm(profile);
                }}
                className="w-full sm:w-auto h-11 border-gray-200 text-gray-600 hover:bg-gray-50"
                disabled={saving}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setEditMode(true)}
              className="w-full sm:w-auto bg-[#0B2046] hover:bg-[#1a3668] text-white h-11 self-start"
            >
              <User className="w-4 h-4 mr-2" />
              Editar Informações
            </Button>
          )}

          {/* Security Toggle */}
          <div className="pt-4 w-full">
            <Button
              variant="ghost"
              onClick={() => setShowSecurity((v) => !v)}
              className="w-full sm:w-auto text-gray-500 hover:text-[#0B2046] hover:bg-gray-50 gap-2 h-11 justify-center sm:justify-start px-4"
            >
              <ShieldAlert className="w-4 h-4" />
              {showSecurity ? 'Ocultar painel de segurança' : 'Configurações de segurança da conta'}
            </Button>
          </div>

          {/* Security Panel */}
          {showSecurity && (
            <div className="mt-2 p-4 sm:p-5 bg-gray-50 border border-gray-200 rounded-lg space-y-6 animate-in slide-in-from-top-2 duration-300">
              
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5 text-gray-600" />
                <h3 className="font-bold text-gray-800">Segurança & Acesso</h3>
              </div>

              {/* Email verification alert */}
              {auth.currentUser && !auth.currentUser.emailVerified && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5" />
                    <p className="text-sm text-amber-800 font-medium">Seu e-mail ainda não foi verificado.</p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full sm:w-auto bg-amber-100 hover:bg-amber-200 text-amber-800 shrink-0"
                    onClick={async () => {
                      try {
                        if (auth.currentUser) {
                          await sendEmailVerification(auth.currentUser);
                        }
                        toast.success('E-mail de verificação enviado');
                      } catch (err) {
                        console.error(err);
                        toast.error('Erro ao enviar verificação');
                      }
                    }}
                  >
                    Reenviar link
                  </Button>
                </div>
              )}

              {/* Password Change Form */}
              <div className="space-y-4 bg-white p-4 rounded-md border border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Alterar Senha</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="currentPwd" className="text-xs text-gray-600">Senha atual</Label>
                    <Input
                      id="currentPwd"
                      type="password"
                      value={currentPwd}
                      onChange={(e) => setCurrentPwd(e.target.value)}
                      className="mt-1 bg-gray-50 focus:bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="newPwd" className="text-xs text-gray-600">Nova senha</Label>
                      <Input
                        id="newPwd"
                        type="password"
                        value={newPwd}
                        onChange={(e) => setNewPwd(e.target.value)}
                        className="mt-1 bg-gray-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPwd" className="text-xs text-gray-600">Confirme a senha</Label>
                      <Input
                        id="confirmPwd"
                        type="password"
                        value={confirmPwd}
                        onChange={(e) => setConfirmPwd(e.target.value)}
                        className="mt-1 bg-gray-50 focus:bg-white"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={async () => {
                      if (newPwd !== confirmPwd) {
                        toast.error('As senhas não coincidem');
                        return;
                      }
                      if (!auth.currentUser || !auth.currentUser.email) return;
                      setPwdSaving(true);
                      try {
                        const cred = EmailAuthProvider.credential(
                          auth.currentUser.email,
                          currentPwd
                        );
                        await reauthenticateWithCredential(
                          auth.currentUser,
                          cred
                        );
                        await updatePassword(auth.currentUser, newPwd);
                        toast.success('Senha alterada com sucesso');
                        setCurrentPwd('');
                        setNewPwd('');
                        setConfirmPwd('');
                      } catch (err: any) {
                        console.error(err);
                        if (err.code === 'auth/invalid-credential') {
                          toast.error('Senha atual incorreta');
                        } else if (err.code === 'auth/weak-password') {
                          toast.error('A nova senha é muito fraca (mínimo 6 caracteres)');
                        } else {
                          toast.error('Erro ao alterar senha. Tente fazer login novamente.');
                        }
                      } finally {
                        setPwdSaving(false);
                      }
                    }}
                    disabled={pwdSaving || !currentPwd || !newPwd || !confirmPwd}
                    className="w-full sm:w-auto mt-2"
                  >
                    {pwdSaving ? 'Atualizando...' : 'Confirmar Nova Senha'}
                  </Button>
                </div>
              </div>

              {/* Login info and Logout */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200">
                {auth.currentUser && auth.currentUser.metadata && (
                  <p className="text-xs text-gray-500 text-center sm:text-left">
                    Último acesso em: <br className="sm:hidden" />
                    <span className="font-mono text-gray-700">{auth.currentUser.metadata.lastSignInTime}</span>
                  </p>
                )}
                
                <Button
                  variant="destructive"
                  className="w-full sm:w-auto gap-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border-none shadow-none"
                  onClick={async () => {
                    try {
                      await signOut(auth);
                      toast.success('Desconectado com sucesso');
                    } catch (err) {
                      console.error(err);
                      toast.error('Erro ao sair da conta');
                    }
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Sair do Sistema
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}