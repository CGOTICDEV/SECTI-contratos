import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import {
  ShieldCheck,
  UserPlus,
  LockKeyhole,
  ChevronLeft,
  Camera,
  UploadCloud,
  User,
  Eye,
  EyeOff
} from 'lucide-react';
import { formatPhoneNumber } from '../utils/contract-helpers';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogClose,
} from './ui/dialog';

const sectiDomain = '@secti.ba.gov.br';

interface AuthProps {
  onLogin: (email: string, password: string) => void;
  onRegister: (
    username: string,
    email: string,
    password: string,
    role: 'gestor' | 'fiscal',
    photoBase64: string,
    phone?: string,
    department?: string
  ) => void;
  onForgotPassword: (email: string) => void;
  onSendEmailLink: (email: string) => void;
}

export function Login({ onLogin, onRegister, onForgotPassword, onSendEmailLink }: AuthProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'gestor' | 'fiscal'>('gestor');
  const [photoBase64, setPhotoBase64] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [modalType, setModalType] = useState<'forgot' | 'link' | null>(null);
  const [modalEmail, setModalEmail] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emailNormalized = email.trim().toLowerCase();
  const emailValid = emailNormalized.endsWith(sectiDomain);
  const isLoginFormComplete = emailValid && password.trim();
  const isRegisterFormComplete =
    username.trim() &&
    emailValid &&
    password.trim() &&
    photoBase64; // phone/department optional

  useEffect(() => {
    if (!isRegistering) {
      setUsername('');
      setRole('gestor');
      setPhotoBase64('');
      setPhone('');
      setDepartment('');
    }
    setInfoMessage('');
  }, [isRegistering]);

  const handleAction = async () => {
    if (!emailValid) {
      toast.error('Uso obrigatório de e-mail institucional com domínio secti.ba.gov.br');
      return;
    }
    if (isRegistering && !isRegisterFormComplete) {
      toast.error('Preencha todos os campos antes de prosseguir.');
      return;
    }
    if (!isRegistering && !isLoginFormComplete) {
      toast.error('Informe e-mail e senha válidos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedEmail = email.trim();

      if (isRegistering) {
        const cleanPhone = phone ? phone.replace(/\D/g, '') : undefined;
        await onRegister(
          username.trim(),
          trimmedEmail,
          password,
          role,
          photoBase64,
          cleanPhone,
          department || undefined
        );
        setIsRegistering(false);
        setInfoMessage('Solicitação enviada. Verifique seu e‑mail institucional antes de tentar entrar.');
      } else {
        await onLogin(trimmedEmail, password);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgot = async (emailParam?: string) => {
    const targetEmail = emailParam ?? email;
    await onForgotPassword(targetEmail);
  };

  const handleSendLink = async (emailParam?: string) => {
    const targetEmail = emailParam ?? email;
    await onSendEmailLink(targetEmail);
  };

  const handleModalSubmit = async () => {
    if (!modalEmail.trim()) return;
    let tgt = modalEmail;
    if (!tgt.includes('@')) {
      tgt = tgt + sectiDomain;
      setModalEmail(tgt);
    }
    if (!tgt.toLowerCase().endsWith(sectiDomain)) {
      toast.error('E-mail institucional inválido.');
      return;
    }
    setModalSubmitting(true);
    setInfoMessage('');
    try {
      if (modalType === 'forgot') {
        await onForgotPassword(tgt);
        setInfoMessage('Link de recuperação enviado.');
      } else if (modalType === 'link') {
        await onSendEmailLink(tgt);
        setInfoMessage('Link de acesso enviado.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Falha ao processar pedido.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const closeModal = () => {
    setModalType(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans antialiased text-secti-text">

      <div className="absolute inset-0 bg-[#0B2046]" />

      <div
        className="absolute inset-0 z-0 transition-all duration-700 ease-in-out"
        style={{
          backgroundImage: 'url("https://scontent.fssa32-1.fna.fbcdn.net/v/t39.30808-6/639857635_1369437978556046_4516167643094290937_n.jpg?_nc_cat=111&ccb=1-7&_nc_sid=2a1932&_nc_ohc=N8rZ_2shfzQQ7kNvwEs5-Y0&_nc_oc=AdkOrqgijE7d4jeAgzqNZ-Y38L6JLwNT1ahfGIo_7bJHlfUw3JLdZlzwaeUr5FG05lo&_nc_zt=23&_nc_ht=scontent.fssa32-1.fna&_nc_gid=K5qOVfZfCv1-cnxAlhbM5Q&oh=00_Afu8sU_Oh5ILwlq1iARcnVz4IaVNlw6rCg48bbilDzmZAQ&oe=69A24234")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          clipPath: 'polygon(0 0, 100% 0, 0 100%)',
        }}
      >
        <div className="absolute inset-0 bg-[#0B2046]/40 backdrop-blur-[1px]" />
      </div>

      <div className="relative z-10 w-full max-w-[420px] p-4 animate-in fade-in zoom-in duration-500">
        <div className="bg-white border border-secti-border shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-xl overflow-hidden">
          <header className="bg-[#0B2046] p-8 text-center border-b-4 border-[#00D1FF]">
            <img
              src="/MARCA GOVBA 0126 - DO LADO DA GENTE__H.png"
              alt="Marca GOVBA"
              className="mx-auto mb-2 w-30"
            />
            <h1 className="text-2xl font-bold text-white tracking-tight">SECTI - Contratos</h1>
            <p className="text-[#00D1FF] text-[10px] font-mono uppercase tracking-[0.2em] mt-1">
              Controle de Acesso
            </p>
          </header>

          <div className="p-8 space-y-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAction();
              }}
              className="space-y-6"
            >
              <section className="text-center">
                <h2 className="text-lg font-bold text-secti-primary uppercase tracking-tight">
                  {isRegistering ? 'Solicitar Ingresso' : 'Identificação do usuário'}
                </h2>
                <p className="text-sm text-secti-muted mt-1">
                  {isRegistering ? 'Cadastre suas credenciais no sistema' : 'Insira suas chaves para acessar o painel'}
                </p>
              </section>

              <div className="space-y-4">
                {isRegistering && (
                  <div className="flex flex-col items-center space-y-3 pb-2">
                    <Label className="text-[10px] font-bold uppercase text-secti-muted self-start ml-1">Identificação Visual</Label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="relative w-24 h-24 rounded-full border-2 border-dashed border-secti-border bg-gray-50 flex items-center justify-center cursor-pointer hover:border-secti-accent transition-all group overflow-hidden"
                    >
                      {photoBase64 ? (
                        <img src={photoBase64} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-2">
                          <Camera className="w-6 h-6 text-secti-muted mx-auto group-hover:text-secti-accent" />
                          <span className="text-[8px] text-secti-muted uppercase font-bold block mt-1">Foto</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-secti-primary/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <UploadCloud className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                {isRegistering && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-secti-muted ml-1">Nome de Usuário</Label>
                    <div className="relative">
                      <Input
                        className="pl-10 border-secti-border bg-gray-50 focus:ring-2 focus:ring-secti-secondary h-11"
                        placeholder="Ex: José.Santos"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secti-muted" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-secti-muted ml-1">E-mail Institucional</Label>
                  <Input
                    type="email"
                    className={`border-secti-border bg-gray-50 h-11 transition-colors ${email && !emailValid ? 'border-red-400' : ''}`}
                    placeholder="nome.sobrenome@secti.ba.gov.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => {
                      if (email && !email.includes('@')) {
                        setEmail(email + sectiDomain);
                      }
                    }}
                  />
                </div>

                {isRegistering && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-secti-muted ml-1">Posto de Serviço</Label>
                      <Select value={role} onValueChange={(v: 'gestor' | 'fiscal' | 'ccc') => setRole(v as any)}>
                        <SelectTrigger className="border-secti-border bg-gray-50 h-11">
                          <SelectValue placeholder="Selecione sua função" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gestor">Gestor</SelectItem>
                          <SelectItem value="fiscal">Fiscal</SelectItem>
                          <SelectItem value="ccc">CCC - Coordenação de Convênios e Contratos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-secti-muted ml-1">Telefone (opcional)</Label>
                      <Input
                        className="border-secti-border bg-gray-50 h-11"
                        value={phone}
                        onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                        placeholder="(xx)xxxxx-xxxx"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-secti-muted ml-1">Setor (opcional)</Label>
                      <Input
                        className="border-secti-border bg-gray-50 h-11"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-secti-muted ml-1">Chave de Acesso</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      className="pl-10 pr-10 border-secti-border bg-gray-50 focus:ring-2 focus:ring-secti-secondary h-11"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secti-muted" />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-secti-muted"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-[#0B2046] hover:bg-[#0056B3] text-white font-bold uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95 mt-4"
                disabled={isSubmitting || (isRegistering ? !isRegisterFormComplete : !isLoginFormComplete)}
              >
                {isSubmitting ? (
                  <div className="chaotic-orbit text-white"></div>
                ) : isRegistering ? (
                  'Solicitar Credencial'
                ) : (
                  'Acessar o Sistema'
                )}
              </Button>

              {!isRegistering && (
                <div className="flex justify-between mt-2 text-[11px] font-medium">
                  <button onClick={() => { setModalEmail(email.includes('@') ? email : email + sectiDomain); setModalType('forgot'); }} className="text-secti-primary hover:underline">Esqueci minha senha</button>
                  <button onClick={() => { setModalEmail(email.includes('@') ? email : email + sectiDomain); setModalType('link'); }} className="text-secti-primary hover:underline">Entrar via link</button>
                </div>
              )}
            </form>
            <footer className="pt-4 border-t border-secti-border flex flex-col items-center gap-3">
              <button
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-[11px] font-bold text-secti-primary hover:text-secti-secondary flex items-center gap-2 uppercase tracking-tighter transition-colors"
              >
                {isRegistering ? <ChevronLeft className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {isRegistering ? 'Voltar para o Login' : 'Novo Usuário?  Solicitar Registro'}
              </button>
            </footer>
          </div>

          {/* modal for forgot/password and email link */}
          <Dialog open={!!modalType} onOpenChange={(open) => { if (!open) closeModal(); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{modalType === 'forgot' ? 'Recuperar senha' : 'Acesso por link'}</DialogTitle>
                <DialogDescription>Informe o e‑mail institucional e clique em enviar.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-secti-muted ml-1">E-mail</Label>
                <Input
                  type="email"
                  value={modalEmail}
                  onChange={(e) => setModalEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleModalSubmit();
                    }
                  }}
                />
              </div>
              {infoMessage && <p className="text-[10px] text-secti-primary mt-1">{infoMessage}</p>}
              <DialogFooter>
                <Button variant="ghost" onClick={closeModal} disabled={modalSubmitting}>Cancelar</Button>
                <Button onClick={handleModalSubmit} disabled={modalSubmitting || !modalEmail.trim()}>
                  {modalSubmitting ? 'Enviando...' : 'Enviar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="bg-gray-50 p-4 text-center border-t border-secti-border">
            <p className="text-[9px] text-secti-muted uppercase font-mono leading-none tracking-widest">
              SECTI/BA © 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}