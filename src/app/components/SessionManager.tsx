import { useEffect, useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface SessionManagerProps {
  inactivityTimeout?: number; // em minutos
  warningTime?: number; // em segundos antes do logout
  onSessionExpired?: () => void;
}

export function SessionManager({
  inactivityTimeout = 30,
  warningTime = 60,
  onSessionExpired,
}: SessionManagerProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(warningTime);
  const timeoutRef = useRef<number | undefined>(undefined);
  const warningTimeoutRef = useRef<number | undefined>(undefined);
  const countdownIntervalRef = useRef<number | undefined>(undefined);

  const resetTimer = () => {
    // Limpar timers existentes
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    setShowWarning(false);
    
    // Timer para mostrar aviso
    const warningMs = (inactivityTimeout * 60 * 1000) - (warningTime * 1000);
    warningTimeoutRef.current = window.setTimeout(() => {
      setShowWarning(true);
      setRemainingTime(warningTime);
      
      // Contagem regressiva
      countdownIntervalRef.current = window.setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warningMs);

    // Timer para logout automático
    timeoutRef.current = window.setTimeout(() => {
      handleLogout();
    }, inactivityTimeout * 60 * 1000);
  };

  const handleLogout = async () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    
    setShowWarning(false);
    
    try {
      await signOut(auth);
      toast.info('Sessão encerrada por inatividade');
      onSessionExpired?.();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleStayLoggedIn = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    resetTimer();
    toast.success('Sessão renovada!');
  };

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      if (!showWarning) {
        resetTimer();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    resetTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [inactivityTimeout, warningTime, showWarning]);

  return (
    <AlertDialog open={showWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sessão expirando</AlertDialogTitle>
          <AlertDialogDescription>
            Sua sessão será encerrada por inatividade em{' '}
            <span className="font-bold text-red-600">{remainingTime} segundos</span>.
            <br />
            Deseja continuar conectado?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleLogout}>Sair Agora</AlertDialogCancel>
          <AlertDialogAction onClick={handleStayLoggedIn}>
            Continuar Conectado
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook para rastrear histórico de login
export function useLoginHistory() {
  const saveLoginEvent = (email: string) => {
    const history = getLoginHistory();
    const newEvent = {
      email,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ip: 'N/A', // Requer serviço backend para obter IP real
    };
    
    history.unshift(newEvent);
    
    // Manter apenas os últimos 10 logins
    const trimmed = history.slice(0, 10);
    localStorage.setItem('login-history', JSON.stringify(trimmed));
  };

  const getLoginHistory = () => {
    try {
      const stored = localStorage.getItem('login-history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  return { saveLoginEvent, getLoginHistory };
}
