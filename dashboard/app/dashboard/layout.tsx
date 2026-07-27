import { Suspense } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { CommandPalette } from '@/components/layout/command-palette';
import { PatientPanel } from '@/components/layout/patient-panel';
import { AsistenteFlotante } from '@/components/layout/asistente-flotante';
import { PatientPanelProvider } from '@/lib/hooks/use-patient-panel';
import { AsistenteProvider } from '@/lib/hooks/use-asistente-ia';
import { GatedContent } from '@/components/gated-content';
import { PageTransition } from '@/components/dashboard/page-transition';
import { ClientThemeProvider } from '@/components/client-theme-provider';
import { LayoutConfigProvider } from '@/lib/layout-config';
import { DashboardLayoutClient } from '@/components/dashboard/dashboard-layout-client';
import { MainContent } from '@/components/dashboard/main-content';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <ClientThemeProvider>
      <SidebarProvider>
      <LayoutConfigProvider>
      <PatientPanelProvider>
        <AsistenteProvider>
        <DashboardLayoutClient>
        <div className="flex h-screen overflow-hidden bg-background">
          <div className="ambient-bg" />
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden relative z-[1]">
            <Header />
            <CommandPalette />
            <PatientPanel />
            <MainContent>
              <Suspense fallback={<MainSkeleton />}>
                <PageTransition>
                  <GatedContent>{children}</GatedContent>
                </PageTransition>
              </Suspense>
            </MainContent>
          </div>
        </div>
        <AsistenteFlotante />
        </DashboardLayoutClient>
        </AsistenteProvider>
      </PatientPanelProvider>
      </LayoutConfigProvider>
      </SidebarProvider>
    </ClientThemeProvider>
  );
}

function MainSkeleton() {
  return (
    <div className="space-y-6 animate-in p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
