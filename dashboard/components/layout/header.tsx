'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UpdateBadge } from '@/components/layout/update-badge';
import { NotificationsDropdown } from '@/components/layout/header-notifications';
import {
  Moon,
  Sun,
  Monitor,
  Menu,
  Store,
  ChevronDown,
  Search,
  Users,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { getInitials, formatRelative } from '@/lib/utils';
import { DEFAULT_TENANT_NAME, resolveTenantName } from '@/lib/tenant-name';
import { useSucursal } from '@/lib/sucursal-context';
import { usePatientPanel } from '@/lib/hooks/use-patient-panel';
import { useLayoutConfig } from '@/lib/layout-config';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ============================================================
// Componente Header
// ============================================================

export function Header() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { sucursalId: activeSucursalId, sucursales, setSucursalId, hasMultiple } = useSucursal();
  const { open: openPatientPanel } = usePatientPanel();
  const { config } = useLayoutConfig();
  const [mounted, setMounted] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [orgNombre, setOrgNombre] = useState(DEFAULT_TENANT_NAME);
  const [orgFirma, setOrgFirma] = useState('Dr.');

  // Evitar hydration mismatch del theme toggle
  useEffect(() => {
    setMounted(true);
  }, []);

  // ─── Ctrl+Shift+P shortcut para Patient Panel ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        openPatientPanel();
      }
    };
    // Custom event from other components
    const customHandler = () => openPatientPanel();

    window.addEventListener('keydown', handler);
    window.addEventListener('open-patient-panel', customHandler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('open-patient-panel', customHandler);
    };
  }, [openPatientPanel]);

  // ─── Cargar datos de organización ─────────────────────────
  const cargarOrg = useCallback(() => {
    fetch('/api/organization')
      .then((r) => r.json())
      .then((res) => {
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

  const user = session?.user;
  const nombreCompleto = user?.name || 'Dr.';
  const nameParts = nombreCompleto.trim().split(/\s+/);
  const initials =
    nameParts.length > 1
      ? (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase()
      : nameParts[0].charAt(0).toUpperCase();

  const isMinimal = config.headerMode === 'minimal';

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 px-3 sm:px-4 lg:px-6">
      <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 min-w-0">
        {isMinimal ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'))}
            title="Menú"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </Button>
        ) : (
          <>
        {/* Hamburger — mobile only */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-10 w-10 shrink-0"
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'))}
          title="Menú"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Avatar className="h-8 w-8 sm:h-9 sm:w-9 ring-2 ring-border shrink-0">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={orgFirma || 'Avatar'} />
          ) : (
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {orgFirma.charAt(0).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-semibold text-foreground truncate">
            {orgFirma || 'Dr.'}
          </h1>
          <p className="text-[11px] lg:text-xs text-muted-foreground truncate hidden sm:block">
            {orgNombre} ·{' '}
            {new Date().toLocaleDateString('es-CL', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
        {/* Selector de sucursal */}
        {hasMultiple && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 sm:h-9 gap-1 text-xs text-muted-foreground hover:text-foreground ml-1 shrink-0"
              >
                <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {sucursales.find((s) => s.id === activeSucursalId)?.nombre || 'Sucursal'}
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Cambiar sucursal
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sucursales.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => setSucursalId(s.id)}
                  className={s.id === activeSucursalId ? 'bg-accent font-medium' : ''}
                >
                  <Store className="h-3.5 w-3.5 mr-2" />
                  {s.nombre}
                  {s.id === activeSucursalId && (
                    <span className="ml-auto text-[10px] text-primary">Activa</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Command Palette trigger */}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 text-muted-foreground hover:text-foreground hover:bg-accent hidden sm:flex"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-command-palette'));
          }}
          title="Buscar (⌘K)"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="text-xs">Buscar</span>
          <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        {/* Patient Panel trigger */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 sm:hidden"
          onClick={() => openPatientPanel()}
          title="Pacientes (Ctrl+Shift+P)"
          aria-label="Abrir panel de pacientes"
        >
          <Users className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 text-muted-foreground hover:text-foreground hover:bg-accent hidden sm:flex"
          onClick={() => openPatientPanel()}
          title="Pacientes (Ctrl+Shift+P)"
        >
          <Users className="h-3.5 w-3.5" />
          <span className="text-xs">Pacientes</span>
          <kbd className="ml-1 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground">
            ⇧⌘P
          </kbd>
        </Button>
        {/* Toggle tema con dropdown (Light / Dark / System) */}
        {mounted && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10" title="Cambiar tema">
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-[transform,opacity] dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-[transform,opacity] dark:rotate-0 dark:scale-100" />
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

        {/* Novedades / Actualización */}
        <UpdateBadge />

        {/* Notificaciones */}
        <NotificationsDropdown />

        {/* Perfil */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" aria-label="Menú de perfil">
              <Avatar className="h-8 w-8">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-full w-full rounded-full object-cover"
                  />
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
                <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push('/dashboard/configuracion')}>
              <svg
                className="h-4 w-4 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await signOut({ redirect: false });
                } catch {
                  /* NextAuth v5 beta puede lanzar igual */
                }
                window.location.href = '/';
              }}
            >
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
          </>
        )}
      </div>
    </header>
  );
}
