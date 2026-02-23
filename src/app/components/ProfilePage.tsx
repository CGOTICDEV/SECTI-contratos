import { useState, useEffect, ChangeEvent } from 'react';
import { User, Camera, Key } from 'lucide-react';
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
}

export function ProfilePage({ profile }: ProfilePageProps) {
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
      <div className="flex items-center justify-center h-full">
        <p className="text-secti-muted">Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="bg-white border border-secti-border shadow-card rounded-lg p-8">
        <header className="mb-6 flex items-center gap-2">
          <User className="w-6 h-6 text-secti-primary" />
          <h1 className="text-xl font-bold">Meu Perfil</h1>
        </header>
        <div className="flex items-center gap-6 mb-8">
          <div className="relative">
            {form?.photoBase64 ? (
              <img
                src={form.photoBase64}
                alt="avatar"
                className="w-32 h-32 rounded-full object-cover border"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-16 h-16 text-gray-400" />
              </div>
            )}
            {editMode && (
              <label className="absolute bottom-0 right-0 bg-white rounded-full p-1 cursor-pointer border">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>
          <div className="flex-1">
            {editMode ? (
              <div className="space-y-2">
                <div>
                  <Label htmlFor="displayName" className='mb-2'>Nome</Label>
                  <Input
                    id="displayName"
                    value={form?.displayName || ''}
                    onChange={(e) => handleChange('displayName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="email" className='mb-2'>E‑mail</Label>
                  <Input id="email" value={form?.email || ''} disabled />
                </div>
                <div>
                  <Label htmlFor="phone" className='mb-2'>Telefone</Label>
                  <Input
                    id="phone"
                    value={form?.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="department" className='mb-2'>Setor</Label>
                  <Input
                    id="department"
                    value={form?.department || ''}
                    onChange={(e) => handleChange('department', e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-secti-primary">
                  {profile.displayName || 'Sem nome'}
                </h2>
                <p className="text-sm text-secti-muted">{profile.email}</p>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <span className="font-bold">Função:</span>{' '}
            <span className="capitalize">{formatRole(profile.role)}</span>
          </div>
          <div>
            <span className="font-bold">Criado em:</span>{' '}
            {profile.createdAt
              ? new Date(profile.createdAt).toLocaleString()
              : '-'}
          </div>
          {profile.phone && (
            <div>
              <span className="font-bold">Telefone:</span> {formatPhoneNumber(profile.phone)}
            </div>
          )}
          {profile.department && (
            <div>
              <span className="font-bold">Setor:</span> {profile.department}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {editMode ? (
            <div className="flex gap-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className=""
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditMode(false);
                  setForm(profile);
                }}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setEditMode(true)}
              className=""
            >
              Editar perfil
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={() => setShowSecurity((v) => !v)}
            className="text-sm"
          >
            {showSecurity ? 'Ocultar opções de segurança' : 'Mostrar opções de segurança'}
          </Button>

          {showSecurity && (
            <div className="mt-4 p-4 bg-gray-50 border border-secti-border rounded-lg space-y-4">
              {/* email verification */}
              {auth.currentUser && !auth.currentUser.emailVerified && (
                <div>
                  <p className="text-[12px]">E-mail não verificado.</p>
                  <Button
                    size="sm"
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
                    Reenviar verificação
                  </Button>
                </div>
              )}

              {/* last login info */}
              {auth.currentUser && auth.currentUser.metadata && (
                <div className="text-[12px]">
                  Último acesso: {auth.currentUser.metadata.lastSignInTime}
                </div>
              )}

              {/* change password form */}
              <div className="space-y-2">
                <Label htmlFor="currentPwd">Senha atual</Label>
                <Input
                  id="currentPwd"
                  type="password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                />
                <Label htmlFor="newPwd">Nova senha</Label>
                <Input
                  id="newPwd"
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                />
                <Label htmlFor="confirmPwd">Confirme a nova senha</Label>
                <Input
                  id="confirmPwd"
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                />
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
                    } catch (err) {
                      console.error(err);
                      toast.error('Erro ao alterar senha');
                    } finally {
                      setPwdSaving(false);
                    }
                  }}
                  disabled={pwdSaving || !currentPwd || !newPwd || !confirmPwd}
                  size="sm"
                >
                  {pwdSaving ? 'Atualizando...' : 'Alterar senha'}
                </Button>
              </div>

              {/* logout button */}
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await signOut(auth);
                  }}
                >
                  Sair
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
