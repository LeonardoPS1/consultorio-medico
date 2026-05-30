'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  gradient?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon,
  action,
  gradient,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4', className)}>
      <div className="flex items-center gap-4 min-w-0">
        {icon && (
          <div className="hidden sm:flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/15 ring-1 ring-primary/20 dark:ring-primary/30">
            <div className="text-primary">{icon}</div>
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="sm:hidden size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/15 ring-1 ring-primary/20 dark:ring-primary/30 flex">
                <div className="text-primary [&>svg]:size-4">{icon}</div>
              </div>
            )}
            <h1
              className={cn(
                'text-2xl sm:text-3xl font-bold tracking-tight text-foreground',
                gradient && 'bg-gradient-to-r from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent',
              )}
            >
              {title}
            </h1>
          </div>

          {description && (
            <p className="text-sm sm:text-base text-muted-foreground/80 mt-1 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>

      {action && (
        <div className="flex shrink-0 items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
}
