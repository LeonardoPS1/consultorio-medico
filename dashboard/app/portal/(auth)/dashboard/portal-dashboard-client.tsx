'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar,
  Syringe,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  ClipboardList,
  Star,
  MessageSquareText,
  Send,
  HeartPulse,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { AvatarInitials } from '@/components/portal/avatar-initials';
import { staggerContainer, itemVariants } from '@/components/portal/page-transition';
import { PortalBadge } from '@/components/portal/portal-badge';
import { PortalButton } from '@/components/portal/portal-button';
import { PortalCard } from '@/components/portal/portal-card';
import { PulseLine } from '@/components/portal/pulse-line';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ─── Types ────────────────────────────────────────────────

interface TurnoRow {
  id: string;
  fechaHora: string;
  hora: string;
  estado: string;
  tipoConsulta: string;
  motivo: string | null;
  medicoNombre: string | null;
  duracionMinutos: number;
}

interface RecetaRow {
  id: string;
  medicamento: string;
  dosis: string;
  frecuencia: string;
  duracion: string | null;
  indicaciones: string | null;
  estado: string;
  fechaInicio: string;
  fechaFin: string | null;
  medicoNombre: string | null;
}

interface HistorialRow {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  createdAt: string;
}

interface TurnoSinEncuesta {
  id: string;
  fechaHora: string;
  hora: string;
  medicoNombre: string | null;
}

interface PacienteData {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string | null;
  rut: string | null;
  sistemaSalud: string | null;
  region: string | null;
  comuna: string | null;
  direccion: string | null;
}

// ─── Helpers ──────────────────────────────────────────────

function formatCLDate(dateStr: string, pattern: string = "d 'de' MMMM, HH:mm") {
  const d = new Date(dateStr);
  return format(d, pattern, { locale: es });
}

function formatCLShort(dateStr: string) {
  const d = new Date(dateStr);
  return format(d, 'dd/MM/yyyy', { locale: es });
}

function formatCLPhone(phone: string) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('569') && cleaned.length === 11) {
    const n = cleaned.slice(3);
    return `+56 9 ${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
  }
  if (cleaned.startsWith('9') && cleaned.length === 9) {
    return `+56 9 ${cleaned.slice(1, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

function getTurnoColor(estado: string) {
  const colors: Record<string, string> = {
    pendiente: '#FBBF24',
    confirmada: '#34D399',
    en_consulta: '#93C5FD',
    en_atencion: '#2563EB',
    atendido: '#34D399',
    completada: '#6B7280',
    cancelada: '#F87171',
    no_asistio: '#F87171',
  };
  return colors[estado] || '#6B7280';
}

function getTurnoLabel(estado: string) {
  const labels: Record<string, string> = {
    pendiente: 'Pendiente',
    confirmada: 'Confirmada',
    en_consulta: 'En consulta',
    en_atencion: 'En atención',
    atendido: 'Atendido',
    completada: 'Completada',
    cancelada: 'Cancelada',
    no_asistio: 'No asistió',
  };
  return labels[estado] || estado;
}

function getTurnoBadgeVariant(estado: string): 'primary' | 'success' | 'warning' | 'destructive' | 'muted' | 'accent' | 'teal' {
  switch (estado) {
    case 'pendiente':
      return 'warning';
    case 'confirmada':
    case 'atendido':
      return 'success';
    case 'cancelada':
    case 'no_asistio':
      return 'destructive';
    default:
      return 'muted';
  }
}

function getSistemaSaludLabel(s: string | null) {
  if (!s) return null;
  const labels: Record<string, string> = {
    fonasa: 'FONASA',
    isapre: 'ISAPRE',
    particular: 'Particular',
    particular_convenio: 'Particular con convenio',
  };
  return labels[s] || s;
}

function getEstadoIcon(estado: string) {
  switch (estado) {
    case 'pendiente':
      return Clock;
    case 'confirmada':
      return CheckCircle2;
    case 'atendido':
      return CheckCircle2;
    case 'cancelada':
      return XCircle;
    case 'no_asistio':
      return AlertCircle;
    default:
      return Clock;
  }
}

// ─── Animations (CSS only) ────────────────────────────────

const staggerItem = 'animate-fade-in-up';
const staggerDelay = (i: number) => ({
  animationDelay: `${i * 0.06}s`,
  animationFillMode: 'both' as const,
});

// ─── Componente Encuesta Rápida ──────────────────────────

function QuickSurveyCard({
  turnosSinEncuesta,
  onSurveySubmitted,
}: {
  turnosSinEncuesta: TurnoSinEncuesta[];
  onSurveySubmitted: () => void;
}) {
  const [selectedTurno, setSelectedTurno] = useState<string | null>(null);
  const [puntaje, setPuntaje] = useState<number>(0);
  const [comentario, setComentario] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (turnosSinEncuesta.length === 0 || submitted) return null;

  const turnoActual = turnosSinEncuesta.find((t) => t.id === selectedTurno) || turnosSinEncuesta[0];

  async function handleSubmit() {
    if (puntaje === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/portal/encuestas/responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turnoId: turnoActual.id,
          puntaje,
          comentario: comentario || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
throw new Error(data.error || 'Error al enviar');
      }
      setSubmitted(true);
      onSurveySubmitted();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${staggerItem}`}
        style={staggerDelay(2)}
      >
        <PortalCard padding="md">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-portal-primary-soft">
              <Star className="h-4 w-4 text-portal-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-portal-fg">
                Calificá tu atención
              </h3>
              <p className="text-xs text-portal-muted-fg">
                {turnoActual.medicoNombre
                  ? `Tu visita con ${turnoActual.medicoNombre} del ${formatCLShort(turnoActual.fechaHora)}`
                  : `Tu visita del ${formatCLShort(turnoActual.fechaHora)}`}
              </p>
            </div>
          </div>

{turnosSinEncuesta.length > 1 && (
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {turnosSinEncuesta.slice(0, 3).map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTurno(t.id);
                    setPuntaje(0);
                    setComentario('');
                    setSubmitted(false);
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    (selectedTurno || turnosSinEncuesta[0].id) === t.id
                      ? 'bg-portal-primary-soft border-portal-primary/30 text-portal-primary'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {formatCLShort(t.fechaHora)}
                </button>
              ))}
              {turnosSinEncuesta.length > 3 && (
                <span className="text-[11px] text-portal-muted-fg/50 self-center">
                  +{turnosSinEncuesta.length - 3} más
                </span>
              )}
            </div>
          )}

        {/* Puntaje (estrellas) */}
        <div className="flex items-center gap-1.5 mb-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setPuntaje(n)}
className={`transition-[transform,opacity] duration-150 active:scale-75 ${
                 n <= puntaje ? 'scale-110' : 'opacity-50 hover:opacity-80'
               }`}
              aria-label={`Puntuar ${n} de 5`}
            >
              <Star
                className={`h-7 w-7 ${
                  n <= puntaje
                    ? 'fill-yellow-400 text-yellow-400 drop-shadow-sm'
                    : 'fill-gray-200 dark:fill-gray-700 text-gray-200 dark:text-gray-700'
                } transition-colors duration-150`}
              />
            </button>
          ))}
          {puntaje > 0 && (
            <span className="ml-1 text-sm font-medium text-muted-foreground">
              {puntaje === 1
                ? 'Muy malo'
                : puntaje === 2
                  ? 'Malo'
                  : puntaje === 3
                    ? 'Regular'
                    : puntaje === 4
                      ? 'Bueno'
                      : 'Excelente'}
            </span>
          )}
        </div>

        {/* Comentario (solo si puntaje > 0) */}
        <AnimatePresence>
          {puntaje > 0 && (
            <motion.div
              initial={{ maxHeight: 0, opacity: 0 }}
              animate={{ maxHeight: 200, opacity: 1 }}
              exit={{ maxHeight: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 mb-3 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-[box-shadow,border-color]">
                <MessageSquareText className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                <input
                  type="text"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Contanos cómo fue tu experiencia (opcional)"
                  className="flex-1 text-sm bg-transparent border-none outline-none text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  maxLength={500}
                />
              </div>

              {error && <p className="text-xs text-red-500 dark:text-red-400 mb-2">{error}</p>}

              <PortalButton
                onClick={handleSubmit}
                disabled={submitting}
                fullWidth
                loading={submitting}
              >
                <Send className="h-4 w-4" />
                Enviar calificación
              </PortalButton>
            </motion.div>
          )}
        </AnimatePresence>
      </PortalCard>
    </motion.div>
  );
}

// ─── Helpers Module Level ────────────────────────────────────

function getTipoConsultaColor(tipo: string) {
  const colors: Record<string, string> = {
    consulta: '#93C5FD',
    control: '#A78BFA',
    urgencia: '#FBBF24',
  };
  return colors[tipo] || '#93C5FD';
}

// ─── ProximasCitasTimeline Component ──────────────────────────

interface ProximasCitasTimelineProps {
  turnosProximos: TurnoRow[];
}

function ProximasCitasTimeline({ turnosProximos }: ProximasCitasTimelineProps) {
  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const today = new Date();
  const todayDayIndex = today.getDay();

  const turnosByDay: Record<number, TurnoRow[]> = {};
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayIndex = date.getDay();
    turnosByDay[dayIndex] = turnosProximos.filter((t) => {
      const turnoDate = new Date(t.fechaHora);
      return turnoDate.getDay() === dayIndex &&
        turnoDate.toDateString() === date.toDateString();
    });
  }

  const primerTurno = turnosProximos[0];

  return (
    <PortalCard padding="md" className="lg:col-span-2">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <AvatarInitials
            nombre={primerTurno?.medicoNombre?.replace('Dr/a. ', '').split(' ')[0] || 'Dr'}
            apellido={primerTurno?.medicoNombre?.replace('Dr/a. ', '').split(' ').slice(1).join(' ') || 'Médico'}
            className="h-10 w-10 text-sm"
          />
          <div>
            <p className="font-semibold text-sm text-portal-fg">
              Próximas citas
            </p>
            <p className="text-xs text-portal-muted-fg">
              {primerTurno
                ? `Próximo: ${formatCLDate(primerTurno.fechaHora, "EEEE d 'de' MMMM")} a las ${primerTurno.hora}`
                : 'Sin turnos agendados'}
            </p>
          </div>
        </div>
        {turnosProximos.length === 0 && (
          <a
            href="/portal/agendar"
            className="inline-flex items-center justify-center rounded-full font-semibold text-xs transition-all duration-200 cursor-pointer px-4 py-1.5 h-9 bg-white text-portal-fg border border-portal-border hover:bg-portal-muted"
          >
            + Agendar
          </a>
        )}
      </div>

      {/* PulseLine top accent */}
      <PulseLine className="mb-4 text-portal-primary" />

      {/* 7-day horizontal timeline */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max">
          {daysOfWeek.map((day, idx) => {
            const dayTurnos = turnosByDay[idx] || [];
            const isToday = idx === todayDayIndex;
            const date = new Date(today);
            date.setDate(today.getDate() + (idx - todayDayIndex));
            const dayNumber = date.getDate();

            return (
              <div
                key={day}
                className={`flex flex-col items-center gap-2 min-w-[80px] ${isToday ? 'relative' : ''}`}
              >
                <div
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                    isToday
                      ? 'bg-portal-primary-soft text-portal-primary font-semibold'
                      : 'bg-portal-muted text-portal-muted-fg'
                  }`}
                >
                  <span className="text-xs font-medium">{day}</span>
                  <span className="text-sm font-semibold">{dayNumber}</span>
                </div>

                {/* Vertical dotted line for today */}
                {isToday && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-px h-16 bg-dashed bg-portal-primary/40" style={{ backgroundImage: 'linear-gradient(to bottom, hsl(var(--portal-primary)) 0%, transparent 100%)' }} />
                )}

                {/* Time chips for appointments on this day */}
                <div className="flex flex-col gap-1 w-full">
                  {dayTurnos.length === 0 ? (
                    <div className="text-center text-[10px] text-portal-muted-fg/50 py-2">—</div>
                  ) : (
                    dayTurnos.map((t) => (
                      <button
                        key={t.id}
                        className="text-[10px] px-2 py-1 rounded-full text-white font-medium transition-transform hover:scale-105"
                        style={{ backgroundColor: getTipoConsultaColor(t.tipoConsulta) }}
                      >
                        {t.hora}
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PortalCard>
  );
}

// ─── Componente Principal ─────────────────────────────────

/**
 *
 * @param root0
 * @param root0.paciente
 * @param root0.turnos
 * @param root0.recetas
 * @param root0.historial
 * @param root0.turnosSinEncuesta
 */
export default function PortalDashboardClient({
  paciente,
  turnos,
  recetas,
  historial,
  turnosSinEncuesta,
}: {
  paciente: PacienteData;
  turnos: TurnoRow[];
  recetas: RecetaRow[];
  historial: HistorialRow[];
  turnosSinEncuesta: TurnoSinEncuesta[];
}) {
  const [surveyKey, setSurveyKey] = useState(0);

  const ahora = new Date();
  const turnosProximos = turnos.filter(
    (t) => new Date(t.fechaHora) >= ahora && t.estado !== 'cancelada' && t.estado !== 'no_asistio',
  );
  const turnosPasados = turnos.filter(
    (t) => new Date(t.fechaHora) < ahora || t.estado === 'cancelada' || t.estado === 'no_asistio',
  );

  const recetasActivas = recetas.filter((r) => r.estado === 'activa');

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <AvatarInitials
            nombre={paciente.nombre}
            apellido={paciente.apellido}
            className="h-12 w-12 text-base"
          />
          <div>
            <h1 className="text-[20px] font-semibold tracking-[0.01em] text-portal-fg">
              Hola, {paciente.nombre}
            </h1>
            <p className="text-xs text-portal-muted-fg">
              <Phone className="inline h-3 w-3 mr-1 align-middle" />
              {formatCLPhone(paciente.telefono)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Quick Survey */}
      <QuickSurveyCard
        key={surveyKey}
        turnosSinEncuesta={turnosSinEncuesta}
        onSurveySubmitted={() => setSurveyKey((k) => k + 1)}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          {
            label: 'Turnos',
            valor: turnos.length,
            icon: Calendar,
          },
          {
            label: 'Próximos',
            valor: turnosProximos.length,
            icon: Clock,
          },
          {
            label: 'Recetas',
            valor: recetas.length,
            icon: HeartPulse,
          },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="group transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
            style={{
              animationName: 'portalFadeIn',
              animationDuration: '0.3s',
              animationDelay: `${i * 0.08}s`,
              animationFillMode: 'both',
            }}
          >
            <PortalCard
              padding="sm"
              style={{
                background: 'hsl(var(--portal-primary) / 0.06)',
              }}
            >
              <div className="text-center">
                <stat.icon
                  className="h-5 w-5 mx-auto mb-1"
                  style={{ color: 'hsl(var(--portal-primary))' }}
                />
                <p
                  className="text-lg font-bold"
                  style={{ color: 'hsl(var(--portal-primary))' }}
                >
                  {stat.valor}
                </p>
                <p
                  className="text-[11px] font-medium"
                  style={{ color: 'hsl(var(--portal-primary) / 0.65)' }}
                >
                  {stat.label}
                </p>
              </div>
            </PortalCard>
          </div>
        ))}
      </div>

      {/* Timeline de próximas citas + Mini-cards grid */}
      <div className={`${staggerItem} grid grid-cols-1 lg:grid-cols-3 gap-4`} style={staggerDelay(3)}>
        <ProximasCitasTimeline turnosProximos={turnosProximos} />

        {/* Mini cards grid - lg:col-span-1 with 2x2 layout */}
        <div className="lg:col-span-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* (1) Próximo turno */}
          <PortalCard padding="md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-portal-primary-soft">
                <Calendar className="h-5 w-5 text-portal-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-portal-muted-fg">Próximo turno</p>
                {turnosProximos.length > 0 ? (
                  <>
                    <p className="font-semibold text-sm text-portal-fg truncate">
                      {formatCLDate(turnosProximos[0].fechaHora, "EEEE d 'de' MMMM")}
                    </p>
                    <p className="text-xs text-portal-muted-fg">{turnosProximos[0].hora} · {turnosProximos[0].duracionMinutos} min</p>
                  </>
                ) : (
                  <p className="font-semibold text-sm text-portal-fg">Sin turnos</p>
                )}
              </div>
            </div>
            <a
              href="/portal/turnos"
              className="mt-3 w-full inline-flex items-center justify-center rounded-full font-semibold text-xs transition-all duration-200 cursor-pointer px-4 py-1.5 h-9 bg-transparent text-portal-muted-fg hover:text-portal-fg hover:bg-portal-muted/60"
            >
              Ver todos
            </a>
          </PortalCard>

          {/* (2) Recetas activas */}
          <PortalCard padding="md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-green-100 dark:bg-green-900/30">
                <HeartPulse className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-portal-muted-fg">Recetas activas</p>
                <p className="font-semibold text-2xl text-portal-fg">{recetasActivas.length}</p>
              </div>
            </div>
            <a
              href="/portal/recetas"
              className="mt-3 w-full inline-flex items-center justify-center rounded-full font-semibold text-xs transition-all duration-200 cursor-pointer px-4 py-1.5 h-9 bg-transparent text-portal-muted-fg hover:text-portal-fg hover:bg-portal-muted/60"
            >
              Gestionar
            </a>
          </PortalCard>

          {/* (3) Encuestas pendientes */}
          <PortalCard padding="md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-amber-100 dark:bg-amber-900/30">
                <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-portal-muted-fg">Encuestas pendientes</p>
                <p className="font-semibold text-2xl text-portal-fg">{turnosSinEncuesta.length}</p>
              </div>
            </div>
            <a
              href="/portal/encuestas"
              className="mt-3 w-full inline-flex items-center justify-center rounded-full font-semibold text-xs transition-all duration-200 cursor-pointer px-4 py-1.5 h-9 bg-transparent text-portal-muted-fg hover:text-portal-fg hover:bg-portal-muted/60"
            >
              Responder
            </a>
          </PortalCard>

          {/* (4) Mis datos */}
          <PortalCard padding="md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-portal-primary-soft">
                <AvatarInitials
                  nombre={paciente.nombre}
                  apellido={paciente.apellido}
                  className="h-10 w-10 text-sm"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-portal-muted-fg">Mis datos</p>
                <p className="font-semibold text-sm text-portal-fg truncate">{paciente.rut || 'Sin RUT'}</p>
                {paciente.sistemaSalud && (
                  <PortalBadge
                    variant={paciente.sistemaSalud === 'fonasa' ? 'primary' : paciente.sistemaSalud === 'isapre' ? 'accent' : 'success'}
                    className="mt-1 text-[10px]"
                  >
                    {getSistemaSaludLabel(paciente.sistemaSalud)}
                  </PortalBadge>
                )}
              </div>
            </div>
            <a
              href="/portal/perfil"
              className="mt-3 w-full inline-flex items-center justify-center rounded-full font-semibold text-xs transition-all duration-200 cursor-pointer px-4 py-1.5 h-9 bg-transparent text-portal-muted-fg hover:text-portal-fg hover:bg-portal-muted/60"
            >
              Ver perfil
            </a>
          </PortalCard>
        </div>
      </div>

      {/* Tabs principales */}
      <div className={`${staggerItem}`} style={staggerDelay(4)}>
        <Tabs defaultValue="proximos">
          <TabsList className="w-full bg-portal-muted rounded-xl p-1">
            <TabsTrigger
              value="proximos"
              className="flex-1 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-portal-bg-alt data-[state=active]:text-portal-primary data-[state=active]:shadow-sm data-[state=active]:rounded-lg"
            >
              <Calendar className="h-4 w-4 mr-1" />
              Próximos ({turnosProximos.length})
            </TabsTrigger>
            <TabsTrigger
              value="historial"
              className="flex-1 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-portal-bg-alt data-[state=active]:text-portal-primary data-[state=active]:shadow-sm data-[state=active]:rounded-lg"
            >
              <Activity className="h-4 w-4 mr-1" />
              Historial ({turnosPasados.length})
            </TabsTrigger>
            <TabsTrigger
              value="recetas"
              className="flex-1 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-portal-bg-alt data-[state=active]:text-portal-primary data-[state=active]:shadow-sm data-[state=active]:rounded-lg"
            >
              <Syringe className="h-4 w-4 mr-1" />
              Recetas ({recetas.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Próximos turnos ── */}
          <TabsContent value="proximos" className="mt-4">
            {turnosProximos.length === 0 ? (
              <PortalCard padding="md" className="text-center">
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="h-12 w-12 rounded-full bg-portal-muted flex items-center justify-center mb-3">
                    <Calendar className="h-6 w-6 text-portal-muted-fg/60" />
                  </div>
                  <p className="text-portal-muted-fg font-medium">
                    No tienes turnos próximos
                  </p>
                  <p className="text-xs text-portal-muted-fg/60 mt-1">
                    Los turnos aparecerán aquí cuando los agendes
                  </p>
                </div>
              </PortalCard>
            ) : (
              <motion.div
                className="space-y-3"
                variants={staggerContainer}
                initial="hidden"
                animate="animate"
              >
                {turnosProximos.map((t) => (
                  <motion.div key={t.id} variants={itemVariants}>
                    <PortalCard
                      padding="md"
                      className="border-l-4"
                      style={{ borderLeftColor: getTurnoColor(t.estado) }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-portal-fg">
                            {formatCLDate(t.fechaHora, "EEEE d 'de' MMMM")}
                          </p>
                          <p className="text-sm text-portal-muted-fg">
                            {t.hora} · {t.duracionMinutos} min
                          </p>
                        </div>
                        <PortalBadge variant={getTurnoBadgeVariant(t.estado)}>
                          {getTurnoLabel(t.estado)}
                        </PortalBadge>
                      </div>
                      {t.motivo && (
                        <p className="text-sm text-portal-muted-fg mb-1">
                          {t.motivo}
                        </p>
                      )}
                      {t.medicoNombre && (
                        <p className="text-xs text-portal-muted-fg/70 flex items-center gap-1">
                          <User className="h-3 w-3" /> Dr/a. {t.medicoNombre}
                        </p>
                      )}
                    </PortalCard>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>

          {/* ── Historial ── */}
          <TabsContent value="historial" className="mt-4">
            {turnosPasados.length === 0 && historial.length === 0 ? (
              <PortalCard padding="md" className="text-center">
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="h-12 w-12 rounded-full bg-portal-muted flex items-center justify-center mb-3">
                    <ClipboardList className="h-6 w-6 text-portal-muted-fg/60" />
                  </div>
                  <p className="text-portal-muted-fg font-medium">Sin historial aún</p>
                  <p className="text-xs text-portal-muted-fg/60 mt-1">
                    Tus visitas anteriores aparecerán aquí
                  </p>
                </div>
              </PortalCard>
            ) : (
              <div className="space-y-3">
                {/* Turnos pasados */}
                {turnosPasados.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-portal-muted-fg uppercase tracking-wider mb-2">
                      Visitas
                    </h3>
                    <motion.div variants={staggerContainer} initial="hidden" animate="animate">
                      {turnosPasados.map((t) => {
                        const Icon = getEstadoIcon(t.estado);
                        return (
                          <motion.div key={t.id} variants={itemVariants} className="mb-2">
                            <PortalCard
                              padding="sm"
                              className="opacity-80 border-l-4"
                              style={{ transition: 'opacity 200ms', borderLeftColor: getTurnoColor(t.estado) }}
                              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                            >
                              <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5 text-portal-muted-fg/50 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-portal-fg">
                                    {formatCLDate(t.fechaHora, "d 'de' MMMM")} · {t.hora}
                                  </p>
                                  <p className="text-xs text-portal-muted-fg/70 truncate">
                                    {t.motivo || t.tipoConsulta}
                                  </p>
                                </div>
                                <PortalBadge variant={getTurnoBadgeVariant(t.estado)} className="text-[10px]">
                                  {getTurnoLabel(t.estado)}
                                </PortalBadge>
                              </div>
                            </PortalCard>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  </div>
                )}

                {/* Historial médico */}
                {historial.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-portal-muted-fg uppercase tracking-wider mb-2">
                      Registros médicos
                    </h3>
                    <motion.div variants={staggerContainer} initial="hidden" animate="animate">
                      {historial.map((h) => (
                        <motion.div key={h.id} variants={itemVariants} className="mb-2">
                          <PortalCard padding="sm">
                            <div className="flex items-start justify-between">
                              <p className="font-medium text-sm text-portal-fg">
                                {h.titulo}
                              </p>
                              <span className="text-[10px] text-portal-muted-fg/60">
                                {formatCLShort(h.createdAt)}
                              </span>
                            </div>
                            {h.descripcion && (
                              <p className="text-xs text-portal-muted-fg mt-1">
                                {h.descripcion}
                              </p>
                            )}
                            <PortalBadge variant="muted" className="mt-1 text-[10px]">
                              {h.tipo}
                            </PortalBadge>
                          </PortalCard>
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Recetas ── */}
          <TabsContent value="recetas" className="mt-4">
            {recetas.length === 0 ? (
              <PortalCard padding="md" className="text-center">
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="h-12 w-12 rounded-full bg-portal-muted flex items-center justify-center mb-3">
                    <Syringe className="h-6 w-6 text-portal-muted-fg/60" />
                  </div>
                  <p className="text-portal-muted-fg font-medium">
                    Sin recetas activas
                  </p>
                  <p className="text-xs text-portal-muted-fg/60 mt-1">
                    Las recetas aparecerán aquí cuando el médico las recete
                  </p>
                </div>
              </PortalCard>
            ) : (
              <motion.div
                className="space-y-3"
                variants={staggerContainer}
                initial="hidden"
                animate="animate"
              >
                {recetas.map((r) => (
                  <motion.div key={r.id} variants={itemVariants}>
                    <PortalCard padding="md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Syringe className="h-4 w-4 text-portal-primary" />
                          <p className="font-semibold text-portal-fg">
                            {r.medicamento}
                          </p>
                        </div>
                        <PortalBadge variant={r.estado === 'activa' ? 'success' : 'destructive'}>
                          {r.estado === 'activa' ? 'Activa' : 'Vencida'}
                        </PortalBadge>
                      </div>
                      <p className="text-sm text-portal-muted-fg">
                        {r.dosis} · {r.frecuencia}
                      </p>
                      {r.duracion && (
                        <p className="text-xs text-portal-muted-fg/70 mt-1">
                          Duración: {r.duracion}
                        </p>
                      )}
                      {r.indicaciones && (
                        <p className="text-xs text-portal-muted-fg mt-1 italic bg-portal-muted/50 p-2 rounded-lg">
                          {r.indicaciones}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-portal-muted-fg/60">
                        {r.fechaInicio && <span>Desde: {formatCLShort(r.fechaInicio)}</span>}
                        {r.fechaFin && <span>Hasta: {formatCLShort(r.fechaFin)}</span>}
                        {r.medicoNombre && <span>Dr/a. {r.medicoNombre}</span>}
                      </div>
                    </PortalCard>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <p className="text-center text-[10px] text-portal-muted-fg/50 pb-4">
        Portal del Paciente — {paciente.nombre} {paciente.apellido}
      </p>
    </div>
  );
}
