/**
 * PortalBadge — Badge de estado con colores del portal.
 * Variants: primary, success, warning, destructive, muted
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'destructive' | 'muted' | 'accent' | 'teal';

interface PortalBadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-[#2563EB]/10 text-[#2563EB]',
  success: 'bg-[#34D399]/15 text-[#059669] dark:text-[#34D399]',
  warning: 'bg-[#FBBF24]/15 text-[#D97706] dark:text-[#FBBF24]',
  destructive: 'bg-[#F87171]/15 text-[#DC2626] dark:text-[#F87171]',
  muted: 'bg-portal-muted text-portal-muted-fg',
  accent: 'bg-[#A78BFA]/15 text-[#7C3AED] dark:text-[#A78BFA]',
  teal: 'bg-[#14B8A6]/15 text-[#0D9488] dark:text-[#2DD4BF]',
};

/**
 *
 * @param root0
 * @param root0.variant
 * @param root0.children
 * @param root0.className
 * @param root0.style
 */
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
