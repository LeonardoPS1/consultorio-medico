/**
 * PortalButton — Botón primario azul sólido radius-full con micro-interacciones.
 */

'use client';

import { Loader2 } from 'lucide-react';
import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { playClick } from '@/lib/sound';
import { cn } from '@/lib/utils';

interface PortalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}

const BASE =
  'rounded-full font-semibold text-sm transition-all duration-200 cursor-pointer px-6 py-2.5 h-11 inline-flex items-center justify-center whitespace-nowrap shrink-0';

const VARIANTS: Record<string, string> = {
  primary:
    'bg-[#2563EB] text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)] hover:bg-[#3B82F6] hover:shadow-[0_4px_14px_rgba(37,99,235,0.35)]',
  secondary:
    'bg-white text-portal-fg border border-portal-border hover:bg-portal-muted',
  ghost: 'bg-transparent text-portal-muted-fg hover:text-portal-fg hover:bg-portal-muted/60',
};

/**
 *
 * @param root0
 * @param root0.children
 * @param root0.loading
 * @param root0.fullWidth
 * @param root0.variant
 * @param root0.disabled
 * @param root0.style
 * @param root0.className
 * @param root0.onClick
 */
export function PortalButton({
  children,
  loading = false,
  fullWidth = false,
  variant = 'primary',
  disabled,
  style,
  className,
  onClick,
  ...rest
}: PortalButtonProps) {
  return (
    <button
      {...rest}
      onClick={(e) => {
        playClick();
        onClick?.(e);
      }}
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
