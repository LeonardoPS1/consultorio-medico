'use client';

import { ChevronLeft, ChevronRight, Clock, CalendarDays } from 'lucide-react';
import { useState, useEffect } from 'react';
import { PortalButton } from '@/components/portal/portal-button';
import { PortalCard } from '@/components/portal/portal-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { SlotDisponible } from '@/lib/services/portal-booking';
import { cn } from '@/lib/utils';

interface SlotPickerProps {
  medicoId: string;
  servicioId: string;
  onSelectSlot: (slot: SlotDisponible) => void;
  selectedSlot?: SlotDisponible | null;
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES = [
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

function formatDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 *
 * @param root0
 * @param root0.medicoId
 * @param root0.servicioId
 * @param root0.onSelectSlot
 * @param root0.selectedSlot
 */
export function SlotPicker({ medicoId, servicioId, onSelectSlot, selectedSlot }: SlotPickerProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotDisponible[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Navegación semanal
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

  // Obtener semana visible
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    if (d >= today) weekDays.push(d);
  }

  // Cargar slots al seleccionar fecha
  useEffect(() => {
    if (!selectedDate) return;
// eslint-disable-next-line react-hooks/set-state-in-effect -- setState tras fetch asincrono en mount
    setLoading(true);
    setError(null);

    fetch(`/api/portal/medicos/${medicoId}/slots?fecha=${selectedDate}&servicioId=${servicioId}`)
      .then((r) => r.json())
      .then((data: { data?: SlotDisponible[]; error?: string }) => {
        if (data.error) throw new Error(data.error);
        setSlots(data.data ?? []);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Error al cargar horarios'),
      )
      .finally(() => setLoading(false));
  }, [medicoId, servicioId, selectedDate]);

  // Agrupar slots por mañana/tarde
  const manana = slots.filter((s) => new Date(s.fechaHora).getHours() < 13);
  const tarde = slots.filter((s) => new Date(s.fechaHora).getHours() >= 13);

  return (
    <div className="space-y-4">
      {/* ─── Calendario semanal ──────────────────────────── */}
      <PortalCard padding="sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <PortalButton
            variant="ghost"
            className="h-8 w-8"
            aria-label="Semana anterior"
            onClick={goBack}
            disabled={weekDays[0] <= today}
          >
            <ChevronLeft className="h-4 w-4" />
          </PortalButton>
          <span className="text-sm font-semibold text-portal-fg">
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <PortalButton variant="ghost" className="h-8 w-8" aria-label="Semana siguiente" onClick={goForward}>
            <ChevronRight className="h-4 w-4" />
          </PortalButton>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1">
          {DAY_NAMES.map((name) => (
            <div
              key={name}
              className="text-center text-[10px] sm:text-[11px] font-medium text-portal-muted-fg py-1"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
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
                  'relative rounded-full text-center py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all duration-150',
                  'active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  isSelected && 'bg-[#2563EB] text-white shadow-sm',
                  !isSelected && canBook && 'hover:bg-portal-muted hover:text-portal-fg',
                  isToday && !isSelected && 'ring-1 ring-[#2563EB]/40',
                  !canBook && 'text-portal-muted-fg/25 cursor-not-allowed',
                )}
              >
                {d.getDate()}
                {isToday && !isSelected && (
                  <span className="absolute bottom-0.5 sm:bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#2563EB]/60" />
                )}
              </button>
            );
          })}
        </div>
        </PortalCard>

      {/* ─── Slots disponibles ──────────────────────────── */}
      {selectedDate && (
        <div>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-16 bg-portal-muted" />
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: 5 }).map((_, i) => (
                  // eslint-disable-next-line react/no-array-index-key -- skeleton placeholder
                  <Skeleton key={i} className="h-9 w-20 rounded-full bg-portal-muted" />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4 text-sm text-destructive text-center">
              {error}
            </div>
          ) : slots.length === 0 ? (
            <div className="rounded-lg bg-portal-muted border border-portal-border p-6 text-center">
              <CalendarDays className="h-8 w-8 text-portal-muted-fg/40 mx-auto mb-2" />
              <p className="text-sm text-portal-muted-fg">
                No hay horarios disponibles para esta fecha.
              </p>
              <p className="text-xs text-portal-muted-fg/60 mt-1">Probá seleccionar otro día.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {manana.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-portal-muted-fg uppercase tracking-wider mb-2">
                    Mañana
                  </p>
                  <div className="flex gap-2 flex-wrap stagger-premium">
                    {manana.map((slot) => (
                      <SlotButton
                        key={slot.fechaHora}
                        slot={slot}
                        isSelected={selectedSlot?.fechaHora === slot.fechaHora}
                        onClick={() => onSelectSlot(slot)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {tarde.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-portal-muted-fg uppercase tracking-wider mb-2">
                    Tarde
                  </p>
                  <div className="flex gap-2 flex-wrap stagger-premium">
                    {tarde.map((slot) => (
                      <SlotButton
                        key={slot.fechaHora}
                        slot={slot}
                        isSelected={selectedSlot?.fechaHora === slot.fechaHora}
                        onClick={() => onSelectSlot(slot)}
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

/* ─── SlotButton ──────────────────────────────────────── */
function SlotButton({
  slot,
  isSelected,
  onClick,
}: {
  slot: SlotDisponible;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150',
        'active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isSelected
          ? 'bg-[#2563EB] text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)]'
          : 'bg-white border border-portal-border text-portal-fg hover:border-[#2563EB] hover:text-[#2563EB] hover:bg-portal-primary/5',
      )}
    >
      <Clock className="h-3.5 w-3.5 shrink-0" />
      {formatHora(slot.fechaHora)}
      {slot.precio != null && slot.precio > 0 && (
        <span className="text-[10px] opacity-60 ml-0.5">
          ${slot.precio.toLocaleString('es-CL')}
        </span>
      )}
    </button>
  );
}
