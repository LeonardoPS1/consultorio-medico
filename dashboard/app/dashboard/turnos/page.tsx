'use client';

import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { getTurnoColor, getTurnoLabel } from '@/lib/utils';
import { CalendarView, type CalendarioTurno } from '@/components/calendar/calendar-view';
import { NuevoTurnoModal } from '@/components/modals/nuevo-turno-modal';
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

// ============================================================
// Tipos
// ============================================================
type TurnoEstado = 'pendiente' | 'confirmada' | 'en_atencion' | 'atendido' | 'cancelada' | 'en_consulta' | 'completada' | 'no_asistio';

interface TurnoData {
  id: string;
  hora: string;
  paciente: string;
  tipo: string;
  medico: string;
  estado: TurnoEstado;
  fecha: string;
}

// ============================================================
// Mock data
// ============================================================
const hoy = new Date();
const hoyStr = hoy.toISOString().split('T')[0];
const mananaStr = new Date(hoy.getTime() + 86400000).toISOString().split('T')[0];

const TURNOS_INICIALES: TurnoData[] = [
  { id: '1', hora: '09:00', paciente: 'Juan Pérez', tipo: 'Consulta Médica', medico: 'Dr. García', estado: 'confirmada', fecha: hoyStr },
  { id: '2', hora: '09:30', paciente: 'María Rodríguez', tipo: 'Control', medico: 'Dr. García', estado: 'atendido', fecha: hoyStr },
  { id: '3', hora: '10:00', paciente: 'Pedro Sánchez', tipo: 'Resultados', medico: 'Dra. López', estado: 'en_atencion', fecha: hoyStr },
  { id: '4', hora: '10:30', paciente: 'Ana López', tipo: 'Consulta', medico: 'Dr. García', estado: 'confirmada', fecha: hoyStr },
  { id: '5', hora: '11:00', paciente: 'Carlos Ruiz', tipo: 'Especialista', medico: 'Dra. López', estado: 'pendiente', fecha: hoyStr },
  { id: '6', hora: '11:30', paciente: 'Laura Martínez', tipo: 'Control', medico: 'Dr. García', estado: 'confirmada', fecha: hoyStr },
  { id: '7', hora: '12:00', paciente: 'Sofía Herrera', tipo: 'Primera vez', medico: 'Dra. López', estado: 'cancelada', fecha: hoyStr },
  { id: '8', hora: '15:00', paciente: 'Diego Torres', tipo: 'Consulta', medico: 'Dr. García', estado: 'pendiente', fecha: hoyStr },
  { id: '9', hora: '15:30', paciente: 'Elena Martínez', tipo: 'Control', medico: 'Dr. García', estado: 'atendido', fecha: hoyStr },
  { id: '10', hora: '16:00', paciente: 'Roberto Fernández', tipo: 'Primera vez', medico: 'Dra. López', estado: 'pendiente', fecha: hoyStr },
  { id: '11', hora: '09:00', paciente: 'Valentina Gómez', tipo: 'Consulta', medico: 'Dr. García', estado: 'confirmada', fecha: mananaStr },
  { id: '12', hora: '10:30', paciente: 'Luis Martínez', tipo: 'Resultados', medico: 'Dra. López', estado: 'pendiente', fecha: mananaStr },
  { id: '13', hora: '14:00', paciente: 'Camila Torres', tipo: 'Control', medico: 'Dr. García', estado: 'no_asistio', fecha: mananaStr },
  { id: '14', hora: '16:00', paciente: 'Facundo Díaz', tipo: 'Primera vez', medico: 'Dr. García', estado: 'pendiente', fecha: hoyStr },
  { id: '15', hora: '17:00', paciente: 'Florencia Rivas', tipo: 'Consulta', medico: 'Dra. López', estado: 'en_atencion', fecha: hoyStr },
];

// ============================================================
// Estados agrupados para filtro
// ============================================================
const OPCIONES_ESTADO = [
  { value: '', label: 'Todos los estados' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'en_atencion', label: 'En atención' },
  { value: 'atendido', label: 'Atendido' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'no_asistio', label: 'No asistió' },
];

// ============================================================
// Página
// ============================================================
export default function TurnosPage() {
  const [view, setView] = useState<'lista' | 'calendario'>('lista');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showNewTurno, setShowNewTurno] = useState(false);
  const [editTurno, setEditTurno] = useState<TurnoData | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState<string | null>(null);
  const [turnos, setTurnos] = useState(TURNOS_INICIALES);
  const [showFilters, setShowFilters] = useState(false);

  // Filtros
  const [filtroMedico, setFiltroMedico] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [searchText, setSearchText] = useState('');

  // Valores únicos para filtros
  const medicos = useMemo(() => Array.from(new Set(turnos.map((t) => t.medico))), [turnos]);
  const tipos = useMemo(() => Array.from(new Set(turnos.map((t) => t.tipo))), [turnos]);

  // Cantidad de filtros activos
  const filtrosActivos = [filtroMedico, filtroEstado, filtroTipo, searchText].filter(Boolean).length;

  // Turnos filtrados
  const turnosFiltrados = useMemo(() => {
    let result = [...turnos];

    if (filtroMedico) {
      result = result.filter((t) => t.medico === filtroMedico);
    }
    if (filtroEstado) {
      result = result.filter((t) => t.estado === filtroEstado);
    }
    if (filtroTipo) {
      result = result.filter((t) => t.tipo === filtroTipo);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.paciente.toLowerCase().includes(q) ||
          t.medico.toLowerCase().includes(q) ||
          t.tipo.toLowerCase().includes(q)
      );
    }

    return result;
  }, [turnos, filtroMedico, filtroEstado, filtroTipo, searchText]);

  // Turnos del día seleccionado (aplica fecha + filtros)
  const filteredByDate = useMemo(() => {
    return turnosFiltrados.filter((t) => {
      const tDate = new Date(t.fecha);
      return (
        tDate.getFullYear() === selectedDate.getFullYear() &&
        tDate.getMonth() === selectedDate.getMonth() &&
        tDate.getDate() === selectedDate.getDate()
      );
    });
  }, [turnosFiltrados, selectedDate]);

  const limpiarFiltros = () => {
    setFiltroMedico('');
    setFiltroEstado('');
    setFiltroTipo('');
    setSearchText('');
  };

  const navigateDate = (delta: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + delta);
    setSelectedDate(newDate);
  };

  const goToToday = () => setSelectedDate(new Date());

  const handleNuevoTurno = (data: { paciente: string; tipo: string; medico: string; hora: string; fecha: string }) => {
    const newTurno: TurnoData = {
      id: String(Date.now()),
      hora: data.hora,
      paciente: data.paciente,
      tipo: data.tipo,
      medico: data.medico,
      estado: 'pendiente',
      fecha: data.fecha || hoyStr,
    };
    setTurnos((prev) => [newTurno, ...prev]);
    toast({ title: 'Turno creado', description: `${data.paciente} - ${data.hora}` });
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Turnos</h2>
          <p className="text-muted-foreground">
            Gestioná los turnos de tus pacientes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border p-1">
            <Button
              variant={view === 'lista' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('lista')}
            >
              <List className="h-4 w-4 mr-1" />
              Lista
            </Button>
            <Button
              variant={view === 'calendario' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('calendario')}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Calendario
            </Button>
          </div>
          <Button onClick={() => setShowNewTurno(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Turno
          </Button>
        </div>
      </div>

      {/* Navegación de fecha + filtros (solo en vista lista) */}
      {view === 'lista' && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-semibold min-w-[200px] text-center">
                {selectedDate.toLocaleDateString('es-AR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
              <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="ml-2" onClick={goToToday}>
                Hoy
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {/* Filtros activos badge */}
              {filtrosActivos > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {filtrosActivos} filtro{filtrosActivos !== 1 ? 's' : ''} activo{filtrosActivos !== 1 ? 's' : ''}
                </div>
              )}
              <Button
                variant={showFilters ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filtros
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
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Filter className="h-4 w-4 text-primary" />
                    Filtros
                  </p>
                  {filtrosActivos > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={limpiarFiltros}>
                      <RotateCcw className="h-3 w-3" />
                      Limpiar filtros
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Búsqueda por texto */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Buscar paciente</Label>
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

                  {/* Filtro por médico */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Médico</Label>
                    <div className="flex gap-1.5 flex-wrap">
                      <Button
                        variant={filtroMedico === '' ? 'secondary' : 'outline'}
                        size="sm"
                        className="h-9 text-xs"
                        onClick={() => setFiltroMedico('')}
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
                          onClick={() => setFiltroMedico(filtroMedico === m ? '' : m)}
                        >
                          {m}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Filtro por estado */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Estado</Label>
                    <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todos los estados" />
                      </SelectTrigger>
                      <SelectContent>
                        {OPCIONES_ESTADO.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            <span className="flex items-center gap-2">
                              {op.value && (
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: getTurnoColor(op.value) }}
                                />
                              )}
                              {op.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro por tipo */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tipo de consulta</Label>
                    <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todos los tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos los tipos</SelectItem>
                        {tipos.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Resumen de turnos encontrados */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t">
                  <span>
                    <strong className="text-foreground">{filteredByDate.length}</strong> turnos encontrados
                    {filtrosActivos > 0 && (
                      <> de <strong className="text-foreground">{turnosFiltrados.length}</strong> totales en el período</>
                    )}
                  </span>
                  {filtrosActivos > 0 && (
                    <>
                      <span>&middot;</span>
                      {filtroMedico && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                          <Users className="h-3 w-3" /> {filtroMedico}
                          <button onClick={() => setFiltroMedico('')}><X className="h-2.5 w-2.5" /></button>
                        </Badge>
                      )}
                      {filtroEstado && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getTurnoColor(filtroEstado) }} />
                          {getTurnoLabel(filtroEstado)}
                          <button onClick={() => setFiltroEstado('')}><X className="h-2.5 w-2.5" /></button>
                        </Badge>
                      )}
                      {filtroTipo && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                          {filtroTipo}
                          <button onClick={() => setFiltroTipo('')}><X className="h-2.5 w-2.5" /></button>
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Vista de Lista */}
      {view === 'lista' && (
        <Card>
          <CardContent className="p-0">
            {filteredByDate.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  {filtrosActivos > 0 ? 'Sin turnos con esos filtros' : 'Sin turnos para esta fecha'}
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
                  {filtrosActivos > 0
                    ? 'Probá cambiando los filtros o seleccionando otra fecha'
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
                {filteredByDate
                  .sort((a, b) => a.hora.localeCompare(b.hora))
                  .map((turno) => (
                    <div
                      key={turno.id}
                      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer border-l-4"
                      style={{ borderLeftColor: getTurnoColor(turno.estado) }}
                    >
                      {/* Hora */}
                      <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-primary/10 text-primary font-bold text-sm">
                        {turno.hora}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{turno.paciente}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {turno.tipo} &middot; {turno.medico}
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
                      >
                        {getTurnoLabel(turno.estado)}
                      </Badge>

                      {/* Acciones */}
                      <div className="flex gap-1">
                        {(turno.estado === 'pendiente' || turno.estado === 'confirmada') && (
                          <Button variant="outline" size="sm" className="text-xs h-8 gap-1" onClick={(e) => { e.stopPropagation(); setTurnos((prev) => prev.map((t) => t.id === turno.id ? { ...t, estado: 'en_atencion' as const } : t)); toast({ title: 'En atención', description: `${turno.paciente} está siendo atendido` }); }}>
                            <Play className="h-3 w-3" /> Atender
                          </Button>
                        )}
                        {turno.estado === 'en_atencion' && (
                          <Button variant="outline" size="sm" className="text-xs h-8 gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={(e) => { e.stopPropagation(); setTurnos((prev) => prev.map((t) => t.id === turno.id ? { ...t, estado: 'atendido' as const } : t)); toast({ title: 'Atendido', description: `${turno.paciente} fue atendido` }); }}>
                            <CheckCircle2 className="h-3 w-3" /> Finalizar
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditTurno(turno); }}>
                          Editar
                        </Button>
                        {(turno.estado !== 'atendido' && turno.estado !== 'cancelada') && (
                          <Button
                            variant="ghost" size="sm" className="text-destructive"
                            onClick={(e) => { e.stopPropagation(); setShowCancelDialog(turno.id); }}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vista Calendario */}
      {view === 'calendario' && (
        <CalendarView
          turnos={turnosFiltrados}
          onDateChange={setSelectedDate}
          onTurnoClick={(turno) => console.log('Turno clicked:', turno)}
        />
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
        {filtrosActivos > 0 && (
          <span className="ml-auto text-xs flex items-center gap-1">
            <Filter className="h-3 w-3" />
            {filteredByDate.length} de {turnosFiltrados.length} turnos
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
      <Dialog open={!!editTurno} onOpenChange={(o) => { if (!o) setEditTurno(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Turno</DialogTitle>
            <DialogDescription>Modificá los datos del turno</DialogDescription>
          </DialogHeader>
          {editTurno && (
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Paciente</Label>
                <Input defaultValue={editTurno.paciente} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Fecha</Label>
                  <Input type="date" defaultValue={editTurno.fecha} />
                </div>
                <div className="space-y-1">
                  <Label>Hora</Label>
                  <Input type="time" defaultValue={editTurno.hora} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select defaultValue={editTurno.estado}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Button variant="outline" onClick={() => setEditTurno(null)}>Cancelar</Button>
            <Button onClick={() => { setEditTurno(null); toast({ title: 'Turno actualizado' }); }}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación cancelar */}
      <Dialog open={!!showCancelDialog} onOpenChange={(o) => { if (!o) setShowCancelDialog(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Cancelar Turno</DialogTitle>
            <DialogDescription>¿Estás seguro de que querés cancelar este turno?</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo de cancelación</Label>
            <Input placeholder="Ej: El paciente solicitó cancelación" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(null)}>Volver</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (showCancelDialog) {
                  setTurnos((prev) => prev.map((t) =>
                    t.id === showCancelDialog ? { ...t, estado: 'cancelada' as const } : t
                  ));
                  toast({ title: 'Turno cancelado', description: 'El turno fue cancelado correctamente' });
                  setShowCancelDialog(null);
                }
              }}
            >
              Confirmar cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
