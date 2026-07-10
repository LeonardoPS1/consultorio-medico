/**
 * PortalButton — Botón gradiente teal→violet con micro-interacciones.
 */

'use client';

import { cn } from '@/lib/utils';
import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface PortalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}

const BASE =
  'rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer border-none outline-none px-5 py-2.5 h-11';

const VARIANTS: Record<string, string> = {
  primary:
    'bg-gradient-to-r from-portal-primary to-portal-accent text-white shadow-[0_4px_12px_hsl(var(--portal-primary)/0.25)] hover:shadow-[0_6px_20px_hsl(var(--portal-primary)/0.35)]',
  secondary: 'bg-portal-muted text-portal-fg border border-portal-border-light',
  ghost: 'bg-transparent text-portal-muted-fg/60',
};

export function PortalButton({
  children,
  loading = false,
  fullWidth = false,
  variant = 'primary',
  disabled,
  style,
  className,
  ...rest
}: PortalButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        'active:scale-[0.97]',
        BASE,
        VARIANTS[variant],
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className,
      )}
      style={{
        width: fullWidth ? '100%' : undefined,
        ...style,
      }}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
