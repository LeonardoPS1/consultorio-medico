'use client';

import { Button } from '@/components/ui/button';
import { Calendar, Plus, List, Clock } from 'lucide-react';

interface TurnosHeaderProps {
  view: 'lista' | 'calendario' | 'dia';
  onViewChange: (view: 'lista' | 'calendario' | 'dia') => void;
  onNewTurno: () => void;
}

export function TurnosHeader({ view, onViewChange, onNewTurno }: TurnosHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-lg border p-1">
          <Button
            variant={view === 'lista' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('lista')}
            aria-label="Vista de lista"
          >
            <List className="h-4 w-4 md:mr-1" />
            <span className="hidden md:inline">Lista</span>
          </Button>
          <Button
            variant={view === 'calendario' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('calendario')}
            aria-label="Vista de calendario"
          >
            <Calendar className="h-4 w-4 md:mr-1" />
            <span className="hidden md:inline">Calendario</span>
          </Button>
          <Button
            variant={view === 'dia' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('dia')}
            aria-label="Vista del día"
          >
            <Clock className="h-4 w-4 md:mr-1" />
            <span className="hidden md:inline">Día</span>
          </Button>
        </div>
      </div>
      <Button onClick={onNewTurno} size="sm" className="text-xs md:text-sm">
        <Plus className="h-4 w-4 md:mr-2" />
        <span className="hidden md:inline">Nuevo Turno</span>
        <kbd className="hidden md:inline ml-2 text-[10px] opacity-50">Ctrl+N</kbd>
      </Button>
    </div>
  );
}
