'use client';

import { useLayoutConfig } from '@/lib/layout-config';
import { cn } from '@/lib/utils';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';

export function MainContent({ children }: { children: React.ReactNode }) {
  const { config } = useLayoutConfig();

  const isCentered = config.variant === 'centered';

  return (
    <>
      <main
        id="main-content"
        className={cn(
          'flex-1 overflow-y-auto',
          config.contentMaxWidth || 'p-3 sm:p-4 lg:p-6',
        )}
      >
        <div className={cn(isCentered && 'max-w-2xl mx-auto p-3 sm:p-4 lg:p-6')}>
          <Breadcrumbs />
          {children}
        </div>
      </main>
      {config.showFooter && (
        <footer className="flex items-center justify-between border-t px-3 sm:px-4 lg:px-6 py-2.5 sm:py-2 text-[11px] text-muted-foreground/60">
          <span>
            &copy; {new Date().getFullYear()} {process.env.NEXT_PUBLIC_TENANT_NAME || 'AiCoreMed'}
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
              v{process.env.NEXT_PUBLIC_APP_VERSION || '1.18.0'}
            </span>
          </span>
        </footer>
      )}
    </>
  );
}
