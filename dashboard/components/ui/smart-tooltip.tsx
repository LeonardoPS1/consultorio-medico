'use client';

import * as React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SmartTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

/**
 * Proveedor de tooltips con retraso inteligente.
 * @param {{ children: React.ReactNode }} root0 - Props del componente.
 * @param {React.ReactNode} root0.children - Contenido a envolver.
 * @returns {React.JSX.Element} Proveedor de tooltips.
 */
export function SmartTooltipProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <TooltipProvider delayDuration={500} skipDelayDuration={300}>
      {children}
    </TooltipProvider>
  );
}

/**
 * Tooltip con contenido personalizado y retraso inteligente.
 * @param {SmartTooltipProps} root0 - Props del componente.
 * @param {React.ReactNode} root0.content - Contenido mostrado en el tooltip.
 * @param {React.ReactNode} root0.children - Elemento que dispara el tooltip.
 * @param {'top' | 'bottom' | 'left' | 'right'} root0.side - Lado donde se muestra el tooltip.
 * @param {'start' | 'center' | 'end'} root0.align - Alineación del tooltip.
 * @param {string} root0.className - Clases CSS adicionales.
 * @returns {React.JSX.Element} Tooltip con su disparador.
 */
export function SmartTooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  className,
}: SmartTooltipProps): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} align={align} className={cn('max-w-[280px]', className)}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
