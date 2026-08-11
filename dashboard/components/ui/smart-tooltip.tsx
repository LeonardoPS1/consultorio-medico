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
 *
 * @param root0
 * @param root0.children
 */
export function SmartTooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={500} skipDelayDuration={300}>
      {children}
    </TooltipProvider>
  );
}

/**
 *
 * @param root0
 * @param root0.content
 * @param root0.children
 * @param root0.side
 * @param root0.align
 * @param root0.className
 */
export function SmartTooltip({ content, children, side = 'top', align = 'center', className }: SmartTooltipProps) {
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
