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
      <PatientPanelProvider>
        <AsistenteProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <CommandPalette />
            <PatientPanel />
            <main id="main-content" className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
              <Suspense fallback={<MainSkeleton />}>
                <PageTransition>
                  <GatedContent>{children}</GatedContent>
                </PageTransition>
              </Suspense>
            </main>
            {/* Footer compacto */}
            <footer className="flex items-center justify-between border-t px-3 sm:px-4 lg:px-6 py-2.5 sm:py-2 text-[11px] text-muted-foreground/60">
              <span>
                © {new Date().getFullYear()} {process.env.NEXT_PUBLIC_TENANT_NAME || 'AiCoreMed'}
              </span>
              <span className="flex items-center gap-3">
                <a
                  href={process.env.NEXT_PUBLIC_REPO_URL || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline hover:text-foreground transition-colors"
                  title="Código fuente en GitHub"
                >
                  GitHub
                </a>
                <span className="hidden sm:inline">
                  v{process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}
                </span>
              </span>
            </footer>
          </div>
        </div>
        <AsistenteFlotante />
        </AsistenteProvider>
      </PatientPanelProvider>
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
