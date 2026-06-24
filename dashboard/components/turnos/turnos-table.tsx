'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getTurnoColor, getTurnoLabel } from '@/lib/utils';
import { descargarICS } from '@/lib/ics';
import { generateGCalUrl, formatGCalEventText } from '@/lib/google-calendar';
import {
  Calendar,
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  RotateCcw,
  CalendarPlus,
  MessageSquare,
  MoreHorizontal,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────

type TurnoEstado =
  | 'pendiente'
  | 'confirmada'
  | 'en_atencion'
  | 'atendido'
  | 'cancelada'
  | 'en_consulta'
  | 'completada'
  | 'no_asistio';

export interface TurnoData {
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

interface TurnosTableProps {
  turnosFiltrados: TurnoData[];
  loading: boolean;
  filtrosActivos: number;
  savingStates: Set<string>;
  onActualizarEstado: (id: string, estado: TurnoEstado, descripcion: string) => void;
  onEditTurno: (turno: TurnoData) => void;
  onCancelTurno: (id: string) => void;
  onLimpiarFiltros: () => void;
  onNewTurno: () => void;
}

// ─── Skeleton ────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/20 animate-pulse">
      <div className="h-14 w-14 rounded-xl bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 bg-muted rounded" />
        <div className="h-3 w-32 bg-muted rounded" />
      </div>
      <div className="h-6 w-20 bg-muted rounded-full" />
      <div className="flex gap-1">
        <div className="h-8 w-16 bg-muted rounded" />
        <div className="h-8 w-14 bg-muted rounded" />
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────

function EmptyState({
  filtrosActivos,
  onLimpiarFiltros,
  onNewTurno,
}: {
  filtrosActivos: number;
  onLimpiarFiltros: () => void;
  onNewTurno: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Calendar className="h-12 w-12 text-muted-foreground/30 mb-4" />
      <p className="text-lg font-medium text-muted-foreground">
        {filtrosActivos > 0 ? 'Sin turnos con esos filtros' : 'Sin turnos para esta fecha'}
      </p>
      <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
        {filtrosActivos > 0
          ? 'Probá cambiando los filtros'
          : 'No hay turnos agendados para este día'}
      </p>
      <div className="flex gap-2">
        {filtrosActivos > 0 && (
          <Button variant="outline" onClick={onLimpiarFiltros}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpiar filtros
          </Button>
        )}
        <Button onClick={onNewTurno}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Turno
        </Button>
      </div>
    </div>
  );
}

// ─── Turno Row ───────────────────────────────────────────

function TurnoRow({
  turno,
  savingStates,
  onActualizarEstado,
  onEditTurno,
  onCancelTurno,
}: {
  turno: TurnoData;
  savingStates: Set<string>;
  onActualizarEstado: (id: string, estado: TurnoEstado, descripcion: string) => void;
  onEditTurno: (turno: TurnoData) => void;
  onCancelTurno: (id: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-2 md:gap-4 p-3 md:p-4 hoverable:hover:bg-muted/50 transition-colors cursor-pointer border-l-4"
      style={{ borderLeftColor: getTurnoColor(turno.estado) }}
    >
      {/* Hora */}
      <div className="flex items-center justify-center h-10 w-10 md:h-14 md:w-14 rounded-xl bg-primary/10 text-primary font-bold text-xs md:text-sm shrink-0">
        {turno.hora}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{turno.paciente}</p>
        <p className="text-xs text-muted-foreground truncate hidden md:block">
          {turno.tipo} &middot; {turno.medico}
        </p>
        <p className="text-xs text-muted-foreground truncate md:hidden">{turno.tipo}</p>
      </div>

      {/* Estado */}
      <Badge
        style={{
          backgroundColor: `${getTurnoColor(turno.estado)}20`,
          color: getTurnoColor(turno.estado),
          borderColor: `${getTurnoColor(turno.estado)}40`,
        }}
        variant="outline"
        className={`text-xs ${savingStates.has(turno.id) ? 'animate-pulse opacity-70' : ''}`}
      >
        {getTurnoLabel(turno.estado)}
      </Badge>

      {/* Acciones */}
      <div className="flex gap-1">
        {/* Desktop: inline */}
        <div className="hidden md:flex gap-1">
          {(turno.estado === 'pendiente' || turno.estado === 'confirmada') && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1"
              onClick={(e) => {
                e.stopPropagation();
                onActualizarEstado(turno.id, 'en_atencion', 'En atención');
              }}
            >
              <Play className="h-3 w-3" /> Atender
            </Button>
          )}
          {turno.estado === 'en_atencion' && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              onClick={(e) => {
                e.stopPropagation();
                onActualizarEstado(turno.id, 'atendido', `${turno.paciente} fue atendido`);
              }}
            >
              <CheckCircle2 className="h-3 w-3" /> Finalizar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEditTurno(turno);
            }}
          >
            Editar
          </Button>
          {turno.estado !== 'atendido' && turno.estado !== 'cancelada' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onCancelTurno(turno.id);
              }}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Cancelar
            </Button>
          )}
        </div>

        {/* Mobile: dropdown */}
        <div className="md:hidden">
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Más acciones">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {(turno.estado === 'pendiente' || turno.estado === 'confirmada') && (
                <DropdownMenuItem
                  onClick={() => onActualizarEstado(turno.id, 'en_atencion', 'En atención')}
                >
                  <Play className="h-4 w-4 mr-2" /> Atender
                </DropdownMenuItem>
              )}
              {turno.estado === 'en_atencion' && (
                <DropdownMenuItem
                  onClick={() =>
                    onActualizarEstado(turno.id, 'atendido', `${turno.paciente} fue atendido`)
                  }
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Finalizar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onEditTurno(turno)}>Editar</DropdownMenuItem>
              {turno.estado !== 'atendido' && turno.estado !== 'cancelada' && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onCancelTurno(turno.id)}
                >
                  <XCircle className="h-4 w-4 mr-2" /> Cancelar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Google Calendar link */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hoverable:hover:text-[#4285F4]"
          title="Agregar a Google Calendar"
          aria-label="Agregar a Google Calendar"
          onClick={(e) => {
            e.stopPropagation();
            const url = generateGCalUrl({
              text: formatGCalEventText(turno.paciente, turno.tipo),
              fechaHora: `${turno.fecha}T${turno.hora}:00.000Z`,
              duracionMinutos: 30,
              medico: turno.medico,
              motivo: turno.tipo,
            });
            window.open(url, '_blank', 'noopener,noreferrer');
          }}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z"
              fill="currentColor"
            />
          </svg>
        </Button>

        {/* ICS download */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hoverable:hover:text-primary"
          title="Descargar .ics (Outlook, Apple)"
          aria-label="Descargar .ics"
          onClick={(e) => {
            e.stopPropagation();
            descargarICS({
              id: turno.id,
              fechaHora: `${turno.fecha}T${turno.hora}:00.000Z`,
              duracionMinutos: 30,
              paciente: turno.paciente,
              medico: turno.medico,
              motivo: turno.tipo,
            });
          }}
        >
          <CalendarPlus className="h-4 w-4" />
        </Button>

        {/* Encuesta */}
        {turno.estado === 'atendido' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-emerald-600 hoverable:hover:text-emerald-700"
            title="Enviar encuesta de satisfacción"
            aria-label="Enviar encuesta de satisfacción"
            onClick={(e) => {
              e.stopPropagation();
              const msg = encodeURIComponent(
                `📋 *Encuesta de Satisfacción*%0A%0AHola ${turno.paciente}, ¿cómo calificarías tu consulta del ${turno.fecha}?%0A%0AResponde con un número del 1 al 5:%0A1 😞 Muy mala%0A2 😕 Regular%0A3 😐 Normal%0A4 🙂 Buena%0A5 😍 Excelente%0A%0A¡Gracias por tu tiempo!`,
              );
              window.open(`https://wa.me/?text=${msg}`, '_blank');
            }}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────

export function TurnosTable({
  turnosFiltrados,
  loading,
  filtrosActivos,
  savingStates,
  onActualizarEstado,
  onEditTurno,
  onCancelTurno,
  onLimpiarFiltros,
  onNewTurno,
}: TurnosTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : turnosFiltrados.length === 0 ? (
          <EmptyState
            filtrosActivos={filtrosActivos}
            onLimpiarFiltros={onLimpiarFiltros}
            onNewTurno={onNewTurno}
          />
        ) : (
          <div className="divide-y" role="list" aria-label="Lista de turnos">
            {turnosFiltrados
              .sort((a, b) => a.hora.localeCompare(b.hora))
              .map((turno) => (
                <TurnoRow
                  key={turno.id}
                  turno={turno}
                  savingStates={savingStates}
                  onActualizarEstado={onActualizarEstado}
                  onEditTurno={onEditTurno}
                  onCancelTurno={onCancelTurno}
                />
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
