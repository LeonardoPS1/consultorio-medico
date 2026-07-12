'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface TurnosDateNavProps {
  selectedDate: Date;
  onNavigate: (delta: number) => void;
  onGoToToday: () => void;
  rightExtra?: ReactNode;
}

export function TurnosDateNav({
  selectedDate,
  onNavigate,
  onGoToToday,
  rightExtra,
}: TurnosDateNavProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => onNavigate(-1)} aria-label="Fecha anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm sm:text-lg font-semibold min-w-[120px] sm:min-w-[200px] text-center truncate">
          <span className="hidden sm:inline">
            {selectedDate.toLocaleDateString('es-CL', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
          <span className="sm:hidden">
            {selectedDate.toLocaleDateString('es-CL', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </h3>
        <Button variant="outline" size="icon" onClick={() => onNavigate(1)} aria-label="Fecha siguiente">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="ml-2" onClick={onGoToToday}>
          Hoy
        </Button>
      </div>
      {rightExtra}
    </div>
  );
}
