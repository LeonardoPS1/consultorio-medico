'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragCancelEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Hourglass,
  Timer,
  Calendar,
  ArrowRight,
  Activity,
  GripVertical,
  Users,
  Video,
  Phone,
  MapPin,
} from 'lucide-react';
import { getTurnoColor, getTurnoLabel } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { PageHeader } from '@/components/page-header';

export type TurnoEstado =
  | 'pendiente'
  | 'confirmada'
  | 'en_atencion'
  | 'atendido'
  | 'cancelada'
  | 'no_asistio';

export interface Turno {
  id: string;
  hora: string;
  fecha: string;
  paciente: string;
  pacienteId?: string;
  tipo: string;
  tipoConsulta?: string;
  medico: string;
  medicoId?: string;
  estado: TurnoEstado;
  inicioAtencionAt?: string;
  sucursalId?: string;
  motivo?: string;
  duracionMinutos?: number;
  linkVideollamada?: string;
}

type ColumnaId = 'pendientes' | 'en_atencion' | 'atendidos' | 'cancelados' | 'no_asistio';

const COLUMNAS: { id: ColumnaId; titulo: string; estado: TurnoEstado; color: string }[] = [
  { id: 'pendientes', titulo: 'Pendientes', estado: 'pendiente', color: '#F59E0B' },
  { id: 'en_atencion', titulo: 'En Atención', estado: 'en_atencion', color: '#2563EB' },
  { id: 'atendidos', titulo: 'Atendidos', estado: 'atendido', color: '#059669' },
  { id: 'cancelados', titulo: 'Cancelados', estado: 'cancelada', color: '#EF4444' },
  { id: 'no_asistio', titulo: 'No Asistió', estado: 'no_asistio', color: '#8B5CF6' },
];

const COLUMNA_ESTADO_MAP: Record<ColumnaId, TurnoEstado> = {
  pendientes: 'pendiente',
  en_atencion: 'en_atencion',
  atendidos: 'atendido',
  cancelados: 'cancelada',
  no_asistio: 'no_asistio',
};

function AtencionTimer({ desde }: { desde: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const calc = () => {
      const diff = Date.now() - new Date(desde).getTime();
      const min = Math.floor(diff / 60000);
      if (min < 1) return 'ahora';
      const h = Math.floor(min / 60);
      const m = min % 60;
      return h > 0 ? `${h}h ${m}m` : `${m} min`;
    };
    setElapsed(calc());
    const interval = setInterval(() => setElapsed(calc()), 30000);
    return () => clearInterval(interval);
  }, [desde]);

  if (!elapsed) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums">
      <Timer className="h-3 w-3" />
      {elapsed}
    </span>
  );
}

function TurnoCard({
  turno,
  onAtender,
  onFinalizar,
  onCancelar,
  onMoverNoAsistio,
}: {
  turno: Turno;
  onAtender: (id: string) => void;
  onFinalizar: (id: string) => void;
  onCancelar: (id: string) => void;
  onMoverNoAsistio: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: turno.id,
    data: { turno },
  });

  const color = getTurnoColor(turno.estado);
  const isPending = turno.estado === 'pendiente' || turno.estado === 'confirmada';
  const isInAttention = turno.estado === 'en_atencion';
  const isVirtual = turno.tipoConsulta === 'virtual';

  const style = useMemo(
    () => ({
      transform: CSS.Translate.toString(transform),
      opacity: isDragging ? 0.4 : 1,
      zIndex: isDragging ? 50 : ('auto' as const),
      borderColor: isInAttention ? color : undefined,
    }),
    [transform, isDragging, color, isInAttention],
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative rounded-xl border bg-card p-3 transition-[box-shadow] duration-200
        hoverable:hover:shadow-card-hover hoverable:hover:-translate-y-0.5
        ${isInAttention ? 'ring-2 shadow-lg scale-[1.02]' : ''}
        cursor-grab active:cursor-grabbing active:shadow-xl active:scale-[0.97]
        touch-none select-none
      `}
    >
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
      </div>

      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ backgroundColor: color }}
      />

      <div className="pl-3">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center justify-center h-7 w-14 rounded-lg text-xs font-bold tabular-nums ${
                isInAttention
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {turno.hora}
            </span>
            {isInAttention && (
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse-soft" />
            )}
          </div>
          <Badge
            variant="outline"
            className="text-[10px] px-2 py-0 font-medium pointer-events-none"
            style={{
              backgroundColor: `${color}18`,
              color: color,
              borderColor: `${color}30`,
            }}
          >
            {isInAttention ? (
              <span className="flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
                {getTurnoLabel(turno.estado)}
              </span>
            ) : (
              getTurnoLabel(turno.estado)
            )}
          </Badge>
        </div>

        <p className="font-semibold text-sm truncate">{turno.paciente}</p>

        <p className="text-xs text-muted-foreground truncate mb-2">
          {turno.tipo} &middot; {turno.medico}
          {turno.tipoConsulta === 'virtual' && (
            <span className="inline-flex items-center gap-0.5 ml-1.5 text-[10px] font-medium text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full align-middle">
              <Video className="h-2.5 w-2.5" />
              Virtual
            </span>
          )}
          {turno.tipoConsulta === 'telefonica' && (
            <span className="inline-flex items-center gap-0.5 ml-1.5 text-[10px] font-medium text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30 px-1.5 py-0.5 rounded-full align-middle">
              <Phone className="h-2.5 w-2.5" />
              Telefónica
            </span>
          )}
          {turno.tipoConsulta === 'presencial' && (
            <span className="inline-flex items-center gap-0.5 ml-1.5 text-[10px] font-medium text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full align-middle">
              <MapPin className="h-2.5 w-2.5" />
              Presencial
            </span>
          )}
        </p>

        {isInAttention && turno.inicioAtencionAt && (
          <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
            <AtencionTimer desde={turno.inicioAtencionAt} />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {isPending && (
            <Button
              size="sm"
              className="flex-1 min-w-[100px] h-8 text-xs gap-2 font-semibold"
              onClick={(e) => {
                e.stopPropagation();
                onAtender(turno.id);
              }}
            >
              <Play className="h-3.5 w-3.5" />
              Atender
            </Button>
          )}
          {isVirtual && (isPending || isInAttention) && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5 shrink-0 min-w-[80px]"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`/videollamada/${turno.id}`, '_blank');
              }}
              title="Iniciar videollamada"
            >
              <Video className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Video</span>
            </Button>
          )}
          {isInAttention && (
            <Button
              size="sm"
              variant="default"
              className="flex-1 h-8 text-xs gap-2 font-semibold bg-emerald-600 hoverable:hover:bg-emerald-700"
              onClick={(e) => {
                e.stopPropagation();
                onFinalizar(turno.id);
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Finalizar
            </Button>
          )}
          {isPending && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onCancelar(turno.id);
              }}
              title="Cancelar turno"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
          {isPending && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-purple-600 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onMoverNoAsistio(turno.id);
              }}
              title="Marcar como no asistió"
            >
              <AlertCircle className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground/30 mt-1.5 text-center opacity-0 group-hover:opacity-100 transition-opacity select-none">
          Arrastrá para cambiar estado
        </p>
      </div>
    </div>
  );
}

function DragPreview({ turno }: { turno: Turno }) {
  const color = getTurnoColor(turno.estado);
  const isVirtual = turno.tipoConsulta === 'virtual';

  return (
    <div
      className="relative rounded-xl border bg-card p-3 shadow-2xl rotate-2 scale-105"
      style={{ width: '280px' }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ backgroundColor: color }}
      />
      <div className="pl-3">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="inline-flex items-center justify-center h-7 w-14 rounded-lg text-xs font-bold tabular-nums bg-muted text-muted-foreground">
            {turno.hora}
          </span>
          <Badge
            variant="outline"
            className="text-[10px] px-2 py-0 font-medium pointer-events-none"
          >
            {getTurnoLabel(turno.estado)}
          </Badge>
        </div>
        <p className="font-semibold text-sm truncate">{turno.paciente}</p>
        <p className="text-xs text-muted-foreground truncate">
          {turno.tipo} &middot; {turno.medico}
          {isVirtual && (
            <span className="inline-flex items-center gap-0.5 ml-1 text-[10px] text-blue-600">
              🎥
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function KanbanColumn({
  columna,
  turnos,
  onAtender,
  onFinalizar,
  onCancelar,
  onMoverNoAsistio,
}: {
  columna: (typeof COLUMNAS)[0];
  turnos: Turno[];
  onAtender: (id: string) => void;
  onFinalizar: (id: string) => void;
  onCancelar: (id: string) => void;
  onMoverNoAsistio: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: columna.id,
    data: { columnaId: columna.id },
  });

  const Icono =
    columna.id === 'pendientes'
      ? Hourglass
      : columna.id === 'en_atencion'
        ? Play
        : columna.id === 'atendidos'
          ? CheckCircle2
          : columna.id === 'cancelados'
            ? XCircle
            : AlertCircle;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-2 min-h-[250px] rounded-xl p-3 transition-[transform,border-color,background-color,box-shadow] duration-200 border-2
        ${isOver ? 'border-primary bg-primary/5 shadow-lg scale-[1.01]' : 'border-transparent'}
        ${turnos.length === 0 && !isOver ? 'bg-muted/10' : ''}
      `}
    >
      <div className="flex items-center gap-2 px-1 mb-1">
        <div
          className="flex items-center justify-center h-7 w-7 rounded-lg"
          style={{ backgroundColor: `${columna.color}18` }}
        >
          <Icono className="h-4 w-4" style={{ color: columna.color }} />
        </div>
        <span className="text-sm font-semibold">{columna.titulo}</span>
        <Badge
          variant="secondary"
          className="ml-auto text-xs font-mono"
          style={{
            backgroundColor: `${columna.color}12`,
            color: columna.color,
          }}
        >
          {turnos.length}
        </Badge>
      </div>

      {turnos.length === 0 ? (
        <div
          className={`flex flex-col items-center justify-center py-8 text-center rounded-xl border-2 border-dashed flex-1 transition-colors ${
            isOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/10'
          }`}
        >
          <Icono className="h-8 w-8 mb-2 opacity-30" style={{ color: columna.color }} />
          <p className="text-xs text-muted-foreground/60">{isOver ? 'Soltó acá' : 'Sin turnos'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {turnos.map((t) => (
            <TurnoCard
              key={t.id}
              turno={t}
              onAtender={onAtender}
              onFinalizar={onFinalizar}
              onCancelar={onCancelar}
              onMoverNoAsistio={onMoverNoAsistio}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ResumenBar({
  total,
  enAtencion,
  atendidos,
  pendientes,
  noAsistio,
}: {
  total: number;
  enAtencion: number;
  atendidos: number;
  pendientes: number;
  noAsistio: number;
}) {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
      <span className="flex items-center gap-2">
        <Calendar className="h-3.5 w-3.5 text-primary" />
        <strong className="text-foreground">{total}</strong> turnos hoy
      </span>
      <span className="hidden sm:inline">&middot;</span>
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        <strong className="text-foreground">{pendientes}</strong> pendientes
      </span>
      <span className="hidden sm:inline">&middot;</span>
      <span className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
        <strong className="text-foreground">{enAtencion}</strong> en atención
      </span>
      <span className="hidden sm:inline">&middot;</span>
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <strong className="text-foreground">{atendidos}</strong> atendidos
      </span>
      <span className="hidden sm:inline">&middot;</span>
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-purple-500" />
        <strong className="text-foreground">{noAsistio}</strong> no asistió
      </span>
    </div>
  );
}

export function AtencionClient({ initialTurnos }: { initialTurnos: Turno[] }) {
  const router = useRouter();
  const [turnos, setTurnos] = useState<Turno[]>(initialTurnos);
  const [mounted, setMounted] = useState(false);
  const [filtroMedico, setFiltroMedico] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const patchTurnoEstado = useCallback(
    async (
      id: string,
      nuevoEstado: TurnoEstado,
      getOptimistic: (turno: Turno) => Partial<Turno>,
      extraBody?: Record<string, unknown>,
    ): Promise<{ ok: boolean; error?: string }> => {
      const turno = turnos.find((t) => t.id === id);
      if (!turno) return { ok: false, error: 'Turno no encontrado' };

      const snapshot = { estado: turno.estado, inicioAtencionAt: turno.inicioAtencionAt };

      setTurnos((prev) => prev.map((t) => (t.id === id ? { ...t, ...getOptimistic(t) } : t)));

      try {
        const res = await fetch(`/api/turnos/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: nuevoEstado, ...extraBody }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const serverMsg = body?.prodError || body?.detail || body?.error || '';
          const msg = serverMsg || (res.status >= 500 ? 'Error del servidor' : 'Error al guardar');
          throw new Error(msg);
        }

        return { ok: true };
      } catch (err) {
        setTurnos((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, estado: snapshot.estado, inicioAtencionAt: snapshot.inicioAtencionAt }
              : t,
          ),
        );
        return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' };
      }
    },
    [turnos],
  );

  const atenderTurno = useCallback(
    async (id: string) => {
      const { ok, error } = await patchTurnoEstado(id, 'en_atencion', (t) => ({
        estado: 'en_atencion' as const,
        inicioAtencionAt: new Date().toISOString(),
      }));
      const paciente = turnos.find((t) => t.id === id)?.paciente;
      if (ok) {
        toast({ title: 'En atención', description: `${paciente} está siendo atendido` });
      } else {
        toast({
          title: 'Error',
          description: error || 'No se pudo iniciar la atención',
          variant: 'destructive',
        });
      }
    },
    [turnos, patchTurnoEstado],
  );

  const finalizarTurno = useCallback(
    async (id: string) => {
      const { ok, error } = await patchTurnoEstado(id, 'atendido', () => ({
        estado: 'atendido' as const,
      }));
      const paciente = turnos.find((t) => t.id === id)?.paciente;
      if (ok) {
        toast({ title: 'Atendido', description: `${paciente} fue atendido correctamente` });
      } else {
        toast({
          title: 'Error',
          description: error || 'No se pudo finalizar el turno',
          variant: 'destructive',
        });
      }
    },
    [turnos, patchTurnoEstado],
  );

  const cancelarTurno = useCallback(
    async (id: string) => {
      const { ok, error } = await patchTurnoEstado(
        id,
        'cancelada',
        () => ({
          estado: 'cancelada' as const,
        }),
        { motivoCancelacion: 'Cancelado desde dashboard', skipWaitlist: true },
      );
      const paciente = turnos.find((t) => t.id === id)?.paciente;
      if (ok) {
        toast({ title: 'Cancelado', description: `Turno de ${paciente} cancelado` });
      } else {
        toast({
          title: 'Error',
          description: error || 'No se pudo cancelar el turno',
          variant: 'destructive',
        });
      }
    },
    [turnos, patchTurnoEstado],
  );

  const moverNoAsistio = useCallback(
    async (id: string) => {
      const { ok, error } = await patchTurnoEstado(id, 'no_asistio', () => ({
        estado: 'no_asistio' as const,
      }));
      const paciente = turnos.find((t) => t.id === id)?.paciente;
      if (ok) {
        toast({ title: 'No asistió', description: `Turno de ${paciente} marcado como no asistió` });
      } else {
        toast({
          title: 'Error',
          description: error || 'No se pudo actualizar el turno',
          variant: 'destructive',
        });
      }
    },
    [turnos, patchTurnoEstado],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);

      const { active, over } = event;
      if (!over) return;

      const turnoId = active.id as string;
      const columnaDestino = over.id as string;

      const turno = turnos.find((t) => t.id === turnoId);
      if (!turno) return;

      const nuevoEstado = COLUMNA_ESTADO_MAP[columnaDestino as ColumnaId];
      if (!nuevoEstado || turno.estado === nuevoEstado) return;

      const now = new Date().toISOString();

      setTurnos((prev) =>
        prev.map((t) => {
          if (t.id !== turnoId) return t;
          const updated: Turno = { ...t, estado: nuevoEstado };
          if (nuevoEstado === 'en_atencion') {
            updated.inicioAtencionAt = now;
          }
          return updated;
        }),
      );

      try {
        const res = await fetch(`/api/turnos/${turnoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: nuevoEstado }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const serverMsg = body?.prodError || body?.detail || body?.error || '';
          throw new Error(serverMsg || 'Error del servidor');
        }

        const label = COLUMNAS.find((c) => c.id === columnaDestino)?.titulo || nuevoEstado;
        toast({
          title: `Movido a ${label}`,
          description: `${turno.paciente} → ${getTurnoLabel(nuevoEstado)}`,
        });
      } catch (err) {
        setTurnos((prev) =>
          prev.map((t) => {
            if (t.id !== turnoId) return t;
            const reverted: Turno = { ...t, estado: turno.estado };
            if (turno.inicioAtencionAt) reverted.inicioAtencionAt = turno.inicioAtencionAt;
            return reverted;
          }),
        );
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        toast({
          title: 'Error',
          description: msg,
          variant: 'destructive',
        });
      }
    },
    [turnos],
  );

  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    setActiveId(null);
  }, []);

  const activeTurno = useMemo(
    () => turnos.find((t) => t.id === activeId) ?? null,
    [activeId, turnos],
  );

  const turnosFiltrados = filtroMedico ? turnos.filter((t) => t.medico === filtroMedico) : turnos;

  const agrupar = (estados: TurnoEstado[]) =>
    turnosFiltrados
      .filter((t) => estados.includes(t.estado))
      .sort((a, b) => a.hora.localeCompare(b.hora));

  const pendientes = agrupar(['pendiente', 'confirmada']);
  const enAtencion = agrupar(['en_atencion']);
  const atendidos = agrupar(['atendido']);
  const cancelados = agrupar(['cancelada']);
  const noAsistio = agrupar(['no_asistio']);

  const medicos = Array.from(new Set(turnos.map((t) => t.medico)));

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <PageHeader title="Atención de Turnos" gradient />
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <div className="flex items-center gap-1 rounded-lg border p-1 overflow-x-auto flex-1 sm:flex-none">
            <Button
              variant={!filtroMedico ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs h-8 shrink-0"
              onClick={() => setFiltroMedico(null)}
            >
              <Users className="h-3.5 w-3.5 mr-1" />
              Todos
            </Button>
            {medicos.map((m) => (
              <Button
                key={m}
                variant={filtroMedico === m ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs h-8 shrink-0"
                onClick={() => setFiltroMedico(m)}
              >
                {m}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/turnos')}
            className="shrink-0"
          >
            <Calendar className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Ver Agenda</span>
            <span className="sm:hidden">Agenda</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
      </div>

      <Card className="border-primary/10 bg-gradient-to-br from-primary/[0.03] to-transparent">
        <CardContent className="p-4">
          <ResumenBar
            total={
              turnosFiltrados.filter((t) => t.estado !== 'cancelada' && t.estado !== 'no_asistio')
                .length
            }
            enAtencion={enAtencion.length}
            atendidos={atendidos.length}
            pendientes={pendientes.length}
            noAsistio={noAsistio.length}
          />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Tablero de Atención
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {activeId ? (
                <span className="flex items-center gap-2 text-primary font-medium">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse-soft" />
                  Arrastrando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <GripVertical className="h-3.5 w-3.5" />
                  Arrastrá turnos entre columnas
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {!mounted ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {COLUMNAS.map((col) => {
                  const turnosCol =
                    col.id === 'pendientes'
                      ? pendientes
                      : col.id === 'en_atencion'
                        ? enAtencion
                        : col.id === 'atendidos'
                          ? atendidos
                          : col.id === 'cancelados'
                            ? cancelados
                            : noAsistio;

                  return (
                    <KanbanColumn
                      key={col.id}
                      columna={col}
                      turnos={turnosCol}
                      onAtender={atenderTurno}
                      onFinalizar={finalizarTurno}
                      onCancelar={cancelarTurno}
                      onMoverNoAsistio={moverNoAsistio}
                    />
                  );
                })}
              </div>

              <DragOverlay dropAnimation={null}>
                {activeTurno ? <DragPreview turno={activeTurno} /> : null}
              </DragOverlay>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {activeId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-5 py-2.5 rounded-full shadow-xl text-sm font-medium animate-in slide-in-from-bottom-4">
          Soltá el turno en la columna deseada
        </div>
      )}

      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getTurnoColor('pendiente') }} />{' '}
          Pendiente
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getTurnoColor('confirmada') }} />{' '}
          Confirmada
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getTurnoColor('en_atencion') }} />{' '}
          En atención
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getTurnoColor('atendido') }} />{' '}
          Atendido
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getTurnoColor('cancelada') }} />{' '}
          Cancelado
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getTurnoColor('no_asistio') }} />{' '}
          No asistió
        </span>
        <span className="flex items-center gap-1 text-muted-foreground/50 ml-auto">
          <GripVertical className="h-3 w-3" /> Táctil + Mouse
        </span>
      </div>
    </div>
  );
}
