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

export function SmartTooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={500} skipDelayDuration={300}>
      {children}
    </TooltipProvider>
  );
}

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
