/**
 * PortalButton — Botón gradiente teal→violet con micro-interacciones.
 */

'use client';

import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface PortalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}

const BASE: React.CSSProperties = {
  borderRadius: '0.75rem',
  fontWeight: 600,
  fontSize: '0.875rem',
  transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
  cursor: 'pointer',
  border: 'none',
  outline: 'none',
};

const VARIANTS: Record<string, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, hsl(var(--portal-primary)), hsl(var(--portal-accent)))',
    color: '#fff',
    boxShadow: '0 4px 12px hsl(var(--portal-primary) / 0.25)',
  },
  secondary: {
    background: 'hsl(var(--portal-muted))',
    color: 'hsl(var(--portal-foreground))',
    border: '1px solid hsl(var(--portal-border-light))',
  },
  ghost: {
    background: 'transparent',
    color: 'hsl(var(--portal-muted-foreground) / 0.6)',
  },
};

export function PortalButton({
  children,
  loading = false,
  fullWidth = false,
  variant = 'primary',
  disabled,
  style,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: PortalButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className="active:scale-[0.97]"
      style={{
        ...BASE,
        ...VARIANTS[variant],
        width: fullWidth ? '100%' : undefined,
        padding: '0.625rem 1.25rem',
        height: '2.75rem',
        opacity: disabled || loading ? 0.5 : 1,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (variant === 'primary' && !disabled) {
          e.currentTarget.style.boxShadow = '0 6px 20px hsl(var(--portal-primary) / 0.35)';
        }
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (variant === 'primary') {
          e.currentTarget.style.boxShadow = '0 4px 12px hsl(var(--portal-primary) / 0.25)';
        }
        onMouseLeave?.(e);
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
