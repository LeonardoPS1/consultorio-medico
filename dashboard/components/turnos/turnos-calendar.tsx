'use client';

import { CalendarView } from '@/components/calendar/calendar-view';
import type { CalendarioTurno } from '@/components/calendar/calendar-view';

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

/**
 *
 * @param root0
 * @param root0.turnos
 * @param root0.viewMode
 * @param root0.onViewModeChange
 * @param root0.onDateChange
 */
export function TurnosCalendar({
  turnos,
  viewMode,
  onViewModeChange,
  onDateChange,
}: TurnosCalendarProps) {
  return (
    <CalendarView
      turnos={turnos as CalendarioTurno[]}
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
