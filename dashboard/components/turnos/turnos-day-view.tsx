'use client';

import { DayTimeline, type MedicoDia, type TurnoDia } from '@/components/turnos/day-timeline';
import { TurnosDateNav } from '@/components/turnos/turnos-date-nav';

interface TurnosDayViewProps {
  selectedDate: Date;
  dayViewData: {
    medicos: MedicoDia[];
    turnos: TurnoDia[];
    fecha: string;
  } | null;
  dayViewLoading: boolean;
  onDateNavigate: (delta: number) => void;
  onGoToToday: () => void;
  onTurnoClick: (turno: TurnoDia) => void;
  onSlotClick: (medicoId: string, hora: string) => void;
}

/**
 *
 * @param root0
 * @param root0.selectedDate
 * @param root0.dayViewData
 * @param root0.dayViewLoading
 * @param root0.onDateNavigate
 * @param root0.onGoToToday
 * @param root0.onTurnoClick
 * @param root0.onSlotClick
 */
export function TurnosDayView({
  selectedDate,
  dayViewData,
  dayViewLoading,
  onDateNavigate,
  onGoToToday,
  onTurnoClick,
  onSlotClick,
}: TurnosDayViewProps) {
  return (
    <div className="space-y-3">
      <TurnosDateNav
        selectedDate={selectedDate}
        onNavigate={onDateNavigate}
        onGoToToday={onGoToToday}
        rightExtra={
          dayViewData ? (
            <span className="text-xs text-muted-foreground">
              {dayViewData.turnos.length} turno
              {dayViewData.turnos.length !== 1 ? 's' : ''} ·{' '}
              {dayViewData.medicos.length} médico
              {dayViewData.medicos.length !== 1 ? 's' : ''}
            </span>
          ) : undefined
        }
      />

      {dayViewLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : dayViewData ? (
        <DayTimeline
          medicos={dayViewData.medicos}
          turnos={dayViewData.turnos}
          fecha={dayViewData.fecha}
          onTurnoClick={onTurnoClick}
          onSlotClick={onSlotClick}
        />
      ) : null}
    </div>
  );
}
