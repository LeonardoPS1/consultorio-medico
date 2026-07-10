'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getTurnoColor, getTurnoLabel } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ============================================================
// Tipos
// ============================================================

export interface CalendarioTurno {
  id: string;
  hora: string;
  paciente: string;
  tipo: string;
  medico: string;
  estado: string;
  fecha: string; // ISO date string
}

interface CalendarViewProps {
  turnos: CalendarioTurno[];
  onDateChange?: (date: Date) => void;
  onTurnoClick?: (turno: CalendarioTurno) => void;
  viewMode?: 'mes' | 'dia';
  onViewModeChange?: (mode: 'mes' | 'dia') => void;
}

// ============================================================
// Helpers
// ============================================================

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

// ============================================================
// Componente
// ============================================================

export function CalendarView({
  turnos,
  onDateChange,
  onTurnoClick,
  viewMode: viewModeProp,
  onViewModeChange,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'mes' | 'dia'>(viewModeProp ?? 'mes');

  // Sync with parent if controlled
  useEffect(() => {
    if (viewModeProp && viewModeProp !== viewMode) {
      setViewMode(viewModeProp);
    }
  }, [viewModeProp]);

  const setViewModeInternal = useCallback(
    (mode: 'mes' | 'dia') => {
      setViewMode(mode);
      onViewModeChange?.(mode);
    },
    [onViewModeChange],
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const turnosDelDia = useMemo(() => {
    return turnos.filter((t) => {
      const tDate = new Date(t.fecha);
      return isSameDay(tDate, selectedDate);
    });
  }, [turnos, selectedDate]);

  const getTurnosForDay = useCallback(
    (day: number) => {
      const date = new Date(year, month, day);
      return turnos.filter((t) => {
        const tDate = new Date(t.fecha);
        return isSameDay(tDate, date);
      });
    },
    [turnos, year, month],
  );

  const navigateMonth = (delta: number) => {
    const newDate = new Date(year, month + delta, 1);
    setCurrentDate(newDate);
    if (onDateChange) onDateChange(newDate);
  };

  const navigateDay = (delta: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + delta);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  return (
    <div className="space-y-4">
      {/* Vista de Mes */}
      {viewMode === 'mes' && (
        <Card>
          <CardContent className="p-4">
            {/* Navegación del mes */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" aria-label="Mes anterior" onClick={() => navigateMonth(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-lg font-semibold min-w-[200px] text-center">
                  {MESES[month]} {year}
                </h3>
                <Button variant="outline" size="icon" aria-label="Mes siguiente" onClick={() => navigateMonth(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToToday} className="ml-2">
                  Hoy
                </Button>
              </div>
            </div>

            {/* Grilla del mes */}
            <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
              {/* Días de la semana */}
              {DIAS.map((dia) => (
                <div
                  key={dia}
                  className="bg-background p-2 text-center text-xs font-medium text-muted-foreground"
                >
                  {dia}
                </div>
              ))}

              {/* Días del mes */}
              {days.map((day, i) => {
                if (day === null) {
                  return <div key={`empty-${i}`} className="bg-background p-2 min-h-[80px]" />;
                }

                const date = new Date(year, month, day);
                const turnosDelDia = getTurnosForDay(day);
                const isSelected = isSameDay(date, selectedDate);
                const isTodayDate = isToday(date);

                return (
                  <div
                    key={day}
                    className={`bg-background p-1.5 min-h-[80px] cursor-pointer transition-colors hoverable:hover:bg-muted/50 ${
                      isSelected ? 'ring-2 ring-primary ring-inset' : ''
                    }`}
                    onClick={() => {
                      setSelectedDate(date);
                      setViewModeInternal('dia');
                    }}
                  >
                    <div
                      className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                        isTodayDate ? 'bg-primary text-primary-foreground' : ''
                      }`}
                    >
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {turnosDelDia.slice(0, 3).map((t) => (
                        <div
                          key={t.id}
                          className="text-[10px] truncate rounded px-1 py-0.5 text-white font-medium"
                          style={{ backgroundColor: getTurnoColor(t.estado) }}
                        >
                          {t.hora} {t.paciente.split(' ')[0]}
                        </div>
                      ))}
                      {turnosDelDia.length > 3 && (
                        <div className="text-[10px] text-muted-foreground text-center">
                          +{turnosDelDia.length - 3} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vista de Día */}
      {viewMode === 'dia' && (
        <Card>
          <CardContent className="p-4">
            {/* Navegación del día */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" aria-label="Día anterior" onClick={() => navigateDay(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-lg font-semibold min-w-[200px] text-center">
                  {selectedDate.toLocaleDateString('es-CL', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </h3>
                <Button variant="outline" size="icon" aria-label="Día siguiente" onClick={() => navigateDay(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToToday} className="ml-2">
                  Hoy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewModeInternal('mes')}
                  className="ml-2"
                >
                  Ver mes
                </Button>
              </div>
            </div>

            {/* Timeline del día */}
            <div className="space-y-2">
              {turnosDelDia.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg font-medium">Sin turnos</p>
                  <p className="text-sm">No hay turnos agendados para este día</p>
                </div>
              ) : (
                turnosDelDia
                  .sort((a, b) => a.hora.localeCompare(b.hora))
                  .map((turno) => (
                    <div
                      key={turno.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hoverable:hover:bg-muted/50 transition-colors cursor-pointer border-l-4"
                      style={{ borderLeftColor: getTurnoColor(turno.estado) }}
                      onClick={() => onTurnoClick?.(turno)}
                    >
                      <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 text-primary font-bold text-sm">
                        {turno.hora}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{turno.paciente}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {turno.tipo} · {turno.medico}
                        </p>
                      </div>
                      <Badge
                        className="shrink-0"
                        variant="outline"
                        style={{
                          backgroundColor: `${getTurnoColor(turno.estado)}20`,
                          color: getTurnoColor(turno.estado),
                          borderColor: `${getTurnoColor(turno.estado)}40`,
                        }}
                      >
                        {getTurnoLabel(turno.estado)}
                      </Badge>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
