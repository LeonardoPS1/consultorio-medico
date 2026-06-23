'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SlotDisponible } from '@/lib/services/portal-booking';

interface SlotPickerProps {
  medicoId: string;
  servicioId: string;
  onSelectSlot: (slot: SlotDisponible) => void;
  selectedSlot?: SlotDisponible | null;
}

export function SlotPicker({ medicoId, servicioId, onSelectSlot, selectedSlot }: SlotPickerProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotDisponible[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generar días de la semana para el calendario (próximos 30 días)
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 30; i++) {
    const d = new Date(currentDate);
    d.setDate(currentDate.getDate() + i - currentDate.getDate());
    days.push(d);
  }

  // Ir a la semana siguiente/anterior
  const goForward = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };
  const goBack = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 7);
    if (prev >= today) setCurrentDate(prev);
  };

  // Cargar slots al seleccionar fecha
  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    setError(null);

    fetch(`/api/portal/medicos/${medicoId}/slots?fecha=${selectedDate}&servicioId=${servicioId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSlots(data.slots ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [medicoId, servicioId, selectedDate]);

  // Agrupar slots por mañana/tarde
  const manana = slots.filter((s) => {
    const h = new Date(s.fechaHora).getHours();
    return h < 13;
  });
  const tarde = slots.filter((s) => {
    const h = new Date(s.fechaHora).getHours();
    return h >= 13;
  });

  // Obtener semana visible
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    if (d >= today) weekDays.push(d);
  }

  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const formatHora = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div className="space-y-4">
      {/* Calendario semanal */}
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" size="icon" onClick={goBack} disabled={weekDays[0] <= today}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </span>
        <Button variant="ghost" size="icon" onClick={goForward}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dayNames.map((name) => (
          <div key={name} className="text-center text-xs text-muted-foreground py-1">
            {name}
          </div>
        ))}
        {weekDays.map((d) => {
          const dateStr = formatDate(d);
          const isToday = dateStr === formatDate(today);
          const isSelected = dateStr === selectedDate;
          const canBook = d >= today;
          return (
            <button
              key={dateStr}
              disabled={!canBook}
              onClick={() => canBook && setSelectedDate(dateStr)}
              className={cn(
                'rounded-lg text-center py-2 text-sm transition-all duration-150 active:scale-90',
                isSelected && 'bg-primary text-primary-foreground',
                !isSelected && canBook && 'hover:bg-muted',
                isToday && !isSelected && 'ring-1 ring-primary/30',
                !canBook && 'text-muted-foreground/30 cursor-not-allowed',
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      {/* Slots disponibles */}
      {selectedDate && (
        <div>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-20 rounded-lg" />
                ))}
              </div>
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay horarios disponibles para esta fecha.
            </p>
          ) : (
            <div className="space-y-3">
              {manana.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">MAÑANA</p>
                  <div className="flex gap-2 flex-wrap stagger-premium">
                    {manana.map((slot) => (
                      <SlotButton
                        key={slot.fechaHora}
                        slot={slot}
                        isSelected={selectedSlot?.fechaHora === slot.fechaHora}
                        onClick={() => onSelectSlot(slot)}
                        formatHora={formatHora}
                      />
                    ))}
                  </div>
                </div>
              )}
              {tarde.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">TARDE</p>
                  <div className="flex gap-2 flex-wrap stagger-premium">
                    {tarde.map((slot) => (
                      <SlotButton
                        key={slot.fechaHora}
                        slot={slot}
                        isSelected={selectedSlot?.fechaHora === slot.fechaHora}
                        onClick={() => onSelectSlot(slot)}
                        formatHora={formatHora}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SlotButton({
  slot,
  isSelected,
  onClick,
  formatHora,
}: {
  slot: SlotDisponible;
  isSelected: boolean;
  onClick: () => void;
  formatHora: (iso: string) => string;
}) {
  return (
    <Button
      variant={isSelected ? 'default' : 'outline'}
      size="sm"
      className="gap-1.5"
      onClick={onClick}
    >
      <Clock className="h-3 w-3" />
      {formatHora(slot.fechaHora)}
      {slot.precio != null && slot.precio > 0 && (
        <span className="text-[10px] opacity-70">${slot.precio.toLocaleString('es-CL')}</span>
      )}
    </Button>
  );
}
