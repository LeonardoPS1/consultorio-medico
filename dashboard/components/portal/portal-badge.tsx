/**
 * PortalBadge — Badge de estado con colores del portal.
 * Variants: primary, success, warning, destructive, muted
 */

import type { ReactNode } from 'react';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'destructive' | 'muted' | 'accent';

interface PortalBadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const VARIANT_STYLES: Record<BadgeVariant, React.CSSProperties> = {
  primary: {
    background: 'hsl(var(--portal-primary) / 0.1)',
    color: 'hsl(var(--portal-primary))',
  },
  success: {
    background: 'hsl(var(--portal-success) / 0.1)',
    color: 'hsl(var(--portal-success))',
  },
  warning: {
    background: 'hsl(var(--portal-warning) / 0.1)',
    color: 'hsl(var(--portal-warning))',
  },
  destructive: {
    background: 'hsl(var(--portal-destructive) / 0.1)',
    color: 'hsl(var(--portal-destructive))',
  },
  muted: {
    background: 'hsl(var(--portal-muted))',
    color: 'hsl(var(--portal-muted-foreground))',
  },
  accent: {
    background: 'hsl(var(--portal-accent) / 0.1)',
    color: 'hsl(var(--portal-accent))',
  },
};

export function PortalBadge({
  variant = 'muted',
  children,
  className = '',
  style,
}: PortalBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${className}`}
      style={{
        ...VARIANT_STYLES[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
