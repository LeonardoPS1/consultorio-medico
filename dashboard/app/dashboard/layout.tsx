import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { GatedContent } from '@/components/gated-content';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <GatedContent>
            {children}
          </GatedContent>
        </main>
        {/* Footer compacto */}
        <footer className="flex items-center justify-between border-t px-4 lg:px-6 py-2.5 text-[11px] text-muted-foreground/60">
          <span>© {new Date().getFullYear()} {process.env.NEXT_PUBLIC_TENANT_NAME || 'AiCoreMed'}</span>
          <span className="hidden sm:inline">v{process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}</span>
        </footer>
      </div>
    </div>
  );
}
