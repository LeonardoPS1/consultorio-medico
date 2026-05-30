'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Bell, Moon, Sun, Monitor, Calendar, MessageSquare, Syringe,
  AlertTriangle, X, Menu, Store, ChevronDown, Check, Trash2,
  EyeOff, Eye, BellOff, List
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { getInitials, formatRelative } from '@/lib/utils';
import { DEFAULT_TENANT_NAME, resolveTenantName } from '@/lib/tenant-name';
import { useSucursal } from '@/lib/sucursal-context';
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
// Tipos
// ============================================================

interface NotificacionData {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: 'turno' | 'mensaje' | 'receta' | 'urgencia' | 'sistema';
  leido: boolean;
  href: string | null;
  createdAt: string;
  deletedAt: string | null;
}

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
  const { sucursalId: activeSucursalId, sucursales, setSucursalId, hasMultiple } = useSucursal();
  const [notificaciones, setNotificaciones] = useState<NotificacionData[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [orgNombre, setOrgNombre] = useState(DEFAULT_TENANT_NAME);
  const [orgFirma, setOrgFirma] = useState('Dr.');

  // Evitar hydration mismatch del theme toggle
  useEffect(() => { setMounted(true); }, []);

  // ─── Cargar datos de organización ─────────────────────────
  const cargarOrg = useCallback(() => {
    fetch('/api/organization')
      .then(r => r.json())
      .then(res => {
        if (res.data) {
          if (res.data.avatarUrl) setAvatarUrl(res.data.avatarUrl);
          if (res.data.firmaNombre) setOrgFirma(res.data.firmaNombre);
          setOrgNombre(resolveTenantName(res.data?.nombre));
        }
      })
      .catch(() => console.warn('[Header] Error al cargar datos'));
  }, []);

  useEffect(() => {
    cargarOrg();
    window.addEventListener('organization-updated', cargarOrg);
    return () => window.removeEventListener('organization-updated', cargarOrg);
  }, [cargarOrg]);

  // ─── Cargar notificaciones ─────────────────────────────────
  const cargarNotificaciones = useCallback(async () => {
    setLoadingNotif(true);
    try {
      const res = await fetch('/api/notificaciones?limit=20&soloNoLeidas=false');
      if (!res.ok) return;
      const json = await res.json();
      setNotificaciones(json.data || []);
      setNoLeidas(json.noLeidas || 0);
    } catch {
      console.warn('[Header] Error al cargar notificaciones');
    } finally {
      setLoadingNotif(false);
    }
  }, []);

  // Cargar al montar y cada 60s
  useEffect(() => {
    cargarNotificaciones();
    const interval = setInterval(cargarNotificaciones, 60000);
    return () => clearInterval(interval);
  }, [cargarNotificaciones]);

  // Recargar al abrir el dropdown
  useEffect(() => {
    if (notifOpen) cargarNotificaciones();
  }, [notifOpen, cargarNotificaciones]);

  // ─── Acciones ──────────────────────────────────────────────

  const marcarLeida = async (id: string) => {
    try {
      await fetch(`/api/notificaciones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read' }),
      });
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leido: true } : n));
      setNoLeidas(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Error al marcar leída', e);
    }
  };

  const marcarNoLeida = async (id: string) => {
    try {
      await fetch(`/api/notificaciones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unread' }),
      });
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leido: false } : n));
      setNoLeidas(prev => prev + 1);
    } catch (e) {
      console.error('Error al marcar no leída', e);
    }
  };

  const marcarTodasLeidas = async () => {
    try {
      await fetch('/api/notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leidas' }),
      });
      setNotificaciones(prev => prev.map(n => ({ ...n, leido: true })));
      setNoLeidas(0);
    } catch (e) {
      console.error('Error al marcar todas leídas', e);
    }
  };

  const eliminarNotificacion = async (id: string) => {
    try {
      await fetch(`/api/notificaciones/${id}`, { method: 'DELETE' });
      setNotificaciones(prev => prev.filter(n => n.id !== id));
      setNoLeidas(prev =>
        prev - (notificaciones.find(n => n.id === id)?.leido ? 0 : 1)
      );
    } catch (e) {
      console.error('Error al eliminar notificación', e);
    }
  };

  const handleNotifClick = (notif: NotificacionData) => {
    if (!notif.leido) marcarLeida(notif.id);
    if (notif.href) {
      router.push(notif.href);
      setNotifOpen(false);
    }
  };

  const user = session?.user;
  const nombreCompleto = user?.name || 'Dr.';
  const nameParts = nombreCompleto.trim().split(/\s+/);
  const initials = nameParts.length > 1
    ? (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase()
    : nameParts[0].charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      <div className="flex items-center gap-2 lg:gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-9 w-9 shrink-0"
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'))}
          title="Menú"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Avatar className="h-8 w-8 lg:h-9 lg:w-9 ring-2 ring-border shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="h-full w-full rounded-full object-cover" />
          ) : (
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {orgFirma.charAt(0).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="min-w-0">
          <h1 className="text-sm lg:text-base font-semibold text-foreground truncate">
            {orgFirma || 'Dr.'}
          </h1>
          <p className="text-[11px] lg:text-xs text-muted-foreground truncate hidden sm:block">
            {orgNombre} · {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {/* Selector de sucursal */}
        {hasMultiple && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground ml-1 shrink-0">
                <Store className="h-3.5 w-3.5" />
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {sucursales.find(s => s.id === activeSucursalId)?.nombre || 'Sucursal'}
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Cambiar sucursal</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sucursales.map(s => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => setSucursalId(s.id)}
                  className={s.id === activeSucursalId ? 'bg-accent font-medium' : ''}
                >
                  <Store className="h-3.5 w-3.5 mr-2" />
                  {s.nombre}
                  {s.id === activeSucursalId && <span className="ml-auto text-[10px] text-primary">Activa</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Toggle tema con dropdown (Light / Dark / System) */}
        {mounted && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" title="Cambiar tema">
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Cambiar tema</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => setTheme('light')} className="gap-2">
                <Sun className="h-4 w-4" />
                <span>Claro</span>
                {theme === 'light' && <span className="ml-auto text-xs text-primary">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')} className="gap-2">
                <Moon className="h-4 w-4" />
                <span>Oscuro</span>
                {theme === 'dark' && <span className="ml-auto text-xs text-primary">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')} className="gap-2">
                <Monitor className="h-4 w-4" />
                <span>Sistema</span>
                {theme === 'system' && <span className="ml-auto text-xs text-primary">✓</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Notificaciones */}
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9" title="Notificaciones">
              <Bell className="h-4 w-4" />
              {noLeidas > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                  {noLeidas > 99 ? '99+' : noLeidas}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
              <span className="font-semibold">Notificaciones</span>
              <div className="flex items-center gap-1">
                {noLeidas > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 text-xs text-primary font-normal"
                    onClick={marcarTodasLeidas}
                    title="Marcar todas leídas"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Leídas
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1 text-xs text-muted-foreground font-normal"
                  onClick={() => { router.push('/dashboard/notificaciones'); setNotifOpen(false); }}
                  title="Ver todas"
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-0" />
            <ScrollArea className="h-[350px]">
              {loadingNotif && notificaciones.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-24 text-sm text-muted-foreground">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mb-1" />
                  Cargando...
                </div>
              ) : notificaciones.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-24 text-sm text-muted-foreground">
                  <BellOff className="h-6 w-6 mb-1 opacity-50" />
                  Sin notificaciones
                </div>
              ) : (
                notificaciones.slice(0, 15).map((notif) => {
                  const Icon = iconosNotificacion[notif.tipo] || Bell;
                  return (
                    <div
                      key={notif.id}
                      className={`group relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors rounded-none ${
                        !notif.leido ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/50'
                      }`}
                    >
                      {/* Click principal → marcar leído + navegar */}
                      <div
                        className="flex items-start gap-3 flex-1 min-w-0"
                        onClick={() => handleNotifClick(notif)}
                      >
                        <div className={`h-8 w-8 rounded-lg ${coloresNotificacion[notif.tipo] || ''} flex items-center justify-center shrink-0`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm pr-6 ${!notif.leido ? 'font-semibold' : ''}`}>
                            {notif.titulo}
                          </p>
                          {notif.descripcion && (
                            <p className="text-xs text-muted-foreground truncate">
                              {notif.descripcion}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                            {formatRelative(notif.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* Indicador de no leído */}
                      {!notif.leido && (
                        <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}

                      {/* Acciones: hover */}
                      <div className="absolute top-2 right-1 hidden group-hover:flex items-center gap-0.5 bg-background/90 backdrop-blur-sm rounded-lg border shadow-xs p-0.5">
                        {notif.leido ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); marcarNoLeida(notif.id); }}
                            className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
                            title="Marcar como no leída"
                          >
                            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); marcarLeida(notif.id); }}
                            className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
                            title="Marcar como leída"
                          >
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); eliminarNotificacion(notif.id); }}
                          className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 transition-colors"
                          title="Eliminar notificación"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </ScrollArea>
            <DropdownMenuSeparator className="my-0" />
            <div className="p-2 flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs text-muted-foreground"
                onClick={() => { router.push('/dashboard/notificaciones'); setNotifOpen(false); }}
              >
                Ver todas
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs text-muted-foreground"
                onClick={() => { router.push('/dashboard/configuracion?tab=notificaciones'); setNotifOpen(false); }}
              >
                ⚙️ Configurar
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Perfil */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
              <Avatar className="h-8 w-8">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                )}
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
            <DropdownMenuItem onClick={async () => {
              await signOut({ redirect: false });
              window.location.href = '/';
            }}>
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
