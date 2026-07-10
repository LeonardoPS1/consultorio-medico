/**
 * PortalBadge — Badge de estado con colores del portal.
 * Variants: primary, success, warning, destructive, muted
 */

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'destructive' | 'muted' | 'accent';

interface PortalBadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-portal-primary/10 text-portal-primary',
  success: 'bg-portal-success/10 text-portal-success',
  warning: 'bg-portal-warning/10 text-portal-warning',
  destructive: 'bg-portal-destructive/10 text-portal-destructive',
  muted: 'bg-portal-muted text-portal-muted-fg',
  accent: 'bg-portal-accent/10 text-portal-accent',
};

export function PortalBadge({
  variant = 'muted',
  children,
  className,
  style,
}: PortalBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium',
        variantStyles[variant],
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
}
