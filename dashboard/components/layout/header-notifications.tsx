'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Calendar, MessageSquare, Syringe, AlertTriangle, Eye, EyeOff, Trash2 } from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import { useNotifications } from '@/lib/hooks/use-notifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

const iconosNotificacion: Record<string, React.ElementType> = {
  turno: Calendar,
  mensaje: MessageSquare,
  receta: Syringe,
  urgencia: AlertTriangle,
  sistema: Bell,
};

const coloresNotificacion: Record<string, string> = {
  turno: 'text-blue-500 bg-blue-100 dark:bg-blue-950/50',
  mensaje: 'text-green-500 bg-green-100 dark:bg-green-950/50',
  receta: 'text-purple-500 bg-purple-100 dark:bg-purple-950/50',
  urgencia: 'text-red-500 bg-red-100 dark:bg-red-950/50 animate-pulse-soft',
  sistema: 'text-amber-500 bg-amber-100 dark:bg-amber-950/50',
};

const coloresBadge: Record<string, string> = {
  urgencia: 'bg-red-500',
  receta: 'bg-purple-500',
  turno: 'bg-blue-500',
  mensaje: 'bg-green-500',
  sistema: 'bg-amber-500',
};

const labelsCortos: Record<string, string> = {
  urgencia: '!',
  receta: 'R',
  turno: 'T',
  mensaje: 'M',
  sistema: 'S',
};

const ordenBadges = ['urgencia', 'receta', 'turno', 'mensaje', 'sistema'] as const;

interface NotificacionData {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: 'turno' | 'mensaje' | 'receta' | 'urgencia' | 'sistema';
  prioridad: number;
  leido: boolean;
  href: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export function NotificationsDropdown() {
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const {
    notificaciones,
    noLeidas,
    noLeidasVisibles,
    conteoPorTipoVisible,
    isLoading: loadingNotif,
    marcarLeida,
    marcarNoLeida,
    eliminar: eliminarNotificacion,
    marcarTodasLeidas,
  } = useNotifications();

  const handleNotifClick = (notif: NotificacionData) => {
    if (!notif.leido) marcarLeida(notif.id);
    if (notif.href) {
      router.push(notif.href);
      setNotifOpen(false);
    }
  };

  return (
    <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10"
          title="Notificaciones"
          aria-label="Notificaciones"
        >
          <Bell className="h-[18px] w-[18px]" />
          {noLeidasVisibles > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex items-center gap-[1px]">
              {noLeidasVisibles > 9 ? (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white px-0.5">
                  {noLeidasVisibles > 99 ? '99+' : noLeidasVisibles}
                </span>
              ) : (
                ordenBadges
                  .filter((tipo) => conteoPorTipoVisible[tipo] > 0)
                  .slice(0, 3)
                  .map((tipo) => (
                    <span
                      key={tipo}
                      className={`flex h-[14px] min-w-[14px] items-center justify-center rounded-full ${coloresBadge[tipo]} text-[8px] font-bold text-white leading-none px-[2px]`}
                      title={`${tipo}: ${conteoPorTipoVisible[tipo]} sin leer`}
                    >
                      {labelsCortos[tipo]}
                    </span>
                  ))
              )}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[85vw] max-w-[320px] p-0 overflow-hidden"
        sideOffset={8}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="px-3 py-2.5 border-b space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Notificaciones</span>
            {noLeidas > 0 && (
              <button
                onClick={() => marcarTodasLeidas()}
                className="text-xs text-primary hover:underline font-medium"
              >
                Leer todas
              </button>
            )}
          </div>
          {Object.values(conteoPorTipoVisible).some((v) => v > 0) && (
            <div className="flex items-center gap-1.5">
              {ordenBadges.map((tipo) => {
                const count = conteoPorTipoVisible[tipo];
                if (count === 0) return null;
                const TipoIcon = iconosNotificacion[tipo];
                return (
                  <span
                    key={tipo}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${coloresNotificacion[tipo]}`}
                  >
                    <TipoIcon className="h-2.5 w-2.5" />
                    {count}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <ScrollArea className="max-h-[340px]">
          {loadingNotif && notificaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
              Cargando...
            </div>
          ) : notificaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground">
              <Bell className="h-6 w-6 mb-2 opacity-40" />
              Sin notificaciones
            </div>
          ) : (
            notificaciones.slice(0, 15).map((notif) => {
              const Icon = iconosNotificacion[notif.tipo] || Bell;
              return (
                <div
                  key={notif.id}
                  className={`group flex items-start gap-2.5 px-3 py-2.5 border-b last:border-0 transition-colors ${
                    !notif.leido ? 'bg-primary/[0.03]' : ''
                  } hover:bg-muted/40`}
                >
                  <div
                    className={`h-7 w-7 rounded-lg ${coloresNotificacion[notif.tipo] || ''} flex items-center justify-center shrink-0 mt-0.5`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={`text-[13px] leading-tight ${!notif.leido ? 'font-semibold' : ''} truncate`}
                      >
                        {notif.titulo}
                      </p>
                      <span
                        className={`shrink-0 inline-flex items-center rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wide ${
                          coloresNotificacion[notif.tipo] || ''
                        }`}
                      >
                        {notif.tipo}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                      {formatRelative(notif.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity mt-0.5">
                    {notif.leido ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          marcarNoLeida(notif.id);
                        }}
                        className="h-9 w-9 sm:h-6 sm:w-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
                        title="Marcar como no leída"
                        aria-label="Marcar como no leída"
                      >
                        <EyeOff className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-muted-foreground/60" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          marcarLeida(notif.id);
                        }}
                        className="h-9 w-9 sm:h-6 sm:w-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
                        title="Marcar como leída"
                        aria-label="Marcar como leída"
                      >
                        <Eye className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-muted-foreground/60" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        eliminarNotificacion(notif.id);
                      }}
                      className="h-9 w-9 sm:h-6 sm:w-6 flex items-center justify-center rounded hover:bg-destructive/10 transition-colors"
                      title="Eliminar"
                      aria-label="Eliminar notificación"
                    >
                      <Trash2 className="h-3 w-3 text-destructive/60" />
                    </button>
                  </div>

                  {!notif.leido && (
                    <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-2.5" />
                  )}
                </div>
              );
            })
          )}
        </ScrollArea>

        <div className="border-t">
          <DropdownMenuItem
            className="justify-center text-xs text-muted-foreground rounded-none py-2.5 cursor-pointer"
            onClick={() => {
              router.push('/dashboard/notificaciones');
              setNotifOpen(false);
            }}
          >
            Ver todas las notificaciones
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
