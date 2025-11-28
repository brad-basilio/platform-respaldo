import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface NotificationData {
  type: string;
  message: string;
  voucher_id?: number;
  installment_number?: number;
  action?: string;
  status?: string;
  rejection_reason?: string;
  reviewed_by?: string;
  student_name?: string;
  contract_acceptance_id?: number;
  pdf_path?: string;
}

interface Notification {
  id: string;
  type: string;
  data: NotificationData;
  read_at: string | null;
  created_at: string;
}

interface NotificationBellProps {
  userId: number;
  userRole: string;
}

export default function NotificationBell({ userId, userRole }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Cargar notificaciones iniciales
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const response = await fetch('/api/notifications');
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };

    loadNotifications();
  }, []);

  // Escuchar notificaciones en tiempo real
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const echoInstance = (window as any).Echo;
    if (!echoInstance) {
      console.error('❌ Echo no está configurado');
      return;
    }

    // LIMPIAR COMPLETAMENTE - Eliminar listeners previos
    console.log('🧹 [NotificationBell] Limpiando canales previos antes de suscribirse...');
    try {
      echoInstance.leave(`private-App.Models.User.${userId}`);
      if (userRole === 'cashier' || userRole === 'admin') {
        echoInstance.leave('private-cashiers');
      }
      if (userRole === 'sales_advisor' || userRole === 'admin') {
        echoInstance.leave(`private-advisor.${userId}`);
      }
    } catch (e) {
      // Si falla el leave, continuar (puede ser que no exista el canal)
      console.log('⚠️ Error al limpiar canales (puede ser normal):', e);
    }

    console.log(`🔔 [NotificationBell] Montando listeners NUEVOS para usuario ${userId} con rol ${userRole}...`);

    // Función auxiliar para manejar nuevas notificaciones
    const handleNewNotification = (notification: Notification) => {
      // Evitar duplicados si llegan por ambos canales
      setNotifications((prev) => {
        const exists = prev.some(n =>
          n.data.message === notification.data.message &&
          new Date(n.created_at).getTime() > Date.now() - 5000
        );
        if (exists) return prev;
        return [notification, ...prev];
      });

      setUnreadCount((prev) => prev + 1);

      // Mostrar toast
      const message = notification.data.message || 'Nueva notificación';
      toast.info('Nueva notificación', {
        description: message,
        duration: 6000,
      });

      // ⚠️ COMENTADO: Evento global para disparar el modal de revisión de contrato
      // Ya no se requiere porque el contrato pasa automáticamente a "pago_por_verificar"
      
      // // Si es un contrato firmado, disparar evento global
      // if (notification.data.type === 'contract_signed') {
      //   window.dispatchEvent(new CustomEvent('contract-signed-notification', {
      //     detail: notification.data
      //   }));
      // }

      // Reproducir sonido (Comentado hasta que se agregue el archivo notification.mp3)
      /*
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => { });
      } catch { }
      */
    };

    // Escuchar notificaciones personales del usuario
    const userChannel = echoInstance.private(`App.Models.User.${userId}`);

    userChannel.notification((notification: Notification) => {
      console.log('🔔 [Canal Personal] Nueva notificación recibida:', notification);
      handleNewNotification(notification);
    });

    // ⚠️ COMENTADO: Escuchar eventos de contrato firmado por el asesor
    // Ahora el contrato pasa automáticamente a "pago_por_verificar" cuando el estudiante firma
    // Ya no se requiere la aprobación manual del advisor
    
    // // Escuchar eventos de asesor (si el usuario es asesor/admin)
    // if (userRole === 'sales_advisor' || userRole === 'admin') {
    //   console.log(`🔔 [NotificationBell] Suscribiéndose al canal de asesor: advisor.${userId}`);
    //   const advisorChannel = echoInstance.private(`advisor.${userId}`);

    //   // Escuchar el evento con el nombre personalizado '.contract.signed'
    //   advisorChannel.listen('.contract.signed', (data: any) => {
    //     console.log('🔔 [Canal Asesor] Evento ContractSignedByStudent recibido:', data);

    //     const mockNotification: Notification = {
    //       id: `evt_${Date.now()}`,
    //       type: 'App\\Notifications\\ContractSignedNotification',
    //       data: {
    //         type: 'contract_signed',
    //         message: `${data.student_name} ha firmado su contrato.`,
    //         student_name: data.student_name,
    //         contract_acceptance_id: data.contract_acceptance_id,
    //         pdf_path: data.pdf_path
    //       },
    //       read_at: null,
    //       created_at: new Date().toISOString()
    //     };

    //     handleNewNotification(mockNotification);
    //   });
    // }

    // Si es cashier, también escuchar el canal de cashiers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cashierChannel: any;
    if (userRole === 'cashier' || userRole === 'admin') {
      console.log('🔔 [NotificationBell] Suscribiéndose TAMBIÉN al canal private-cashiers...');
      cashierChannel = echoInstance.private('cashiers');

      cashierChannel.listen('.voucher.uploaded', (event: {
        action: string;
        message: string;
        student_name: string;
        installment_number: number;
      }) => {
        console.log('🔔 [Canal Cashiers] Nuevo voucher recibido:', event);

        // Mostrar notificación con toast
        toast.success(`Nuevo voucher ${event.action === 'replaced' ? 'reemplazado' : 'recibido'}!`, {
          description: event.message,
          duration: 8000,
          action: {
            label: 'Ver',
            onClick: () => {
              window.location.href = '/cashier/payment-control';
            }
          }
        });

        // Reproducir sonido (Comentado hasta que se agregue el archivo notification.mp3)
        /*
        try {
          const audio = new Audio('/notification.mp3');
          audio.play().catch(() => {
            // Ignorar errores de audio
          });
        } catch {
          // Ignorar errores de audio
        }
        */
      });
    }

    return () => {
      console.log('🔇 [NotificationBell] DESMONTANDO - Desuscribiéndose de canales...');
      try {
        echoInstance.leave(`private-App.Models.User.${userId}`);
        if (userRole === 'cashier' || userRole === 'admin') {
          echoInstance.leave('private-cashiers');
        }
        if (userRole === 'sales_advisor' || userRole === 'admin') {
          echoInstance.leave(`private-advisor.${userId}`);
        }
        console.log('✅ [NotificationBell] Canales limpiados correctamente');
      } catch (e) {
        console.error('❌ Error al limpiar canales:', e);
      }
    };
  }, [userId, userRole]);

  // Marcar notificación como leída
  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/mark-as-read`, {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-as-read', {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'voucher_status_changed':
        return '💳';
      case 'voucher_uploaded':
        return '📤';
      case 'payment_verified':
        return '✅';
      case 'payment_rejected':
        return '❌';
      case 'contract_signed':
        return '📝';
      default:
        return '🔔';
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto p-1 text-xs"
            >
              Marcar todas como leídas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No tienes notificaciones
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`cursor-pointer p-4 flex flex-col items-start gap-1 ${!notification.read_at ? 'bg-accent/50' : ''
                  }`}
                onClick={() => {
                  if (!notification.read_at) {
                    markAsRead(notification.id);
                  }
                }}
              >
                <div className="flex items-start gap-2 w-full">
                  <span className="text-lg flex-shrink-0">
                    {getNotificationIcon(notification.data.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">
                      {notification.data.message}
                    </p>
                    {notification.data.rejection_reason && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Motivo: {notification.data.rejection_reason}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                  </div>
                  {!notification.read_at && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
