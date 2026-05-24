'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  List,
  Play,
  CheckCircle2,
  XCircle,
  Search,
  X,
  Users,
  RotateCcw,
  CalendarPlus,
  MessageSquare,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getTurnoColor, getTurnoLabel } from '@/lib/utils';
import { CalendarView } from '@/components/calendar/calendar-view';
import { NuevoTurnoModal } from '@/components/modals/nuevo-turno-modal';
import { descargarICS } from '@/lib/ics';
import { generateGCalUrl, formatGCalEventText } from '@/lib/google-calendar';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

// ─── Props ────────────────────────────────────────────────

interface TurnosClientProps {
  initialTurnos: TurnoData[];
  initialMedicos: string[];
  initialTipos: string[];
  initialFecha: string;
}

// ─── Constants ────────────────────────────────────────────

const OPCIONES_ESTADO = [
  { value: '__all__', label: 'Todos los estados' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'en_atencion', label: 'En atención' },
  { value: 'atendido', label: 'Atendido' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'no_asistio', label: 'No asistió' },
];

// ─── Component ────────────────────────────────────────────

export function TurnosClient({
  initialTurnos,
  initialMedicos,
  initialTipos,
  initialFecha,
}: TurnosClientProps) {
  const [view, setView] = useState<'lista' | 'calendario'>('lista');
  const [selectedDate, setSelectedDate] = useState(() => new Date(initialFecha + 'T12:00:00'));
  const [showNewTurno, setShowNewTurno] = useState(false);
  const [editTurno, setEditTurno] = useState<TurnoData | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState<string | null>(null);
  const [turnos, setTurnos] = useState<TurnoData[]>(initialTurnos);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [filtroMedico, setFiltroMedico] = useState('__all__');
  const [filtroEstado, setFiltroEstado] = useState('__all__');
  const [filtroTipo, setFiltroTipo] = useState('__all__');
  const [searchText, setSearchText] = useState('');
  const [savingStates, setSavingStates] = useState<Set<string>>(new Set());

  // Valores únicos para filtros
  const medicos = useMemo(
    () => Array.from(new Set([...initialMedicos, ...turnos.map((t) => t.medico)])),
    [turnos, initialMedicos],
  );
  const tipos = useMemo(
    () => Array.from(new Set([...initialTipos, ...turnos.map((t) => t.tipo)])),
    [turnos, initialTipos],
  );

  // Cantidad de filtros activos
  const filtrosActivos = [filtroMedico, filtroEstado, filtroTipo, searchText].filter(
    (v) => v && v !== '__all__',
  ).length;

  // ─── Keyboard shortcuts ──────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowFilters(true);
        setTimeout(() => {
          const input = document.querySelector<HTMLInputElement>('[placeholder="Nombre del paciente..."]');
          input?.focus();
        }, 100);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setShowNewTurno(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ─── Fetch turnos para una fecha ───────────────────────

  const fetchTurnos = useCallback(async (fecha: Date) => {
    setLoading(true);
    try {
      const fechaStr = fecha.toISOString().split('T')[0];
      const params = new URLSearchParams();
      params.set('fecha', fechaStr);
      params.set('limit', '200');

      const res = await fetch(`/api/turnos?${params.toString()}`);
      if (!res.ok) throw new Error('Error al cargar turnos');
      const json = await res.json();
      setTurnos(json.data || []);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los turnos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Navegación de fecha ───────────────────────────────

  const navigateDate = useCallback(
    (delta: number) => {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() + delta);
      setSelectedDate(newDate);
      fetchTurnos(newDate);
    },
    [selectedDate, fetchTurnos],
  );

  const goToToday = useCallback(() => {
    const today = new Date();
    setSelectedDate(today);
    fetchTurnos(today);
  }, [fetchTurnos]);

  // ─── Turnos filtrados ──────────────────────────────────

  const turnosFiltrados = useMemo(() => {
    let result = [...turnos];

    if (filtroMedico && filtroMedico !== '__all__') {
      result = result.filter((t) => t.medico === filtroMedico);
    }
    if (filtroEstado && filtroEstado !== '__all__') {
      result = result.filter((t) => t.estado === filtroEstado);
    }
    if (filtroTipo && filtroTipo !== '__all__') {
      result = result.filter((t) => t.tipo === filtroTipo);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.paciente.toLowerCase().includes(q) ||
          t.medico.toLowerCase().includes(q) ||
          t.tipo.toLowerCase().includes(q),
      );
    }

    return result;
  }, [turnos, filtroMedico, filtroEstado, filtroTipo, searchText]);

  const limpiarFiltros = () => {
    setFiltroMedico('__all__');
    setFiltroEstado('__all__');
    setFiltroTipo('__all__');
    setSearchText('');
  };

  // ─── CRUD con API ─────────────────────────────────────

  const handleNuevoTurno = async (data: {
    paciente: string;
    tipo: string;
    medico: string;
    hora: string;
    fecha: string;
  }) => {
    try {
      // Buscar paciente que coincida
      const busquedaPaciente = await fetch(`/api/pacientes?search=${encodeURIComponent(data.paciente)}&limit=5`);
      const pacientesJson = await busquedaPaciente.json();
      const pacienteEncontrado = pacientesJson.data?.[0];

      // Buscar médico
      const turnosRes = await fetch(`/api/turnos?fecha=${data.fecha}&limit=1`);
      const turnosJson = await turnosRes.json();
      const medicosDisponibles = turnosJson.medicos || [];
      const medicoNombre = data.medico;

      if (!pacienteEncontrado) {
        toast({ title: 'Error', description: 'Paciente no encontrado. Creá el paciente primero.', variant: 'destructive' });
        return;
      }

      // Crear turno vía API
      const res = await fetch('/api/turnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: pacienteEncontrado.id,
          medicoId: '',
          fecha: data.fecha,
          hora: data.hora,
          tipoConsulta: data.tipo || 'presencial',
          motivo: data.tipo,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast({ title: 'Error', description: err.error || 'No se pudo crear el turno', variant: 'destructive' });
        return;
      }

      const json = await res.json();
      const created = json.data;
      const newTurno: TurnoData = {
        id: created.id,
        hora: data.hora,
        paciente: data.paciente,
        tipo: data.tipo,
        medico: data.medico,
        estado: created.estado || 'pendiente',
        fecha: data.fecha || selectedDate.toISOString().split('T')[0],
        medicoId: created.medicoId || '',
        pacienteId: created.pacienteId || '',
      };
      setTurnos((prev) => [newTurno, ...prev]);
      toast({ title: 'Turno creado', description: `${data.paciente} - ${data.hora}` });
    } catch {
      toast({ title: 'Error', description: 'Error de red al crear turno', variant: 'destructive' });
    }
  };

  const actualizarEstado = async (id: string, nuevoEstado: TurnoEstado, descripcion: string) => {
    // Optimistic update + pulsing badge
    setSavingStates(prev => new Set(prev).add(id));
    setTurnos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, estado: nuevoEstado } : t)),
    );
    toast({ title: descripcion });

    try {
      await fetch(`/api/turnos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
    } catch {
      setTurnos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, estado: 'pendiente' } : t)),
      );
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' });
    } finally {
      setSavingStates(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  // ─── Render ────────────────────────────────────────────

  return (
    <>
      {/* Botones de acción + toggle vista (fuera del condicional de lista) */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border p-1">
            <Button
              variant={view === 'lista' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('lista')}
            >
              <List className="h-4 w-4 md:mr-1" />
              <span className="hidden md:inline">Lista</span>
            </Button>
            <Button
              variant={view === 'calendario' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('calendario')}
            >
              <Calendar className="h-4 w-4 md:mr-1" />
              <span className="hidden md:inline">Calendario</span>
            </Button>
          </div>
        </div>
        <Button onClick={() => setShowNewTurno(true)} size="sm" className="text-xs md:text-sm">
          <Plus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Nuevo Turno</span>
          <kbd className="hidden md:inline ml-2 text-[10px] opacity-50">Ctrl+N</kbd>
        </Button>
      </div>

      {/* Vista Lista */}
      {view === 'lista' && (
        <>
          {/* Navegación de fecha + filtros */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateDate(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-sm sm:text-lg font-semibold min-w-[120px] sm:min-w-[200px] text-center truncate">
                <span className="hidden sm:inline">
                  {selectedDate.toLocaleDateString('es-AR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                <span className="sm:hidden">
                  {selectedDate.toLocaleDateString('es-AR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </h3>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateDate(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={goToToday}
              >
                Hoy
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {filtrosActivos > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {filtrosActivos} filtro
                  {filtrosActivos !== 1 ? 's' : ''} activo
                  {filtrosActivos !== 1 ? 's' : ''}
                </div>
              )}
              <Button
                variant={showFilters ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-1" />
                <span className="hidden md:inline">Filtros</span>
                <kbd className="hidden md:inline ml-1.5 text-[9px] opacity-40">Ctrl+K</kbd>
                {filtrosActivos > 0 && (
                  <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {filtrosActivos}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Panel de filtros expandible */}
          {showFilters && (
            <Card className="border-primary/20 bg-muted/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Filter className="h-4 w-4 text-primary" />
                    Filtros
                  </p>
                  {filtrosActivos > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={limpiarFiltros}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Limpiar filtros
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Búsqueda */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Buscar paciente
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Nombre del paciente..."
                        className="pl-8 h-9 text-sm"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                      />
                      {searchText && (
                        <button
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setSearchText('')}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Médico */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Médico</Label>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant={filtroMedico === '__all__' ? 'secondary' : 'outline'}
                        size="sm"
                        className="h-9 text-xs"
                        onClick={() => setFiltroMedico('__all__')}
                      >
                        <Users className="h-3.5 w-3.5 mr-1" />
                        Todos
                      </Button>
                      {medicos.map((m) => (
                        <Button
                          key={m}
                          variant={filtroMedico === m ? 'default' : 'outline'}
                          size="sm"
                          className="h-9 text-xs"
                          onClick={() =>
                            setFiltroMedico(filtroMedico === m ? '__all__' : m)
                          }
                        >
                          {m}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Estado */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Estado</Label>
                    <Select
                      value={filtroEstado === '__all__' ? '__all__' : filtroEstado}
                      onValueChange={(v) => setFiltroEstado(v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todos los estados" />
                      </SelectTrigger>
                      <SelectContent>
                        {OPCIONES_ESTADO.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            <span className="flex items-center gap-2">
                              {op.value !== '__all__' && (
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{
                                    backgroundColor: getTurnoColor(op.value),
                                  }}
                                />
                              )}
                              {op.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tipo */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Tipo de consulta
                    </Label>
                    <Select
                      value={filtroTipo === '__all__' ? '__all__' : filtroTipo}
                      onValueChange={(v) => setFiltroTipo(v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todos los tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todos los tipos</SelectItem>
                        {tipos.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Resumen */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t">
                  <span>
                    <strong className="text-foreground">
                      {loading ? '...' : turnosFiltrados.length}
                    </strong>{' '}
                    turnos encontrados
                    {filtrosActivos > 0 && (
                      <>
                        {' '}
                        de{' '}
                        <strong className="text-foreground">{turnos.length}</strong>{' '}
                        totales
                      </>
                    )}
                  </span>
                  {filtrosActivos > 0 && (
                    <>
                      <span>&middot;</span>
                      {filtroMedico && filtroMedico !== '__all__' && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                          <Users className="h-3 w-3" /> {filtroMedico}
                          <button onClick={() => setFiltroMedico('__all__')}>
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      )}
                      {filtroEstado && filtroEstado !== '__all__' && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: getTurnoColor(filtroEstado) }}
                          />
                          {getTurnoLabel(filtroEstado)}
                          <button onClick={() => setFiltroEstado('__all__')}>
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      )}
                      {filtroTipo && filtroTipo !== '__all__' && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                          {filtroTipo}
                          <button onClick={() => setFiltroTipo('__all__')}>
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de turnos */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/20 animate-pulse">
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
                  ))}
                </div>
              ) : turnosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    {filtrosActivos > 0
                      ? 'Sin turnos con esos filtros'
                      : 'Sin turnos para esta fecha'}
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
                    {filtrosActivos > 0
                      ? 'Probá cambiando los filtros'
                      : 'No hay turnos agendados para este día'}
                  </p>
                  <div className="flex gap-2">
                    {filtrosActivos > 0 && (
                      <Button variant="outline" onClick={limpiarFiltros}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Limpiar filtros
                      </Button>
                    )}
                    <Button onClick={() => setShowNewTurno(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Turno
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="divide-y">
                  {turnosFiltrados
                    .sort((a, b) => a.hora.localeCompare(b.hora))
                    .map((turno) => (
                      <div
                        key={turno.id}
                        className="flex items-center gap-2 md:gap-4 p-3 md:p-4 hoverable:hover:bg-muted/50 transition-colors cursor-pointer border-l-4"
                        style={{
                          borderLeftColor: getTurnoColor(turno.estado),
                        }}
                      >
                        {/* Hora */}
                        <div className="flex items-center justify-center h-10 w-10 md:h-14 md:w-14 rounded-xl bg-primary/10 text-primary font-bold text-xs md:text-sm shrink-0">
                          {turno.hora}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {turno.paciente}
                          </p>
                          <p className="text-xs text-muted-foreground truncate hidden md:block">
                            {turno.tipo} &middot; {turno.medico}
                          </p>
                          <p className="text-xs text-muted-foreground truncate md:hidden">
                            {turno.tipo}
                          </p>
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

                        {/* Acciones — desktop: inline, mobile: dropdown */}
                        <div className="flex gap-1">
                          <div className="hidden md:flex gap-1">
                            {(turno.estado === 'pendiente' ||
                              turno.estado === 'confirmada') && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-8 gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  actualizarEstado(
                                    turno.id,
                                    'en_atencion',
                                    `En atención`,
                                  );
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
                                  actualizarEstado(
                                    turno.id,
                                    'atendido',
                                    `${turno.paciente} fue atendido`,
                                  );
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
                                setEditTurno(turno);
                              }}
                            >
                              Editar
                            </Button>
                            {turno.estado !== 'atendido' &&
                              turno.estado !== 'cancelada' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowCancelDialog(turno.id);
                              }}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Cancelar
                            </Button>
                          )}
                          </div>

                          {/* Mobile dropdown */}
                          <div className="md:hidden">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                {(turno.estado === 'pendiente' || turno.estado === 'confirmada') && (
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); actualizarEstado(turno.id, 'en_atencion', 'En atención'); }}>
                                    <Play className="h-4 w-4 mr-2" /> Atender
                                  </DropdownMenuItem>
                                )}
                                {turno.estado === 'en_atencion' && (
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); actualizarEstado(turno.id, 'atendido', `${turno.paciente} fue atendido`); }}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" /> Finalizar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditTurno(turno); }}>
                                  Editar
                                </DropdownMenuItem>
                                {turno.estado !== 'atendido' && turno.estado !== 'cancelada' && (
                                  <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setShowCancelDialog(turno.id); }}>
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
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z" fill="currentColor"/>
                          </svg>
                        </Button>

                        {/* ICS download */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hoverable:hover:text-primary"
                          title="Descargar .ics (Outlook, Apple)"
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
                        {turno.estado === 'atendido' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hoverable:hover:text-emerald-700"
                            title="Enviar encuesta de satisfaccion"
                            onClick={(e) => {
                              e.stopPropagation();
                              const msg = encodeURIComponent(
                                `📋 *Encuesta de Satisfaccion*%0A%0AHola ${turno.paciente}, ¿como calificarias tu consulta del ${turno.fecha}?%0A%0AResponde con un numero del 1 al 5:%0A1 😞 Muy mala%0A2 😕 Regular%0A3 😐 Normal%0A4 🙂 Buena%0A5 😍 Excelente%0A%0A¡Gracias por tu tiempo!`
                              );
                              window.open(`https://wa.me/?text=${msg}`, '_blank');
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Vista Calendario */}
      {view === 'calendario' && (
        <CalendarView
          turnos={turnosFiltrados as any}
          onDateChange={(date: Date) => {
            setSelectedDate(date);
            fetchTurnos(date);
          }}
          onTurnoClick={(turno) => console.log('Turno clicked:', turno)}
        />
      )}

      {/* Leyenda de estados */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
        {[
          'pendiente',
          'confirmada',
          'en_atencion',
          'atendido',
          'cancelada',
        ].map((estado) => (
          <span key={estado} className="flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: getTurnoColor(estado) }}
            />
            {getTurnoLabel(estado)}
          </span>
        ))}
        {filtrosActivos > 0 && (
          <span className="ml-auto text-xs flex items-center gap-1">
            <Filter className="h-3 w-3" />
            {turnosFiltrados.length} de {turnos.length} turnos
          </span>
        )}
      </div>

      {/* Modal Nuevo Turno */}
      <NuevoTurnoModal
        open={showNewTurno}
        onOpenChange={setShowNewTurno}
        onSubmit={handleNuevoTurno}
      />

      {/* Modal Editar Turno */}
      <Dialog
        open={!!editTurno}
        onOpenChange={(o) => {
          if (!o) setEditTurno(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Turno</DialogTitle>
            <DialogDescription>
              Modificá los datos del turno
            </DialogDescription>
          </DialogHeader>
          {editTurno && (
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Paciente</Label>
                <Input id="edit-paciente" defaultValue={editTurno.paciente} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Fecha</Label>
                  <Input id="edit-fecha" type="date" defaultValue={editTurno.fecha} />
                </div>
                <div className="space-y-1">
                  <Label>Hora</Label>
                  <Input id="edit-hora" type="time" defaultValue={editTurno.hora} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select defaultValue={editTurno.estado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="en_consulta">En consulta</SelectItem>
                    <SelectItem value="en_atencion">En atención</SelectItem>
                    <SelectItem value="atendido">Atendido</SelectItem>
                    <SelectItem value="completada">Completada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                    <SelectItem value="no_asistio">No asistió</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTurno(null)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!editTurno) return;
                const fechaEl = document.getElementById('edit-fecha') as HTMLInputElement;
                const horaEl = document.getElementById('edit-hora') as HTMLInputElement;
                const fecha = fechaEl?.value;
                const hora = horaEl?.value;

                try {
                  await fetch(`/api/turnos/${editTurno.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fecha, hora }),
                  });
                  setTurnos((prev) =>
                    prev.map((t) =>
                      t.id === editTurno.id
                        ? { ...t, fecha: fecha || t.fecha, hora: hora || t.hora }
                        : t,
                    ),
                  );
                  toast({ title: 'Turno actualizado' });
                } catch {
                  toast({ title: 'Error', description: 'No se pudo actualizar el turno', variant: 'destructive' });
                }
                setEditTurno(null);
              }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo cancelar turno */}
      <Dialog
        open={!!showCancelDialog}
        onOpenChange={(o) => {
          if (!o) setShowCancelDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Cancelar Turno</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que querés cancelar este turno?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo de cancelación</Label>
            <Input
              id="motivoCancelacion"
              placeholder="Ej: El paciente solicitó cancelación"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(null)}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (showCancelDialog) {
                  const motivo = (document.getElementById('motivoCancelacion') as HTMLInputElement)?.value || '';
                  // Optimistic update
                  setTurnos((prev) =>
                    prev.map((t) =>
                      t.id === showCancelDialog
                        ? { ...t, estado: 'cancelada' as const }
                        : t,
                    ),
                  );
                  setShowCancelDialog(null);
                  toast({
                    title: 'Turno cancelado',
                    description: 'El turno fue cancelado correctamente',
                  });

                  try {
                    await fetch(`/api/turnos/${showCancelDialog}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ estado: 'cancelada', motivoCancelacion: motivo }),
                    });
                  } catch {
                    toast({
                      title: 'Error',
                      description: 'No se pudo persistir la cancelación',
                      variant: 'destructive',
                    });
                  }
                }
              }}
            >
              Confirmar cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
