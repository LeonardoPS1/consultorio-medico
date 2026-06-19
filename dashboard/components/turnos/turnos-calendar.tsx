'use client';

import { CalendarView } from '@/components/calendar/calendar-view';

// ─── Types ────────────────────────────────────────────────

interface TurnoData {
  id: string;
  hora: string;
  paciente: string;
  tipo: string;
  medico: string;
  medicoId: string;
  pacienteId: string;
  estado: string;
  fecha: string;
}

interface TurnosCalendarProps {
  turnos: TurnoData[];
  viewMode: 'mes' | 'dia';
  onViewModeChange: (mode: 'mes' | 'dia') => void;
  onDateChange: (date: Date) => void;
}

// ─── Component ────────────────────────────────────────────

export function TurnosCalendar({
  turnos,
  viewMode,
  onViewModeChange,
  onDateChange,
}: TurnosCalendarProps) {
  return (
    <CalendarView
      turnos={turnos as any}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
      onDateChange={(date: Date) => {
        onDateChange(date);
      }}
      onTurnoClick={() => {
        // onClick handled by parent
      }}
    />
  );
}
