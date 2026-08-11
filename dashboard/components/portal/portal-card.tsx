/**
 * PortalCard — Contenedor card reutilizable con tokens del portal.
 * Soporta hover, active, y padding variants.
 */

'use client';

import { type MouseEvent, type MouseEventHandler, type ReactNode } from 'react';

type Padding = 'none' | 'sm' | 'md' | 'lg';

interface PortalCardProps {
  children: ReactNode;
  /** Si `true`, agrega hover lift + shadow */
  hover?: boolean;
  padding?: Padding;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  onMouseEnter?: MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: MouseEventHandler<HTMLDivElement>;
}

const PADDINGS: Record<Padding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

/**
 *
 * @param root0
 * @param root0.children
 * @param root0.hover
 * @param root0.padding
 * @param root0.className
 * @param root0.style
 * @param root0.onClick
 * @param root0.onMouseEnter
 * @param root0.onMouseLeave
 */
export function PortalCard({
  children,
  hover = false,
  padding = 'md',
  className = '',
  style,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: PortalCardProps) {
  return (
    <div
      className={`portal-card ${PADDINGS[padding]} ${hover ? 'hoverable' : ''} ${className}`}
      style={style}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e as unknown as MouseEvent<HTMLDivElement>);
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
