import { useState, useMemo } from 'react';
import { Bell, X, AlertTriangle, Clock, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Contract } from '../types/contract';
import { getContractStatus, formatDate } from '../utils/contract-helpers';
import { db } from '../../firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

interface NotificationCenterProps {
  contracts: Contract[];
  currentUserUid?: string;
  onContractClick?: (contract: Contract) => void;
}

interface Notification {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  contract: Contract;
  timestamp: Date;
}

export function NotificationCenter({ contracts, currentUserUid, onContractClick }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const notifications = useMemo(() => {
    const notifs: Notification[] = [];
    const now = new Date();

    contracts.forEach((contract) => {
      const status = getContractStatus(contract);
      const days = status.daysRemaining;

      // remove notificações que usuário já leu
      if (currentUserUid && contract.readBy?.includes(currentUserUid)) {
        return;
      }

      // Notificação crítica: menos de 15 dias ou já vencido
      if (days < 15 || status.type === 'expired') {
        notifs.push({
          id: `${contract.id}-critical`,
          type: 'critical',
          title: status.type === 'expired' ? 'Contrato Vencido' : 'Vencimento Crítico',
          message: `${contract.numeroContrato || contract.numeroConvenio} - ${contract.empresa || contract.convenente} ${
            status.type === 'expired' ? 'está vencido' : `vence em ${days} dias`
          }`,
          contract,
          timestamp: now,
        });
      }
      // Notificação de aviso: entre 15 e 30 dias
      else if (days < 30) {
        notifs.push({
          id: `${contract.id}-warning`,
          type: 'warning',
          title: 'Vencimento Próximo',
          message: `${contract.numeroContrato || contract.numeroConvenio} - ${contract.empresa || contract.convenente} vence em ${days} dias`,
          contract,
          timestamp: now,
        });
      }
    });

    return notifs.sort((a, b) => {
      // Ordenar por tipo (crítico primeiro) e depois por dias restantes
      const typeOrder = { critical: 0, warning: 1, info: 2 };
      if (typeOrder[a.type] !== typeOrder[b.type]) {
        return typeOrder[a.type] - typeOrder[b.type];
      }
      const aDays = getContractStatus(a.contract).daysRemaining;
      const bDays = getContractStatus(b.contract).daysRemaining;
      return aDays - bDays;
    });
  }, [contracts, currentUserUid]);

  const activeNotifications = notifications.filter(n => !dismissedIds.has(n.id));
  const unreadCount = activeNotifications.length;
  const hasCritical = activeNotifications.some(n => n.type === 'critical');

  const handleDismiss = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds(prev => new Set([...prev, id]));
    // marquer como lido no Firestore
    if (currentUserUid) {
      const contractId = id.split('-')[0];
      try {
        const ref = doc(db, 'contracts', contractId);
        await updateDoc(ref, {
          readBy: arrayUnion(currentUserUid),
        } as any);
      } catch (err) {
        console.error('erro marcando notificação como lida', err);
      }
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // also mark as read when user opens it
    if (currentUserUid) {
      try {
        const contractId = notification.id.split('-')[0];
        const ref = doc(db, 'contracts', contractId);
        await updateDoc(ref, {
          readBy: arrayUnion(currentUserUid),
        } as any);
      } catch (err) {
        console.error('erro marcando notificação como lida', err);
      }
    }
    onContractClick?.(notification.contract);
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <FileText className="w-5 h-5 text-blue-600" />;
    }
  };

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'critical':
        return 'border-l-4 border-l-red-500 bg-red-50 hover:bg-red-100';
      case 'warning':
        return 'border-l-4 border-l-yellow-500 bg-yellow-50 hover:bg-yellow-100';
      default:
        return 'border-l-4 border-l-blue-500 bg-blue-50 hover:bg-blue-100';
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative hover:bg-gray-100 ${hasCritical ? 'ring-2 ring-red-500' : ''}`}
        aria-label="Notificações"
      >
        <Bell className={`w-5 h-5 ${hasCritical ? 'text-red-600 animate-ping' : ''}`} />
        {unreadCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-5 min-w-5 px-1 bg-red-600 text-white text-xs font-bold border-2 border-white animate-pulse"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-gray-700" />
                <h3 className="font-semibold text-gray-900">Notificações</h3>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className="h-[400px]">
              {activeNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="bg-gray-100 p-4 rounded-full mb-3">
                    <Bell className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Nenhuma notificação</p>
                  <p className="text-xs text-gray-500 mt-1">Você está em dia!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {activeNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 cursor-pointer transition-colors ${getNotificationStyle(notification.type)}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 mb-1">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-700 break-words">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Vigência: {formatDate(notification.contract.vigenciaAtual)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDismiss(notification.id, e)}
                          className="h-6 w-6 hover:bg-white/50 flex-shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}
