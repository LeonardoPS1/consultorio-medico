'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  CheckCircle2,
  XCircle,
  UserCheck,
  Hourglass,
  Timer,
  Sparkles,
  Calendar,
  ArrowRight,
  Activity,
  Clock,
  Users,
  GripVertical,
} from 'lucide-react';
import { getTurnoColor, getTurnoLabel } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { PageHeader } from '@/components/page-header';

// ============================================================
// Tipos
// ============================================================
type TurnoEstado = 'pendiente' | 'confirmada' | 'en_atencion' | 'atendido' | 'cancelada';

interface Turno {
  id: string;
  hora: string;
  paciente: string;
  tipo: string;
  medico: string;
  estado: TurnoEstado;
  atendidoAt?: string;
}

// ============================================================
// Columnas del Kanban
// ============================================================
type ColumnaId = 'pendientes' | 'en_atencion' | 'atendidos' | 'cancelados';

const COLUMNAS: { id: ColumnaId; titulo: string; estado: TurnoEstado; color: string }[] = [
  { id: 'pendientes', titulo: 'Pendientes', estado: 'pendiente', color: '#F59E0B' },
  { id: 'en_atencion', titulo: 'En Atención', estado: 'en_atencion', color: '#2563EB' },
  { id: 'atendidos', titulo: 'Atendidos', estado: 'atendido', color: '#059669' },
  { id: 'cancelados', titulo: 'Cancelados', estado: 'cancelada', color: '#EF4444' },
];

// ============================================================
// Mock data de turnos para hoy
// ============================================================
const hoy = new Date();
const TURNOS_INICIALES: Turno[] = [
  { id: '1', hora: '09:00', paciente: 'Juan Pérez', tipo: 'Consulta Médica', medico: 'Dr. García', estado: 'pendiente' },
  { id: '2', hora: '09:30', paciente: 'María Rodríguez', tipo: 'Control', medico: 'Dr. García', estado: 'atendido', atendidoAt: new Date(hoy.getTime() - 30 * 60000).toISOString() },
  { id: '3', hora: '10:00', paciente: 'Pedro Sánchez', tipo: 'Resultados', medico: 'Dra. López', estado: 'en_atencion', atendidoAt: new Date(hoy.getTime() - 12 * 60000).toISOString() },
  { id: '4', hora: '10:30', paciente: 'Ana López', tipo: 'Consulta', medico: 'Dr. García', estado: 'confirmada' },
  { id: '5', hora: '11:00', paciente: 'Carlos Ruiz', tipo: 'Especialista', medico: 'Dra. López', estado: 'en_atencion', atendidoAt: new Date(hoy.getTime() - 5 * 60000).toISOString() },
  { id: '6', hora: '11:30', paciente: 'Laura Martínez', tipo: 'Control', medico: 'Dr. García', estado: 'pendiente' },
  { id: '7', hora: '12:00', paciente: 'Sofía Herrera', tipo: 'Primera vez', medico: 'Dra. López', estado: 'cancelada' },
  { id: '8', hora: '15:00', paciente: 'Diego Torres', tipo: 'Consulta', medico: 'Dr. García', estado: 'confirmada' },
  { id: '9', hora: '15:30', paciente: 'Elena Martínez', tipo: 'Control', medico: 'Dr. García', estado: 'atendido', atendidoAt: new Date(hoy.getTime() - 180 * 60000).toISOString() },
  { id: '10', hora: '16:00', paciente: 'Roberto Fernández', tipo: 'Primera vez', medico: 'Dra. López', estado: 'pendiente' },
  { id: '11', hora: '16:30', paciente: 'Valentina Gómez', tipo: 'Consulta', medico: 'Dr. García', estado: 'pendiente' },
  { id: '12', hora: '17:00', paciente: 'Luis Martínez', tipo: 'Resultados', medico: 'Dra. López', estado: 'atendido', atendidoAt: new Date(hoy.getTime() - 240 * 60000).toISOString() },
];

// ============================================================
// Componente: Timer de atención
// ============================================================
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

// ============================================================
// Componente: Tarjeta de turno (draggable)
// ============================================================
function TurnoCard({
  turno,
  onAtender,
  onFinalizar,
  onCancelar,
  onDragStart,
}: {
  turno: Turno;
  onAtender: (id: string) => void;
  onFinalizar: (id: string) => void;
  onCancelar: (id: string) => void;
  onDragStart: (e: React.DragEvent, turno: Turno) => void;
}) {
  const color = getTurnoColor(turno.estado);
  const isPending = turno.estado === 'pendiente' || turno.estado === 'confirmada';
  const isInAttention = turno.estado === 'en_atencion';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, turno)}
      className={`group relative rounded-xl border bg-card p-3 transition-[transform,box-shadow] duration-200
        hoverable:hover:shadow-card-hover hoverable:hover:-translate-y-0.5
        ${isInAttention ? 'ring-2 shadow-lg scale-[1.02]' : ''}
        cursor-grab active:cursor-grabbing active:shadow-xl active:scale-[0.97]
        [&.dragging]:opacity-50 [&.dragging]:ring-2 [&.dragging]:ring-primary
      `}
      style={{ borderColor: isInAttention ? color : undefined }}
    >
      {/* Grip indicator (arrastre) */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
      </div>

      {/* Barra lateral de color */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ backgroundColor: color }}
      />

      <div className="pl-3">
        {/* Header: hora + estado badge */}
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

        {/* Nombre paciente */}
        <p className="font-semibold text-sm truncate">{turno.paciente}</p>

        {/* Tipo + médico */}
        <p className="text-xs text-muted-foreground truncate mb-2">
          {turno.tipo} &middot; {turno.medico}
        </p>

        {/* Timer de atención */}
        {isInAttention && turno.atendidoAt && (
          <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
            <AtencionTimer desde={turno.atendidoAt} />
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-2">
          {isPending && (
            <Button
              size="sm"
              className="flex-1 h-8 text-xs gap-2 font-semibold"
              onClick={() => onAtender(turno.id)}
            >
              <Play className="h-3.5 w-3.5" />
              Atender
            </Button>
          )}
          {isInAttention && (
            <Button
              size="sm"
              variant="default"
              className="flex-1 h-8 text-xs gap-2 font-semibold bg-emerald-600 hoverable:hover:bg-emerald-700"
              onClick={() => onFinalizar(turno.id)}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Finalizar
            </Button>
          )}
          {isPending && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => onCancelar(turno.id)}
              title="Cancelar turno"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Indicador de arrastre */}
        <p className="text-[10px] text-muted-foreground/30 mt-1.5 text-center opacity-0 group-hover:opacity-100 transition-opacity select-none">
          Arrastrá para cambiar estado
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Componente: Columna del Kanban (drop target)
// ============================================================
function KanbanColumn({
  columna,
  turnos,
  onAtender,
  onFinalizar,
  onCancelar,
  onDragStart,
  onDropTurno,
  isDragOver,
  onDragOver,
  onDragLeave,
}: {
  columna: typeof COLUMNAS[0];
  turnos: Turno[];
  onAtender: (id: string) => void;
  onFinalizar: (id: string) => void;
  onCancelar: (id: string) => void;
  onDragStart: (e: React.DragEvent, turno: Turno) => void;
  onDropTurno: (e: React.DragEvent, columnaId: ColumnaId) => void;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
}) {
  const Icono = columna.id === 'pendientes' ? Hourglass
    : columna.id === 'en_atencion' ? Play
    : columna.id === 'atendidos' ? CheckCircle2
    : XCircle;

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDropTurno(e, columna.id)}
      className={`flex flex-col gap-2 min-h-[250px] rounded-xl p-3 transition-[transform,border-color,background-color,box-shadow] duration-200 border-2
        ${isDragOver
          ? 'border-primary bg-primary/5 shadow-lg scale-[1.01]'
          : 'border-transparent'
        }
        ${turnos.length === 0 && !isDragOver ? 'bg-muted/10' : ''}
      `}
    >
      {/* Header de columna */}
      <div className="flex items-center gap-2 px-1 mb-1">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg" style={{ backgroundColor: `${columna.color}18` }}>
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

      {/* Cards */}
      {turnos.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-8 text-center rounded-xl border-2 border-dashed flex-1 transition-colors
          ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/10'}
        `}>
          <Icono className="h-8 w-8 mb-2 opacity-30" style={{ color: columna.color }} />
          <p className="text-xs text-muted-foreground/60">
            {isDragOver ? 'Soltó acá' : 'Sin turnos'}
          </p>
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
              onDragStart={onDragStart}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Resumen de atención
// ============================================================
function ResumenBar({ total, enAtencion, atendidos, pendientes }: {
  total: number;
  enAtencion: number;
  atendidos: number;
  pendientes: number;
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
    </div>
  );
}

// ============================================================
// Página de Atención
// ============================================================
export default function AtencionPage() {
  const router = useRouter();
  const [turnos, setTurnos] = useState(TURNOS_INICIALES);
  const [mounted, setMounted] = useState(false);
  const [filtroMedico, setFiltroMedico] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnaId | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  // ============================================================
  // Acciones con botones
  // ============================================================
  const atenderTurno = useCallback((id: string) => {
    setTurnos((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, estado: 'en_atencion' as const, atendidoAt: new Date().toISOString() }
          : t
      )
    );
    const p = turnos.find((t) => t.id === id);
    toast({ title: 'En atención', description: `${p?.paciente} está siendo atendido` });
  }, [turnos]);

  const finalizarTurno = useCallback((id: string) => {
    setTurnos((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, estado: 'atendido' as const, atendidoAt: new Date().toISOString() }
          : t
      )
    );
    const p = turnos.find((t) => t.id === id);
    toast({ title: 'Atendido', description: `${p?.paciente} fue atendido correctamente` });
  }, [turnos]);

  const cancelarTurno = useCallback((id: string) => {
    setTurnos((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, estado: 'cancelada' as const } : t
      )
    );
    const p = turnos.find((t) => t.id === id);
    if (p) {
      toast({ title: 'Cancelado', description: `Turno de ${p.paciente} cancelado` });
    }
  }, [turnos]);

  // ============================================================
  // Drag & Drop handlers
  // ============================================================
  const handleDragStart = useCallback((e: React.DragEvent, turno: Turno) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: turno.id, estado: turno.estado }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(turno.id);
    // Capturar referencia antes del setTimeout (evita event pooling en React <18)
    const el = e.currentTarget as HTMLElement;
    requestAnimationFrame(() => {
      if (el) el.classList.add('dragging');
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, columnaId: ColumnaId) => {
    e.preventDefault();
    setDragOverColumn(columnaId);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Solo cuando realmente salimos de la zona (no a hijos)
    const relatedTarget = e.relatedTarget as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;
    if (!currentTarget.contains(relatedTarget)) {
      setDragOverColumn(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, columnaId: ColumnaId) => {
    e.preventDefault();
    setDragOverColumn(null);
    setDraggingId(null);

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const { id: turnoId } = data;

      // Mapa columna → estado
      const estadoMap: Record<ColumnaId, TurnoEstado> = {
        pendientes: 'pendiente',
        en_atencion: 'en_atencion',
        atendidos: 'atendido',
        cancelados: 'cancelada',
      };

      const nuevoEstado = estadoMap[columnaId];
      const turno = turnos.find((t) => t.id === turnoId);
      if (!turno || turno.estado === nuevoEstado) return;

      const now = new Date().toISOString();

      setTurnos((prev) =>
        prev.map((t) => {
          if (t.id !== turnoId) return t;
          const updated: Turno = { ...t, estado: nuevoEstado };
          if (nuevoEstado === 'en_atencion' || nuevoEstado === 'atendido') {
            updated.atendidoAt = now;
          }
          if (nuevoEstado === 'cancelada') {
            delete updated.atendidoAt;
          }
          return updated;
        })
      );

      // Toast según el destino
      const label = COLUMNAS.find((c) => c.id === columnaId)?.titulo || nuevoEstado;
      toast({
        title: `Movido a ${label}`,
        description: `${turno.paciente} → ${getTurnoLabel(nuevoEstado)}`,
      });

      // Remover clase dragging
      document.querySelectorAll('.dragging').forEach((el) => el.classList.remove('dragging'));
    } catch {
      // Ignorar errores de parseo
    }
  }, [turnos]);

  // Limpiar dragging state
  useEffect(() => {
    const handleDragEnd = () => {
      setDragOverColumn(null);
      setDraggingId(null);
      document.querySelectorAll('.dragging').forEach((el) => el.classList.remove('dragging'));
    };
    document.addEventListener('dragend', handleDragEnd);
    return () => document.removeEventListener('dragend', handleDragEnd);
  }, []);

  // ============================================================
  // Filtrar turnos
  // ============================================================
  const turnosFiltrados = filtroMedico
    ? turnos.filter((t) => t.medico === filtroMedico)
    : turnos;

  const agrupar = (estados: TurnoEstado[]) =>
    turnosFiltrados
      .filter((t) => estados.includes(t.estado))
      .sort((a, b) => a.hora.localeCompare(b.hora));

  const pendientes = agrupar(['pendiente', 'confirmada']);
  const enAtencion = agrupar(['en_atencion']);
  const atendidos = agrupar(['atendido']);
  const cancelados = agrupar(['cancelada']);

  const medicos = Array.from(new Set(turnos.map((t) => t.medico)));

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <PageHeader title="Atención de Turnos" gradient />
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            {/* Filtro por médico */}
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
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/turnos')} className="shrink-0">
              <Calendar className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Ver Agenda</span>
              <span className="sm:hidden">Agenda</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>
        </div>

      {/* Barra de resumen */}
      <Card className="border-primary/10 bg-gradient-to-br from-primary/[0.03] to-transparent">
        <CardContent className="p-4">
          <ResumenBar
            total={turnosFiltrados.filter((t) => t.estado !== 'cancelada').length}
            enAtencion={enAtencion.length}
            atendidos={atendidos.length}
            pendientes={pendientes.length}
          />
        </CardContent>
      </Card>

      {/* Tablero Kanban con drag & drop */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Tablero de Atención
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {draggingId ? (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {COLUMNAS.map((col) => {
                const turnosCol =
                  col.id === 'pendientes' ? pendientes
                  : col.id === 'en_atencion' ? enAtencion
                  : col.id === 'atendidos' ? atendidos
                  : cancelados;

                return (
                  <KanbanColumn
                    key={col.id}
                    columna={col}
                    turnos={turnosCol}
                    onAtender={atenderTurno}
                    onFinalizar={finalizarTurno}
                    onCancelar={cancelarTurno}
                    onDragStart={handleDragStart}
                    onDropTurno={handleDrop}
                    isDragOver={dragOverColumn === col.id}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Indicador de drag activo */}
      {draggingId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-5 py-2.5 rounded-full shadow-xl text-sm font-medium animate-in slide-in-from-bottom-4">
          Soltá el turno en la columna deseada
        </div>
      )}

      {/* Leyenda de estados */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getTurnoColor('pendiente') }} /> Pendiente
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getTurnoColor('confirmada') }} /> Confirmada
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getTurnoColor('en_atencion') }} /> En atención
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getTurnoColor('atendido') }} /> Atendido
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getTurnoColor('cancelada') }} /> Cancelada
        </span>
        <span className="flex items-center gap-1 text-muted-foreground/50 ml-auto">
          <GripVertical className="h-3 w-3" /> Drag &amp; drop activo
        </span>
      </div>
    </div>
  );
}
