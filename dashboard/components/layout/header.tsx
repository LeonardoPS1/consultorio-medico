'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bell, Moon, Sun, Calendar, MessageSquare, Syringe, AlertTriangle, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { getInitials, formatRelative } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

// ============================================================
// Tipos de notificaciones
// ============================================================

interface Notificacion {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: 'turno' | 'mensaje' | 'receta' | 'urgencia' | 'sistema';
  leido: boolean;
  href: string;
  tiempo: string;
}

// ============================================================
// Mock de notificaciones
// ============================================================

const notificacionesMock: Notificacion[] = [
  {
    id: 'n1',
    titulo: 'Nuevo mensaje de Juan Pérez',
    descripcion: 'Confirmó su turno para mañana a las 10:00',
    tipo: 'turno',
    leido: false,
    href: '/dashboard/conversaciones',
    tiempo: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 'n2',
    titulo: '🚨 Urgencia: Carlos Ruiz',
    descripcion: 'Reportó dolor en el pecho - Revisar mensaje',
    tipo: 'urgencia',
    leido: false,
    href: '/dashboard/conversaciones',
    tiempo: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: 'n3',
    titulo: 'Recordatorio de turno',
    descripcion: 'María García tiene turno en 1 hora',
    tipo: 'sistema',
    leido: false,
    href: '/dashboard/turnos',
    tiempo: new Date(Date.now() - 60 * 60000).toISOString(),
  },
  {
    id: 'n4',
    titulo: 'Receta pendiente de autorización',
    descripcion: 'Ana López solicitó renovación de Losartán',
    tipo: 'receta',
    leido: true,
    href: '/dashboard/recetas',
    tiempo: new Date(Date.now() - 120 * 60000).toISOString(),
  },
];

// ============================================================
// Iconos por tipo
// ============================================================

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

// ============================================================
// Componente Header
// ============================================================

export function Header() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [notificaciones, setNotificaciones] = useState(notificacionesMock);
  const [notifOpen, setNotifOpen] = useState(false);

  const user = session?.user;
  const nombreCompleto = user?.name || 'Dr.';
  const nameParts = nombreCompleto.split(' ');
  const primerNombre = nameParts[0] || 'Dr.';
  const apellido = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
  const initials = getInitials(primerNombre, apellido);

  const noLeidas = notificaciones.filter((n) => !n.leido).length;

  const marcarLeida = (id: string) => {
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leido: true } : n))
    );
  };

  const marcarTodasLeidas = () => {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leido: true })));
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">
          Bienvenido, {primerNombre}
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Toggle tema */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Cambiar tema"
          className="h-9 w-9"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        {/* Notificaciones */}
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9" title="Notificaciones">
              <Bell className="h-4 w-4" />
              {noLeidas > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                  {noLeidas}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
              <span className="font-semibold">Notificaciones</span>
              {noLeidas > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-primary font-normal"
                  onClick={marcarTodasLeidas}
                >
                  Marcar todas leídas
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-0" />
            <ScrollArea className="h-[300px]">
              {notificaciones.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-24 text-sm text-muted-foreground">
                  <Bell className="h-6 w-6 mb-1 opacity-50" />
                  Sin notificaciones
                </div>
              ) : (
                notificaciones.map((notif) => {
                  const Icon = iconosNotificacion[notif.tipo] || Bell;
                  return (
                    <DropdownMenuItem
                      key={notif.id}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer rounded-none ${
                        !notif.leido ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => {
                        marcarLeida(notif.id);
                        router.push(notif.href);
                        setNotifOpen(false);
                      }}
                    >
                      <div className={`h-8 w-8 rounded-lg ${coloresNotificacion[notif.tipo] || ''} flex items-center justify-center shrink-0`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notif.leido ? 'font-semibold' : ''}`}>
                          {notif.titulo}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {notif.descripcion}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {formatRelative(notif.tiempo)}
                        </p>
                      </div>
                      {!notif.leido && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </DropdownMenuItem>
                  );
                })
              )}
            </ScrollArea>
            <DropdownMenuSeparator className="my-0" />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => { router.push('/dashboard/configuracion?tab=notificaciones'); setNotifOpen(false); }}
              >
                ⚙️ Configurar notificaciones
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Perfil */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{nombreCompleto}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push('/dashboard/configuracion')}>
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
