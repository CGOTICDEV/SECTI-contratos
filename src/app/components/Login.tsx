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
  UserPlus,
  LockKeyhole,
  ChevronLeft,
  Camera,
  UploadCloud,
  User,
  Eye,
  EyeOff,
  HelpCircle
} from 'lucide-react';
import { formatPhoneNumber } from '../utils/contract-helpers';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from './ui/dialog';
import { TutorialModal } from './TutorialModal.tsx';

const sectiDomain = '@secti.ba.gov.br';

const roleDescriptions = {
  gestor: 'Cadastra novos contratos, edita dados (prazos, valores) e acompanha a execução.',
  fiscal: 'Acompanha a execução técnica/financeira, atualiza pagamentos e saldos.',
  ccc: 'Controle externo com acesso global. Pode criar contratos/convênios e adicionar apostilas (notas internas).'
};

interface AuthProps {
  onLogin: (email: string, password: string) => void;
  onRegister: (
    username: string,
    email: string,
    password: string,
    role: 'gestor' | 'fiscal' | 'ccc',
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
  const [role, setRole] = useState<'gestor' | 'fiscal' | 'ccc'>('gestor');
  const [photoBase64, setPhotoBase64] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modais
  const [modalType, setModalType] = useState<'forgot' | 'link' | null>(null);
  const [modalEmail, setModalEmail] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const emailNormalized = email.trim().toLowerCase();
  const emailValid = emailNormalized.endsWith(sectiDomain);
  const isLoginFormComplete = emailValid && password.trim();
  const isRegisterFormComplete =
    username.trim() &&
    emailValid &&
    password.trim() &&
    photoBase64;

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

  // Função robusta para simular a digitação do domínio sem problemas de estado (race conditions)
  const animateDomainTyping = (baseText: string, setFn: React.Dispatch<React.SetStateAction<string>>) => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }
    
    let i = 0;
    
    typingIntervalRef.current = setInterval(() => {
      if (i < sectiDomain.length) {
        setFn(baseText + sectiDomain.substring(0, i + 1));
        i++;
      } else {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
      }
    }, 40); // Velocidade do efeito de digitação (40ms por caractere)
  };

  const handleAction = async () => {
    if (!emailValid) {
      toast.error('Uso obrigatório de e-mail institucional com domínio secti.ba.gov.br');
      return;
    }
    if (isRegistering && !isRegisterFormComplete) {
      toast.error('Preencha todos os campos obrigatórios e adicione uma foto.');
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
        toast.success('Solicitação enviada. Verifique seu e-mail institucional.');
      } else {
        await onLogin(trimmedEmail, password);
      }
    } finally {
      setIsSubmitting(false);
    }
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
    setInfoMessage('');
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
        className="absolute inset-0 z-0 transition-all duration-700 ease-in-out opacity-60"
        style={{
          backgroundImage: 'url("/network_communications_background_with_flowing_cyber_dots_1609.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          clipPath: 'polygon(0 0, 100% 0, 0 100%)',
        }}
      >
        <div className="absolute inset-0 bg-[#0B2046]/50 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 w-full max-w-[420px] p-4 animate-in fade-in zoom-in duration-500">
        <div className="bg-white border border-secti-border shadow-[0_20px_50px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden flex flex-col">
          
          <header className="bg-[#0B2046] p-6 text-center border-b-4 border-[#00D1FF] relative">
            <button 
              onClick={() => setShowTutorial(true)}
              className="absolute top-4 right-4 text-[#00D1FF]/70 hover:text-[#00D1FF] transition-colors"
              title="Como funciona o sistema?"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <img
              src="/MARCA GOVBA 0126 - DO LADO DA GENTE__H.png"
              alt="Marca GOVBA"
              className="mx-auto mb-3 w-28 drop-shadow-md"
            />
            <h1 className="text-xl font-bold text-white tracking-tight">SECTI <span className="font-light">Contratos</span></h1>
          </header>

          <div className="p-8 space-y-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAction();
              }}
              className="space-y-5"
            >
              <section className="text-center mb-6">
                <h2 className="text-lg font-bold text-secti-primary uppercase tracking-tight">
                  {isRegistering ? 'Solicitar Ingresso' : 'Acesso ao Sistema'}
                </h2>
                <p className="text-xs text-secti-muted mt-1">
                  {isRegistering 
                    ? 'Preencha os dados para criar sua credencial' 
                    : 'Utilize seu e-mail institucional para entrar'}
                </p>
              </section>

              {isRegistering && (
                <div className="flex flex-col items-center justify-center pb-2">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-20 h-20 rounded-full border-2 border-dashed border-secti-border bg-gray-50 flex items-center justify-center cursor-pointer hover:border-secti-accent transition-all group overflow-hidden shadow-sm"
                  >
                    {photoBase64 ? (
                      <img src={photoBase64} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-2">
                        <Camera className="w-6 h-6 text-secti-muted mx-auto group-hover:text-secti-accent transition-colors" />
                        <span className="text-[9px] text-secti-muted uppercase font-bold block mt-1">Foto</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-secti-primary/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <UploadCloud className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
                </div>
              )}

              <div className="space-y-4">
                {isRegistering && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-secti-muted ml-1">Nome de Usuário</Label>
                    <div className="relative">
                      <Input
                        className="pl-9 border-secti-border bg-gray-50 focus:ring-2 focus:ring-secti-secondary h-11"
                        placeholder="Ex: José Silva"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secti-muted" />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-secti-muted ml-1">E-mail Institucional</Label>
                  <Input
                    type="email"
                    className={`border-secti-border bg-gray-50 h-11 transition-colors ${email && !emailValid ? 'border-red-400 focus-visible:ring-red-400' : 'focus:ring-2 focus:ring-secti-secondary'}`}
                    placeholder="nome.sobrenome"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => {
                      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
                    }}
                    onBlur={() => {
                      if (email && !email.includes('@')) {
                        animateDomainTyping(email, setEmail);
                      }
                    }}
                  />
                  <p className="text-[9px] text-secti-muted mt-1">Não é preciso digitar {sectiDomain}, será acrescentado automaticamente.</p>
                </div>

                {isRegistering && (
                  <>
                    <div className="space-y-1.5 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                      <Label className="text-[10px] font-bold uppercase text-secti-muted ml-1">Perfil de Acesso</Label>
                      <Select value={role} onValueChange={(v: 'gestor' | 'fiscal' | 'ccc') => setRole(v)}>
                        <SelectTrigger className="border-secti-border bg-white h-11">
                          <SelectValue placeholder="Selecione sua função" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gestor">Gestor</SelectItem>
                          <SelectItem value="fiscal">Fiscal</SelectItem>
                          <SelectItem value="ccc">CCC (Coord. Convênios/Contratos)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-secti-muted/80 pt-1 leading-tight min-h-[32px]">
                        {roleDescriptions[role]}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-secti-muted ml-1">Telefone <span className="font-normal lowercase">(opcional)</span></Label>
                        <Input
                          className="border-secti-border bg-gray-50 h-11 text-sm"
                          value={phone}
                          onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                          placeholder="(71) 90000-0000"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-secti-muted ml-1">Setor <span className="font-normal lowercase">(opcional)</span></Label>
                        <Input
                          className="border-secti-border bg-gray-50 h-11 text-sm"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="Ex: APG"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-secti-muted ml-1">Senha</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      className="pl-9 pr-10 border-secti-border bg-gray-50 focus:ring-2 focus:ring-secti-secondary h-11"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secti-muted" />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-secti-muted hover:text-secti-primary transition-colors"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-12 bg-[#0B2046] hover:bg-[#0056B3] text-white font-bold uppercase tracking-widest text-xs transition-all shadow-md active:scale-[0.98]"
                  disabled={isSubmitting || (isRegistering ? !isRegisterFormComplete : !isLoginFormComplete)}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : isRegistering ? (
                    'Solicitar Credencial'
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </div>

              {!isRegistering && (
                <div className="flex justify-between items-center mt-4 px-1 text-[11px] font-medium">
                  <button type="button" onClick={() => { setModalEmail(email.includes('@') ? email : email + sectiDomain); setModalType('forgot'); }} className="text-secti-primary hover:underline hover:text-[#0056B3] transition-colors">Esqueci a senha</button>
                  <button type="button" onClick={() => { setModalEmail(email.includes('@') ? email : email + sectiDomain); setModalType('link'); }} className="text-secti-primary hover:underline hover:text-[#0056B3] transition-colors">Acesso sem senha (Link)</button>
                </div>
              )}
            </form>

            <footer className="pt-5 border-t border-gray-100 flex flex-col items-center gap-3">
              <button
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-[12px] font-bold text-[#0B2046] hover:text-[#00D1FF] flex items-center gap-2 uppercase tracking-tight transition-colors"
              >
                {isRegistering ? <ChevronLeft className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {isRegistering ? 'Voltar para o Login' : 'Criar nova conta'}
              </button>
            </footer>
          </div>

          <div className="bg-gray-50/80 p-3 text-center border-t border-gray-200">
            <p className="text-[9px] text-gray-400 uppercase font-mono tracking-widest">
              SECTI/BA © 2026
            </p>
          </div>
        </div>
      </div>

      {/* MODAIS (Recuperação de Senha / Link) */}
      <Dialog open={!!modalType} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="sm:max-w-md">
          <>
            <DialogHeader>
              <DialogTitle className="text-[#0B2046]">
                {modalType === 'forgot' ? 'Recuperar senha' : 'Acesso por link mágico'}
              </DialogTitle>
              <DialogDescription>
                Informe seu e‑mail institucional. Enviaremos as instruções para a sua caixa de entrada.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label className="text-[10px] font-bold uppercase text-secti-muted ml-1">E-mail Institucional</Label>
              <Input
                type="email"
                placeholder="nome.sobrenome"
                value={modalEmail}
                onChange={(e) => setModalEmail(e.target.value)}
                onFocus={() => {
                  if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
                }}
                onBlur={() => {
                   if (modalEmail && !modalEmail.includes('@')) {
                     animateDomainTyping(modalEmail, setModalEmail);
                   }
                 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleModalSubmit();
                  }
                }}
              />
              <p className="text-[9px] text-secti-muted mt-1">Digite apenas a parte antes do “@”; o domínio será anexado automaticamente.</p>
              {infoMessage && <p className="text-xs text-green-600 font-medium mt-2">{infoMessage}</p>}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={closeModal} disabled={modalSubmitting}>Cancelar</Button>
              <Button 
                onClick={handleModalSubmit} 
                disabled={modalSubmitting || !modalEmail.trim()}
                className="bg-[#0B2046] hover:bg-[#0056B3] text-white"
              >
                {modalSubmitting ? 'Enviando...' : 'Enviar Link'}
              </Button>
            </DialogFooter>
          </>
        </DialogContent>
      </Dialog>

      {/* TUTORIAL (reutilizável) */}
      <TutorialModal isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
    </div>
  );
}