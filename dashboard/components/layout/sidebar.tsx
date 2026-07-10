'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Logo } from '@/components/layout/logo';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { ChevronLeft, ChevronRight, LogOut, X } from 'lucide-react';
import { DEFAULT_TENANT_NAME, resolveTenantName } from '@/lib/tenant-name';

export function Sidebar() {
  const { data: session, status } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [orgNombre, setOrgNombre] = useState(DEFAULT_TENANT_NAME);
  const [onboardingPending, setOnboardingPending] = useState(false);

  const cargarOrg = useCallback(() => {
    fetch('/api/organization')
      .then((r) => r.json())
      .then((res) => {
        setOrgNombre(resolveTenantName(res.data?.nombre));
      })
      .catch(() => console.warn('[Sidebar] Error al cargar organización'));
  }, []);

  useEffect(() => {
    cargarOrg();
    window.addEventListener('organization-updated', cargarOrg);
    return () => window.removeEventListener('organization-updated', cargarOrg);
  }, [cargarOrg]);

  useEffect(() => {
    const handler = () => setMobileOpen((prev) => !prev);
    window.addEventListener('toggle-mobile-sidebar', handler);
    return () => window.removeEventListener('toggle-mobile-sidebar', handler);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [mobileOpen]);

  useEffect(() => {
    const checkProgress = async () => {
      const totalSteps = 6;
      try {
        const res = await fetch('/api/onboarding');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.completedSteps)) {
            const count = data.completedSteps.length;
            setOnboardingPending(count > 0 && count < totalSteps);
          }
        }
      } catch {
        setOnboardingPending(false);
      }
    };
    checkProgress();
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={cn(
          'flex flex-col border-r bg-sidebar text-sidebar-foreground',
          'fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-out w-[85vw] max-w-[320px]',
          'lg:relative lg:z-auto lg:transition-[width] lg:duration-300 lg:w-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
          collapsed ? 'lg:w-16' : 'w-64',
        )}
      >
        <div className="flex h-32 lg:h-[172px] items-center justify-center px-2 border-b border-sidebar-muted relative">
          {!collapsed && (
            <div className="flex flex-col items-center">
              <div className="h-20 w-20 lg:h-40 lg:w-40 shrink-0">
                <Logo className="h-full w-full object-cover" />
              </div>
              <span className="font-semibold text-xs lg:text-sm text-center truncate max-w-[120px] lg:max-w-[160px] leading-none -mt-1">
                {orgNombre}
              </span>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto">
              <Logo className="h-20 w-20 object-cover" />
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-9 w-9 lg:hidden text-sidebar-foreground/60 hoverable:hover:text-sidebar-foreground"
            onClick={closeMobile}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 py-4">
          <SidebarNav
            collapsed={collapsed}
            closeMobile={closeMobile}
            status={status}
            session={session}
            onboardingPending={onboardingPending}
          />
        </ScrollArea>

        <div className="border-t border-sidebar-muted p-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'w-full justify-start text-sidebar-foreground/70 hoverable:hover:text-white hoverable:hover:bg-sidebar-accent',
              collapsed && 'justify-center px-0',
            )}
            onClick={async () => {
              try {
                await signOut({ redirect: false });
              } catch {
                /* NextAuth v5 beta puede lanzar igual */
              }
              window.location.href = '/';
            }}
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="ml-3">Cerrar sesión</span>}
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:flex absolute -right-3 top-20 h-6 w-6 rounded-full border bg-sidebar text-sidebar-foreground hoverable:hover:bg-sidebar-accent"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
      </aside>
    </>
  );
}
