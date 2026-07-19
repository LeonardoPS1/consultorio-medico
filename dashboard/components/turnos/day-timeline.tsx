'use client';

import { useMemo, useRef, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { getTurnoColor, getTurnoLabel } from '@/lib/utils';
import { Video, Phone, MapPin, Clock, AlertTriangle, RefreshCw, Syringe, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// Tipos
// ============================================================

export interface MedicoDia {
  id: string;
  nombre: string;
  especialidad: string;
  colorEvento: string;
  horarios: Record<
    string,
    {
      activo?: boolean;
      inicio?: string;
      fin?: string;
      tipo?: string;
      inicio2?: string | null;
      fin2?: string | null;
    }
  >;
  duracionTurnoMinutos: number;
  bloqueos: { titulo: string; tipo: string }[];
}

export interface TurnoDia {
  id: string;
  hora: string;
  duracionMinutos: number;
  estado: string;
  tipoConsulta: string | null;
  motivo: string | null;
  medicoId: string;
  pacienteId: string | null;
  paciente: string;
  linkVideollamada: string | null;
}

interface DayTimelineProps {
  medicos: MedicoDia[];
  turnos: TurnoDia[];
  fecha: string;
  onTurnoClick?: (turno: TurnoDia) => void;
  onSlotClick?: (medicoId: string, hora: string) => void;
}

// ============================================================
// Helpers
// ============================================================

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const HORA_INICIO = 7; // 07:00
const HORA_FIN = 21; // 21:00
const SLOT_HEIGHT_PX = 60; // px per hour slot

/** Convert "HH:MM" to minutes from midnight */
function horaToMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

/** Get the schedule blocks for a medico on a given date */
function getHorarioBlocks(
  horarios: MedicoDia['horarios'],
  fecha: string,
): { inicio: number; fin: number }[] {
  const date = new Date(fecha + 'T12:00:00');
  const diaNombre = DIAS[date.getUTCDay()];
  const horario = horarios[diaNombre];
  if (!horario || !horario.activo) return [];

  const blocks: { inicio: number; fin: number }[] = [];
  if (horario.inicio && horario.fin) {
    blocks.push({ inicio: horaToMinutos(horario.inicio), fin: horaToMinutos(horario.fin) });
  }
  if (horario.tipo === 'partido' && horario.inicio2 && horario.fin2) {
    blocks.push({ inicio: horaToMinutos(horario.inicio2), fin: horaToMinutos(horario.fin2) });
  }
  return blocks;
}

/** Check if a minute-of-day value is within any schedule block */
function isEnHorario(minutos: number, blocks: { inicio: number; fin: number }[]): boolean {
  return blocks.some((b) => minutos >= b.inicio && minutos < b.fin);
}

/** Get tipoConsulta icon */
function TipoIcon({ tipo }: { tipo: string | null }) {
  switch (tipo) {
    case 'telemedicina':
      return <Video className="h-3 w-3" />;
    case 'control':
      return <RefreshCw className="h-3 w-3" />;
    case 'urgencia':
      return <AlertTriangle className="h-3 w-3" />;
    case 'procedimiento':
      return <Syringe className="h-3 w-3" />;
    case 'otro':
      return <Plus className="h-3 w-3" />;
    default:
      return <MapPin className="h-3 w-3" />;
  }
}

// ============================================================
// Component
// ============================================================

export function DayTimeline({ medicos, turnos, fecha, onTurnoClick, onSlotClick }: DayTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Group turnos by medicoId
  const turnosPorMedico = useMemo(() => {
    const map = new Map<string, TurnoDia[]>();
    for (const t of turnos) {
      const list = map.get(t.medicoId) || [];
      list.push(t);
      map.set(t.medicoId, list);
    }
    return map;
  }, [turnos]);

  // Precompute schedule blocks per medico
  const horarioBlocks = useMemo(() => {
    const map = new Map<string, { inicio: number; fin: number }[]>();
    for (const m of medicos) {
      map.set(m.id, getHorarioBlocks(m.horarios, fecha));
    }
    return map;
  }, [medicos, fecha]);

  // Scroll to current time on mount
  useEffect(() => {
    if (!containerRef.current) return;
    const now = new Date();
    const currentHour = now.getHours();
    const scrollTo = Math.max(0, (currentHour - HORA_INICIO) * SLOT_HEIGHT_PX - 60);
    containerRef.current.scrollTop = scrollTo;
  }, []);

  // Current time indicator position
  const nowLineTop = useMemo(() => {
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    if (currentMin < HORA_INICIO * 60 || currentMin >= HORA_FIN * 60) return null;
    return (currentMin - HORA_INICIO * 60) * (SLOT_HEIGHT_PX / 60);
  }, []);

  // Handle empty slot click (to create new turno)
  const handleSlotClick = useCallback(
    (medicoId: string, hour: number) => {
      const hora = `${String(hour).padStart(2, '0')}:00`;
      onSlotClick?.(medicoId, hora);
    },
    [onSlotClick],
  );

  if (medicos.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <div className="text-center">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">Sin médicos activos</p>
          <p className="text-sm">No hay médicos configurados para esta sucursal</p>
        </div>
      </div>
    );
  }

  const totalHours = HORA_FIN - HORA_INICIO;
  const totalHeight = totalHours * SLOT_HEIGHT_PX;

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
      {/* Fixed header: médico columns */}
      <div className="flex border-b bg-background z-10 shrink-0">
        {/* Time gutter */}
        <div className="w-16 shrink-0" />
        {/* Médico column headers */}
        <div className="flex flex-1 min-w-0">
          {medicos.map((medico) => (
            <div
              key={medico.id}
              className="flex-1 min-w-[100px] sm:min-w-[140px] border-l px-2 py-2 text-center"
            >
              <div className="flex items-center justify-center gap-1.5">
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: medico.colorEvento }}
                />
                <span className="font-medium text-sm truncate">{medico.nombre}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{medico.especialidad}</p>
              {medico.bloqueos.length > 0 && (
                <div className="flex items-center justify-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  <span className="text-[10px] text-amber-600">{medico.bloqueos[0].titulo}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable timeline body */}
      <div ref={containerRef} className="flex-1 overflow-y-auto relative">
        <div className="flex relative" style={{ height: totalHeight }}>
          {/* Time gutter (hour labels) */}
          <div className="w-16 shrink-0 relative">
            {Array.from({ length: totalHours }, (_, i) => {
              const hour = HORA_INICIO + i;
              return (
                <div
                  key={hour}
                  className="absolute right-2 text-[11px] text-muted-foreground font-medium -translate-y-1/2"
                  style={{ top: i * SLOT_HEIGHT_PX + SLOT_HEIGHT_PX / 2 }}
                >
                  {`${String(hour).padStart(2, '0')}:00`}
                </div>
              );
            })}
          </div>

          {/* Grid lines + médico columns */}
          <div className="flex flex-1 min-w-0 overflow-x-auto">
            {/* Horizontal hour lines */}
            {Array.from({ length: totalHours + 1 }, (_, i) => (
              <div
                key={`line-${i}`}
                className="absolute left-0 right-0 border-t border-muted/50"
                style={{ top: i * SLOT_HEIGHT_PX }}
              />
            ))}

            {/* Current time indicator */}
            {nowLineTop !== null && (
              <div
                className="absolute left-0 right-0 h-0.5 bg-red-500 z-20"
                style={{ top: nowLineTop }}
              >
                <div className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
              </div>
            )}

            {/* Médico columns with turnos */}
            {medicos.map((medico) => {
              const medicoTurnos = turnosPorMedico.get(medico.id) || [];
              const blocks = horarioBlocks.get(medico.id) || [];
              const hasBloqueos = medico.bloqueos.length > 0;

              return (
                <div
                  key={medico.id}
                  className="flex-1 min-w-[100px] sm:min-w-[140px] border-l relative"
                  style={{
                    backgroundColor: hasBloqueos
                      ? `${medico.colorEvento}08`
                      : undefined,
                  }}
                >
                  {/* Schedule background (working hours) */}
                  {blocks.map((block, i) => {
                    const top = (block.inicio - HORA_INICIO * 60) * (SLOT_HEIGHT_PX / 60);
                    const height = (block.fin - block.inicio) * (SLOT_HEIGHT_PX / 60);
                    return (
                      <div
                        key={i}
                        className="absolute left-0 right-0 opacity-[0.04]"
                        style={{
                          top,
                          height,
                          backgroundColor: medico.colorEvento,
                        }}
                      />
                    );
                  })}

                  {/* Clickable empty slots (30 min each) */}
                  {blocks.map((block, blockIdx) => {
                    const slots = [];
                    for (
                      let min = block.inicio;
                      min < block.fin;
                      min += medico.duracionTurnoMinutos
                    ) {
                      // Check if this slot is occupied
                      const slotEnd = min + medico.duracionTurnoMinutos;
                      const isOccupied = medicoTurnos.some((t) => {
                        const tMin = horaToMinutos(t.hora);
                        return tMin < slotEnd && tMin + t.duracionMinutos > min;
                      });

                      if (!isOccupied) {
                        const top = (min - HORA_INICIO * 60) * (SLOT_HEIGHT_PX / 60);
                        const height = medico.duracionTurnoMinutos * (SLOT_HEIGHT_PX / 60);
                        const h = Math.floor(min / 60);
                        slots.push(
                          <div
                            key={`slot-${blockIdx}-${min}`}
                            className="absolute left-0.5 right-0.5 rounded cursor-pointer hover:bg-primary/5 border border-dashed border-transparent hover:border-primary/20 transition-colors group z-[1]"
                            style={{ top, height }}
                            onClick={() =>
                              handleSlotClick(medico.id, h)
                            }
                          >
                            <span className="absolute inset-0 flex items-center justify-center text-xs text-primary opacity-0 group-hover:opacity-60 transition-opacity">
                              +
                            </span>
                          </div>,
                        );
                      }
                    }
                    return slots;
                  })}

                  {/* Turno blocks */}
                  {medicoTurnos.map((turno) => {
                    const tMin = horaToMinutos(turno.hora);
                    const top = (tMin - HORA_INICIO * 60) * (SLOT_HEIGHT_PX / 60);
                    const height = turno.duracionMinutos * (SLOT_HEIGHT_PX / 60);
                    const estadoColor = getTurnoColor(turno.estado);
                    const isEnAtencion = turno.estado === 'en_atencion' || turno.estado === 'en_consulta';

                    return (
                      <div
                        key={turno.id}
                        className={cn(
                          'absolute left-1 right-1 rounded-md px-1.5 py-1 cursor-pointer',
                          'border transition-shadow hover:shadow-md z-[5]',
                          'overflow-hidden',
                        )}
                        style={{
                          top,
                          height: Math.max(height, 24),
                          backgroundColor: `${medico.colorEvento}18`,
                          borderColor: isEnAtencion ? medico.colorEvento : `${medico.colorEvento}40`,
                          borderWidth: isEnAtencion ? 2 : 1,
                        }}
                        onClick={() => onTurnoClick?.(turno)}
                      >
                        {/* Turno content */}
                        <div className="flex items-start gap-1 min-h-0">
                          <div
                            className="w-0.5 shrink-0 self-stretch rounded-full"
                            style={{ backgroundColor: estadoColor }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs truncate leading-tight">
                              {turno.paciente}
                            </p>
                            {height >= 36 && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <TipoIcon tipo={turno.tipoConsulta} />
                                <span className="text-[10px] text-muted-foreground truncate">
                                  {turno.hora}
                                  {turno.duracionMinutos !== 30 && ` · ${turno.duracionMinutos}m`}
                                </span>
                              </div>
                            )}
                            {height >= 52 && turno.motivo && (
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                {turno.motivo}
                              </p>
                            )}
                            {height >= 68 && (
                              <Badge
                                variant="outline"
                                className="mt-0.5 h-4 text-[9px] px-1"
                                style={{
                                  backgroundColor: `${estadoColor}15`,
                                  color: estadoColor,
                                  borderColor: `${estadoColor}30`,
                                }}
                              >
                                {getTurnoLabel(turno.estado)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
