'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSucursal } from '@/lib/sucursal-context';
import { Calendar } from 'lucide-react';
import { getTurnoColor, getTurnoLabel } from '@/lib/utils';
import { PageAnimation } from '@/components/dashboard/page-animation';
import { motion } from 'motion/react';
import { NuevoTurnoModal } from '@/components/modals/nuevo-turno-modal';
import { playDelete } from '@/lib/sound';
import { toast } from '@/components/ui/use-toast';

// Existing extracted components
import { TurnosFilters } from '@/components/turnos/turnos-filters';
import { TurnosTable } from '@/components/turnos/turnos-table';
import { TurnosCalendar } from '@/components/turnos/turnos-calendar';
import { TurnoDetailModal, CancelTurnoDialog } from '@/components/turnos/turno-detail-modal';

// New extracted components
import { TurnosHeader } from '@/components/turnos/turnos-header';
import { TurnosDateNav } from '@/components/turnos/turnos-date-nav';
import { TurnosDayView } from '@/components/turnos/turnos-day-view';
import {
  WaitlistReassignDialog,
  WaitlistProposalDialog,
} from '@/components/turnos/turnos-waitlist-dialogs';
import { NuevoPacienteConfirmDialog } from '@/components/turnos/turnos-patient-confirm';
import type { MedicoDia, TurnoDia } from '@/components/turnos/day-timeline';

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

// ─── Component ────────────────────────────────────────────

export function TurnosClient({
  initialTurnos,
  initialMedicos,
  initialTipos,
  initialFecha,
}: TurnosClientProps) {
  const { sucursalId } = useSucursal();
  const [view, setView] = useState<'lista' | 'calendario' | 'dia'>('lista');
  const [selectedDate, setSelectedDate] = useState(() => new Date(initialFecha + 'T12:00:00'));
  const [calendarViewMode, setCalendarViewMode] = useState<'mes' | 'dia'>('mes');
  const [showNewTurno, setShowNewTurno] = useState(false);
  const [editTurno, setEditTurno] = useState<TurnoData | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState<string | null>(null);
  const [turnos, setTurnos] = useState<TurnoData[]>(initialTurnos);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);

  // Waitlist reassignment after cancel
  const [showWaitlistReassign, setShowWaitlistReassign] = useState<{
    turnoId: string;
    medicoId: string;
    pacienteNombre: string;
  } | null>(null);
  const [waitlistCandidates, setWaitlistCandidates] = useState<any[]>([]);
  const [waitlistReassignLoading, setWaitlistReassignLoading] = useState(false);

  // Waitlist proposal when time conflict
  const [waitlistProposal, setWaitlistProposal] = useState<{
    pacienteId: string;
    medicoId: string;
    pacienteNombre: string;
    medicoNombre: string;
    fecha: string;
    hora: string;
    reason: string;
  } | null>(null);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  // Confirm new patient creation
  const [nuevoPacienteConfirm, setNuevoPacienteConfirm] = useState<{
    nombre: string;
    apellido: string;
    sucursalId?: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Filters
  const [filtroMedico, setFiltroMedico] = useState('__all__');
  const [filtroEstado, setFiltroEstado] = useState('__all__');
  const [filtroTipo, setFiltroTipo] = useState('__all__');
  const [searchText, setSearchText] = useState('');
  const [savingStates, setSavingStates] = useState<Set<string>>(new Set());

  // Day-view state
  const [dayViewData, setDayViewData] = useState<{
    medicos: MedicoDia[];
    turnos: TurnoDia[];
    fecha: string;
  } | null>(null);
  const [dayViewLoading, setDayViewLoading] = useState(false);

  // Unique values for filters
  const medicos = useMemo(
    () => Array.from(new Set([...initialMedicos, ...turnos.map((t) => t.medico)])),
    [turnos, initialMedicos],
  );
  const tipos = useMemo(
    () => Array.from(new Set([...initialTipos, ...turnos.map((t) => t.tipo)])),
    [turnos, initialTipos],
  );

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
          const input = document.querySelector<HTMLInputElement>(
            '[placeholder="Nombre del paciente..."]',
          );
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

  // ─── Fetch turnos for a date ───────────────────────

  const fetchTurnos = useCallback(
    async (fecha: Date, searchTerm?: string) => {
      setLoading(true);
      try {
        const fechaStr = fecha.toISOString().split('T')[0];
        const params = new URLSearchParams();
        if (searchTerm) {
          params.set('search', searchTerm);
        } else {
          params.set('fecha', fechaStr);
        }
        params.set('limit', '200');
        if (sucursalId) params.set('sucursalId', sucursalId);

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
    },
    [sucursalId],
  );

  // ─── Fetch turnos for a full month ───────────────────

  const fetchTurnosMes = useCallback(
    async (fecha: Date) => {
      setLoading(true);
      try {
        const year = fecha.getFullYear();
        const month = fecha.getMonth();
        const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
        const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
        const params = new URLSearchParams();
        params.set('fecha_desde', firstDay);
        params.set('fecha_hasta', lastDay);
        params.set('limit', '500');
        if (sucursalId) params.set('sucursalId', sucursalId);

        const res = await fetch(`/api/turnos?${params.toString()}`);
        if (!res.ok) throw new Error('Error al cargar turnos del mes');
        const json = await res.json();
        setTurnos(json.data || []);
      } catch {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los turnos del mes',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [sucursalId],
  );

  // ─── Fetch on calendar view change ─────────────────────
  useEffect(() => {
    if (view === 'calendario') {
      if (calendarViewMode === 'mes') {
        fetchTurnosMes(selectedDate);
      } else {
        fetchTurnos(selectedDate);
      }
    }
  }, [view, calendarViewMode, selectedDate, fetchTurnos, fetchTurnosMes]);

  // ─── Fetch day-view data ─────────────────────────────────
  const fetchDayView = useCallback(
    async (fecha: Date) => {
      setDayViewLoading(true);
      try {
        const fechaStr = fecha.toISOString().split('T')[0];
        const params = new URLSearchParams({ fecha: fechaStr });
        if (sucursalId) params.set('sucursalId', sucursalId);
        const res = await fetch(`/api/turnos/day-view?${params.toString()}`);
        if (!res.ok) throw new Error('Error al cargar vista del día');
        const json = await res.json();
        setDayViewData(json);
      } catch {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos del día',
          variant: 'destructive',
        });
      } finally {
        setDayViewLoading(false);
      }
    },
    [sucursalId],
  );

  useEffect(() => {
    if (view === 'dia') {
      fetchDayView(selectedDate);
    }
  }, [view, selectedDate, fetchDayView]);

  // ─── Debounced search (lista view only) ────────────────────
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (view !== 'lista') return;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (searchText.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchTurnos(selectedDate, searchText.trim());
      }, 400);
    } else {
      fetchTurnos(selectedDate);
    }
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchText, selectedDate, fetchTurnos, view]);

  // ─── Date navigation ───────────────────────────────

  const navigateDate = useCallback(
    (delta: number) => {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() + delta);
      setSelectedDate(newDate);
      if (searchText) setSearchText('');
      else if (view === 'lista') fetchTurnos(newDate);
    },
    [selectedDate, fetchTurnos, searchText, view],
  );

  const goToToday = useCallback(() => {
    const today = new Date();
    setSelectedDate(today);
    if (searchText) setSearchText('');
    else if (view === 'lista') fetchTurnos(today);
  }, [fetchTurnos, searchText, view]);

  // ─── Filtered turnos ──────────────────────────────────

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

  // ─── CRUD with API ─────────────────────────────────

  const handleNuevoTurno = async (data: {
    pacienteId?: string;
    paciente: string;
    tipo: string;
    tipoConsulta: string;
    medicoId: string;
    medico: string;
    hora: string;
    fecha: string;
  }) => {
    try {
      let pacienteId = data.pacienteId;
      let pacienteNombre = data.paciente;
      if (!pacienteId) {
        const busquedaPaciente = await fetch(
          `/api/pacientes?search=${encodeURIComponent(data.paciente)}&limit=5`,
        );
        let pacientesJson;
        try {
          pacientesJson = await busquedaPaciente.json();
        } catch {
          pacientesJson = { data: [] };
        }
        const pacienteEncontrado = pacientesJson.data?.[0];
        if (pacienteEncontrado) {
          pacienteId = pacienteEncontrado.id;
          pacienteNombre = `${pacienteEncontrado.nombre} ${pacienteEncontrado.apellido}`;
        } else {
          const nombreParts = data.paciente.trim().split(/\s+/);
          const nombre = nombreParts[0] || data.paciente.trim();
          const apellido = nombreParts.slice(1).join(' ') || 'Sin apellido';

          await new Promise<void>((resolve) => {
            setNuevoPacienteConfirm({
              nombre,
              apellido,
              sucursalId: sucursalId || undefined,
              onConfirm: async () => {
                const createRes = await fetch('/api/pacientes', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    nombre,
                    apellido,
                    telefono: '0000000000',
                    sucursalId: sucursalId || undefined,
                  }),
                });
                if (!createRes.ok) {
                  const errBody = await createRes
                    .json()
                    .catch(() => ({ error: 'Error al crear paciente' }));
                  toast({
                    title: 'Error',
                    description: errBody.error || 'No se pudo crear el paciente',
                    variant: 'destructive',
                  });
                  resolve();
                  return;
                }
                const createdPaciente = await createRes.json();
                pacienteId = createdPaciente.data?.id || createdPaciente.id;
                pacienteNombre = `${nombre} ${apellido}`;
                toast({
                  title: 'Paciente creado',
                  description: `${pacienteNombre} — recordá completar sus datos después`,
                });
                resolve();
              },
            });
          });
          if (!pacienteId) return;
        }
      }

      let medicoId = data.medicoId;
      if (!medicoId) {
        const medicosRes = await fetch('/api/medicos');
        const medicosJson = await medicosRes.json();
        const medicosList: { id: string; nombre: string }[] = medicosJson.data || [];
        const medicoEncontrado = medicosList.find(
          (m) =>
            m.nombre.toLowerCase().includes(data.medico.toLowerCase()) ||
            data.medico.toLowerCase().includes(m.nombre.toLowerCase()),
        );
        if (!medicoEncontrado) {
          toast({
            title: 'Error',
            description: 'Médico no encontrado. Verificá la lista de médicos.',
            variant: 'destructive',
          });
          return;
        }
        medicoId = medicoEncontrado.id;
      }

      const res = await fetch('/api/turnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId,
          medicoId,
          fecha: data.fecha,
          hora: data.hora,
          motivo: data.tipo,
          tipoConsulta: data.tipoConsulta,
          sucursalId: sucursalId || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        if (res.status === 409) {
          setWaitlistProposal({
            pacienteId: pacienteId!,
            medicoId: medicoId!,
            pacienteNombre: pacienteNombre,
            medicoNombre: data.medico,
            fecha: data.fecha,
            hora: data.hora,
            reason: err?.error || err?.message || 'Sin disponibilidad',
          });
          return;
        }
        const msg = err?.error || err?.message || `Error del servidor (${res.status})`;
        console.warn('[Turnos] Error al crear turno:', res.status, msg, err);
        toast({ title: 'Error', description: msg, variant: 'destructive' });
        return;
      }

      const json = await res.json();
      const created = json.data;
      const newTurno: TurnoData = {
        id: created.id,
        hora: data.hora,
        paciente: pacienteNombre,
        tipo: data.tipo,
        medico: data.medico,
        estado: created.estado || 'pendiente',
        fecha: data.fecha || selectedDate.toISOString().split('T')[0],
        medicoId: created.medicoId || medicoId,
        pacienteId: created.pacienteId || pacienteId,
      };
      setTurnos((prev) => [newTurno, ...prev]);
      toast({ title: 'Turno creado', description: `${pacienteNombre} - ${data.hora}` });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error de red al crear turno';
      console.warn('[Turnos] Error de red al crear turno:', msg);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const actualizarEstado = async (id: string, nuevoEstado: TurnoEstado, descripcion: string) => {
    const prevTurno = turnos.find((t) => t.id === id);
    const prevEstado = prevTurno?.estado;

    setSavingStates((prev) => new Set(prev).add(id));
    setTurnos((prev) => prev.map((t) => (t.id === id ? { ...t, estado: nuevoEstado } : t)));
    toast({ title: descripcion });

    try {
      const res = await fetch(`/api/turnos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const serverMsg = body?.prodError || body?.detail || body?.error || 'Error del servidor';
        throw new Error(serverMsg);
      }
    } catch {
      if (prevEstado) {
        setTurnos((prev) => prev.map((t) => (t.id === id ? { ...t, estado: prevEstado } : t)));
      }
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado del turno',
        variant: 'destructive',
      });
    } finally {
      setSavingStates((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleSaveEdit = async (id: string, fecha: string, hora: string) => {
    try {
      await fetch(`/api/turnos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, hora }),
      });
      setTurnos((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, fecha: fecha || t.fecha, hora: hora || t.hora } : t,
        ),
      );
      toast({ title: 'Turno actualizado' });
      setEditTurno(null);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el turno',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmCancel = async (id: string, motivo: string) => {
    const turno = turnos.find((t) => t.id === id);

    setTurnos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, estado: 'cancelada' as const } : t)),
    );
    setShowCancelDialog(null);
    toast({ title: 'Turno cancelado', description: 'El turno fue cancelado correctamente' });
    playDelete();

    try {
      await fetch(`/api/turnos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'cancelada',
          motivoCancelacion: motivo,
          skipWaitlist: true,
        }),
      });

      if (turno?.medicoId) {
        setWaitlistReassignLoading(true);
        try {
          const res = await fetch(`/api/waitlist/candidatos?medicoId=${turno.medicoId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.data && data.data.length > 0) {
              setWaitlistCandidates(data.data);
              setShowWaitlistReassign({
                turnoId: id,
                medicoId: turno.medicoId,
                pacienteNombre: turno.paciente,
              });
            }
          }
        } catch {
          // Continue without reassignment
        } finally {
          setWaitlistReassignLoading(false);
        }
      }
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo persistir la cancelación',
        variant: 'destructive',
      });
    }
  };

  const handleCalendarDateChange = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      if (calendarViewMode === 'mes') {
        fetchTurnosMes(date);
      } else {
        fetchTurnos(date);
      }
    },
    [calendarViewMode, fetchTurnos, fetchTurnosMes],
  );

  const handleDayTurnoClick = useCallback(
    (turno: TurnoDia) => {
      const match = turnos.find((t) => t.id === turno.id);
      if (match) {
        setEditTurno(match);
      } else {
        const medico = dayViewData?.medicos.find((m: MedicoDia) => m.id === turno.medicoId);
        setEditTurno({
          id: turno.id,
          hora: turno.hora,
          paciente: turno.paciente,
          tipo: turno.motivo || 'Consulta',
          medico: medico?.nombre || '',
          medicoId: turno.medicoId,
          pacienteId: turno.pacienteId || '',
          estado: turno.estado,
          fecha: dayViewData?.fecha || '',
        });
      }
    },
    [turnos, dayViewData],
  );

  const handleAddToWaitlist = useCallback(async () => {
    if (!waitlistProposal) return;
    setWaitlistLoading(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: waitlistProposal.pacienteId,
          medicoId: waitlistProposal.medicoId,
          notas: `Sin disponibilidad: ${waitlistProposal.reason} (${waitlistProposal.fecha} ${waitlistProposal.hora})`,
        }),
      });
      if (res.ok) {
        toast({
          title: 'Agregado a lista de espera',
          description: `${waitlistProposal.pacienteNombre} recibirá una oferta cuando haya disponibilidad.`,
        });
      } else {
        const err = await res.json().catch(() => ({ error: 'Error al agregar' }));
        toast({
          title: 'Error',
          description: err.error || 'No se pudo agregar a la lista de espera',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Error de red al procesar solicitud',
        variant: 'destructive',
      });
    } finally {
      setWaitlistLoading(false);
      setWaitlistProposal(null);
    }
  }, [waitlistProposal]);

  const handleConfirmNewPatient = useCallback(async () => {
    if (nuevoPacienteConfirm) {
      await nuevoPacienteConfirm.onConfirm();
    }
    setNuevoPacienteConfirm(null);
  }, [nuevoPacienteConfirm]);

  // ─── Render ────────────────────────────────────────────

  return (
    <PageAnimation>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
        }}
      >
        <TurnosHeader
          view={view}
          onViewChange={setView}
          onNewTurno={() => setShowNewTurno(true)}
        />

        {/* List View */}
        {view === 'lista' && (
          <>
            <TurnosDateNav
              selectedDate={selectedDate}
              onNavigate={navigateDate}
              onGoToToday={goToToday}
            />

            <TurnosFilters
              filtroMedico={filtroMedico}
              filtroEstado={filtroEstado}
              filtroTipo={filtroTipo}
              searchText={searchText}
              medicos={medicos}
              tipos={tipos}
              filtrosActivos={filtrosActivos}
              loading={loading}
              turnos={turnos}
              turnosFiltrados={turnosFiltrados}
              onFiltroMedicoChange={setFiltroMedico}
              onFiltroEstadoChange={setFiltroEstado}
              onFiltroTipoChange={setFiltroTipo}
              onSearchTextChange={setSearchText}
              onLimpiarFiltros={limpiarFiltros}
              onToggleFilters={() => setShowFilters(!showFilters)}
              showFilters={showFilters}
            />

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <TurnosTable
                turnosFiltrados={turnosFiltrados}
                loading={loading}
                filtrosActivos={filtrosActivos}
                savingStates={savingStates}
                onActualizarEstado={actualizarEstado}
                onEditTurno={setEditTurno}
                onCancelTurno={setShowCancelDialog}
                onLimpiarFiltros={limpiarFiltros}
                onNewTurno={() => setShowNewTurno(true)}
              />
            </motion.div>
          </>
        )}

        {/* Calendar View */}
        {view === 'calendario' && (
          <TurnosCalendar
            turnos={turnosFiltrados}
            viewMode={calendarViewMode}
            onViewModeChange={setCalendarViewMode}
            onDateChange={handleCalendarDateChange}
          />
        )}

        {/* Day View */}
        {view === 'dia' && (
          <TurnosDayView
            selectedDate={selectedDate}
            dayViewData={dayViewData}
            dayViewLoading={dayViewLoading}
            onDateNavigate={navigateDate}
            onGoToToday={goToToday}
            onTurnoClick={handleDayTurnoClick}
            onSlotClick={() => setShowNewTurno(true)}
          />
        )}

        {/* State legend */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          {['pendiente', 'confirmada', 'en_atencion', 'atendido', 'cancelada'].map((estado) => (
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
              <Calendar className="h-3 w-3" />
              {turnosFiltrados.length} de {turnos.length} turnos
            </span>
          )}
        </div>

        {/* ─── Modals ─────────────────────── */}

        <NuevoTurnoModal
          open={showNewTurno}
          onOpenChange={setShowNewTurno}
          onSubmit={handleNuevoTurno}
        />

        <TurnoDetailModal
          editTurno={editTurno}
          onOpenChange={(open) => {
            if (!open) setEditTurno(null);
          }}
          onSaveEdit={handleSaveEdit}
        />

        <CancelTurnoDialog
          showCancelDialog={showCancelDialog}
          onOpenChange={(open) => {
            if (!open) setShowCancelDialog(null);
          }}
          onConfirmCancel={handleConfirmCancel}
        />

        <WaitlistReassignDialog
          open={!!showWaitlistReassign}
          pacienteNombre={showWaitlistReassign?.pacienteNombre || ''}
          waitlistCandidates={waitlistCandidates}
          waitlistReassignLoading={waitlistReassignLoading}
          onClose={() => {
            setShowWaitlistReassign(null);
            setWaitlistCandidates([]);
          }}
        />

        <WaitlistProposalDialog
          open={!!waitlistProposal}
          proposal={waitlistProposal}
          waitlistLoading={waitlistLoading}
          onClose={() => setWaitlistProposal(null)}
          onAddToWaitlist={handleAddToWaitlist}
        />

        <NuevoPacienteConfirmDialog
          open={!!nuevoPacienteConfirm}
          nombre={nuevoPacienteConfirm?.nombre || ''}
          apellido={nuevoPacienteConfirm?.apellido || ''}
          onClose={() => setNuevoPacienteConfirm(null)}
          onConfirm={handleConfirmNewPatient}
        />
      </motion.div>
    </PageAnimation>
  );
}
