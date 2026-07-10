'use client';

import { useState } from 'react';
import { PortalCard } from '@/components/portal/portal-card';
import { PortalBadge } from '@/components/portal/portal-badge';
import { PortalButton } from '@/components/portal/portal-button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  MapPin,
  Shield,
  Star,
  MessageSquareText,
  Send,
  ChevronRight,
  HeartPulse,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { staggerContainer, itemVariants } from '@/components/portal/page-transition';

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
    pendiente: '#F59E0B',
    confirmada: '#10B981',
    en_consulta: '#3B82F6',
    en_atencion: '#2563EB',
    atendido: '#059669',
    completada: '#6B7280',
    cancelada: '#EF4444',
    no_asistio: '#EC4899',
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

function getSistemaSaludBadge(s: string | null) {
  if (!s) return null;
  const colors: Record<string, string> = {
    fonasa:
      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    isapre:
      'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
    particular:
      'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
    particular_convenio:
      'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  };
  return colors[s] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
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
        const data = await res.json();
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
          <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-portal-primary/10">
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
className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                   (selectedTurno || turnosSinEncuesta[0].id) === t.id
                    ? 'bg-primary/10 dark:bg-primary/20 border-primary/30 text-primary'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                }`}
              >
                {formatCLShort(t.fechaHora)}
              </button>
            ))}
            {turnosSinEncuesta.length > 3 && (
              <span className="text-[11px] text-gray-400 self-center">
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

// ─── Componente Principal ─────────────────────────────────

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
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center shadow-sm"
            style={{
              background:
                'linear-gradient(135deg, hsl(var(--portal-primary)), hsl(var(--portal-accent)))',
              boxShadow:
                '0 2px 8px hsl(var(--portal-primary) / 0.2)',
            }}
          >
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-portal-fg">
              Hola, {paciente.nombre}
            </h1>
            <p className="text-xs text-portal-muted-fg">
              <Phone className="inline h-3 w-3 mr-1 align-middle" />
              {formatCLPhone(paciente.telefono)}
            </p>
          </div>
        </div>

        <ChevronRight
          className="h-5 w-5"
          style={{ color: 'hsl(var(--portal-muted-foreground) / 0.2)' }}
        />
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
            hue: 'var(--portal-primary)',
            bg: 'hsl(var(--portal-primary) / 0.06)',
          },
          {
            label: 'Próximos',
            valor: turnosProximos.length,
            icon: Clock,
            hue: 'var(--portal-accent)',
            bg: 'hsl(var(--portal-accent) / 0.06)',
          },
          {
            label: 'Recetas',
            valor: recetas.length,
            icon: HeartPulse,
            hue: '168 60% 35%',
            bg: 'hsl(168 60% 35% / 0.06)',
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
                background: stat.bg,
              }}
            >
              <div className="text-center">
                <stat.icon
                  className="h-5 w-5 mx-auto mb-1"
                  style={{ color: `hsl(${stat.hue})` }}
                />
                <p
                  className="text-lg font-bold"
                  style={{ color: `hsl(${stat.hue})` }}
                >
                  {stat.valor}
                </p>
                <p
                  className="text-[10px] font-medium"
                  style={{ color: `hsl(${stat.hue} / 0.65)` }}
                >
                  {stat.label}
                </p>
              </div>
            </PortalCard>
          </div>
        ))}
      </div>

      {/* Datos del paciente */}
      <div className={`${staggerItem}`} style={staggerDelay(3)}>
        <PortalCard padding="md">
          <h2 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wider">
            Mis datos
          </h2>
          <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground/70">Nombre completo</p>
              <p className="font-medium text-foreground">
                {paciente.nombre} {paciente.apellido}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground/70">Teléfono</p>
              <p className="font-medium text-foreground">
                {formatCLPhone(paciente.telefono)}
              </p>
            </div>
            {paciente.rut && (
              <div>
                <p className="text-xs text-muted-foreground/70">RUT</p>
                <p className="font-medium text-foreground">{paciente.rut}</p>
              </div>
            )}
            {paciente.email && (
              <div>
                <p className="text-xs text-muted-foreground/70">Email</p>
                <p className="font-medium text-foreground truncate">
                  {paciente.email}
                </p>
              </div>
            )}
            {paciente.sistemaSalud && (
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Sistema de salud</p>
                <Badge
                  variant="outline"
                  className={`mt-0.5 ${getSistemaSaludBadge(paciente.sistemaSalud)}`}
                >
                  <Shield className="h-3 w-3 mr-1" />
                  {getSistemaSaludLabel(paciente.sistemaSalud)}
                </Badge>
              </div>
            )}
            {(paciente.comuna || paciente.region) && (
              <div>
                <p className="text-xs text-muted-foreground/70">Ubicación</p>
                <p className="font-medium text-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted-foreground/50" />
                  {[paciente.comuna, paciente.region].filter(Boolean).join(', ')}
                </p>
              </div>
            )}
          </div>
        </PortalCard>
      </div>

      {/* Tabs principales */}
      <div className={`${staggerItem}`} style={staggerDelay(4)}>
        <Tabs defaultValue="proximos">
          <TabsList className="w-full bg-muted/60 dark:bg-muted/30 rounded-xl p-1">
            <TabsTrigger
              value="proximos"
              className="flex-1 text-xs sm:text-sm data-[state=active]:shadow-sm"
            >
              <Calendar className="h-4 w-4 mr-1" />
              Próximos ({turnosProximos.length})
            </TabsTrigger>
            <TabsTrigger
              value="historial"
              className="flex-1 text-xs sm:text-sm data-[state=active]:shadow-sm"
            >
              <Activity className="h-4 w-4 mr-1" />
              Historial ({turnosPasados.length})
            </TabsTrigger>
            <TabsTrigger
              value="recetas"
              className="flex-1 text-xs sm:text-sm data-[state=active]:shadow-sm"
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
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Calendar className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-muted-foreground font-medium">
                    No tienes turnos próximos
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
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
                      style={{ borderLeft: `4px solid ${getTurnoColor(t.estado)}` }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-foreground">
                            {formatCLDate(t.fechaHora, "EEEE d 'de' MMMM")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t.hora} · {t.duracionMinutos} min
                          </p>
                        </div>
                        <PortalBadge
                          style={{
                            backgroundColor: `${getTurnoColor(t.estado)}18`,
                            color: getTurnoColor(t.estado),
                          }}
                        >
                          {getTurnoLabel(t.estado)}
                        </PortalBadge>
                      </div>
                      {t.motivo && (
                        <p className="text-sm text-muted-foreground mb-1">
                          {t.motivo}
                        </p>
                      )}
                      {t.medicoNombre && (
                        <p className="text-xs text-muted-foreground/70 flex items-center gap-1">
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
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <ClipboardList className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-muted-foreground font-medium">Sin historial aún</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Tus visitas anteriores aparecerán aquí
                  </p>
                </div>
              </PortalCard>
            ) : (
              <div className="space-y-3">
                {/* Turnos pasados */}
                {turnosPasados.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                      Visitas
                    </h3>
                    <motion.div variants={staggerContainer} initial="hidden" animate="animate">
                      {turnosPasados.map((t) => {
                        const Icon = getEstadoIcon(t.estado);
                        return (
                          <motion.div key={t.id} variants={itemVariants} className="mb-2">
                            <PortalCard
                              padding="sm"
                              className="opacity-80"
                              style={{ transition: 'opacity 200ms' }}
                              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                            >
                              <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground">
                                    {formatCLDate(t.fechaHora, "d 'de' MMMM")} · {t.hora}
                                  </p>
                                  <p className="text-xs text-muted-foreground/70 truncate">
                                    {t.motivo || t.tipoConsulta}
                                  </p>
                                </div>
                                <PortalBadge className="text-[10px]">
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
                    <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                      Registros médicos
                    </h3>
                    <motion.div variants={staggerContainer} initial="hidden" animate="animate">
                      {historial.map((h) => (
                        <motion.div key={h.id} variants={itemVariants} className="mb-2">
                          <PortalCard padding="sm">
                            <div className="flex items-start justify-between">
                              <p className="font-medium text-sm text-foreground">
                                {h.titulo}
                              </p>
                              <span className="text-[10px] text-muted-foreground/60">
                                {formatCLShort(h.createdAt)}
                              </span>
                            </div>
                            {h.descripcion && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {h.descripcion}
                              </p>
                            )}
                            <PortalBadge className="mt-1 text-[10px]">
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
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Syringe className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-muted-foreground font-medium">
                    Sin recetas activas
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
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
                          <Syringe className="h-4 w-4 text-primary" />
                          <p className="font-semibold text-foreground">
                            {r.medicamento}
                          </p>
                        </div>
                        <PortalBadge variant={r.estado === 'activa' ? 'success' : 'destructive'}>
                          {r.estado === 'activa' ? 'Activa' : 'Vencida'}
                        </PortalBadge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {r.dosis} · {r.frecuencia}
                      </p>
                      {r.duracion && (
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Duración: {r.duracion}
                        </p>
                      )}
                      {r.indicaciones && (
                        <p className="text-xs text-muted-foreground mt-1 italic bg-muted/50 p-2 rounded-lg">
                          {r.indicaciones}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground/60">
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
      <p className="text-center text-[10px] text-muted-foreground/50 pb-4">
        Portal del Paciente — {paciente.nombre} {paciente.apellido}
      </p>
    </div>
  );
}
