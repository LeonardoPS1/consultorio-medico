'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
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

function getEstadoRecetaColor(estado: string) {
  switch (estado) {
    case 'activa':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
    case 'vencida':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
    default:
      return 'bg-muted text-muted-foreground';
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
      <Card className="shadow-sm border-blue-100 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-gray-900">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <Star className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                Calificá tu atención
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
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
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                    (selectedTurno || turnosSinEncuesta[0].id) === t.id
                      ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
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
                className={`transition-all duration-150 active:scale-75 ${
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
              <span className="ml-1 text-sm font-medium text-gray-600 dark:text-gray-400">
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
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 mb-3 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-400 transition-all">
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

                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full rounded-xl shadow-sm"
                >
                  {submitting ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Enviar calificación
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
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
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-600 flex items-center justify-center shadow-sm">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Hola, {paciente.nombre}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Phone className="h-3 w-3" /> {formatCLPhone(paciente.telefono)}
            </p>
          </div>
        </div>

        <ChevronRight className="h-5 w-5 text-gray-300 dark:text-gray-600" />
      </motion.div>

      {/* Quick Survey */}
      <QuickSurveyCard
        key={surveyKey}
        turnosSinEncuesta={turnosSinEncuesta}
        onSurveySubmitted={() => setSurveyKey((k) => k + 1)}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'Turnos',
            valor: turnos.length,
            icon: Calendar,
            gradient: 'from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20',
            iconColor: 'text-blue-600 dark:text-blue-400',
            textColor: 'text-blue-700 dark:text-blue-300',
          },
          {
            label: 'Próximos',
            valor: turnosProximos.length,
            icon: Clock,
            gradient:
              'from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            textColor: 'text-emerald-700 dark:text-emerald-300',
          },
          {
            label: 'Recetas',
            valor: recetas.length,
            icon: HeartPulse,
            gradient:
              'from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20',
            iconColor: 'text-purple-600 dark:text-purple-400',
            textColor: 'text-purple-700 dark:text-purple-300',
          },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`${staggerItem} group transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]`}
            style={staggerDelay(i)}
          >
            <Card
              className={`bg-gradient-to-br ${stat.gradient} border-0 shadow-sm transition-shadow duration-200 group-hover:shadow-md`}
            >
              <CardContent className="p-3 text-center">
                <stat.icon className={`h-5 w-5 ${stat.iconColor} mx-auto mb-1`} />
                <p className={`text-xl font-bold ${stat.textColor}`}>{stat.valor}</p>
                <p className={`text-[10px] ${stat.iconColor}/70 font-medium`}>{stat.label}</p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Datos del paciente */}
      <div className={`${staggerItem}`} style={staggerDelay(3)}>
        <Card className="shadow-sm border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors duration-300">
          <CardContent className="p-4">
            <h2 className="font-semibold text-sm text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
              Mis datos
            </h2>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Nombre completo</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {paciente.nombre} {paciente.apellido}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Teléfono</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {formatCLPhone(paciente.telefono)}
                </p>
              </div>
              {paciente.rut && (
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">RUT</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{paciente.rut}</p>
                </div>
              )}
              {paciente.email && (
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Email</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
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
                  <p className="text-xs text-gray-400 dark:text-gray-500">Ubicación</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                    {[paciente.comuna, paciente.region].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs principales */}
      <div className={`${staggerItem}`} style={staggerDelay(4)}>
        <Tabs defaultValue="proximos">
          <TabsList className="w-full bg-gray-100/80 dark:bg-gray-800/60 rounded-xl p-1">
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
              <Card className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <Calendar className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">
                    No tienes turnos próximos
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Los turnos aparecerán aquí cuando los agendes
                  </p>
                </CardContent>
              </Card>
            ) : (
              <motion.div
                className="space-y-3"
                variants={staggerContainer}
                initial="hidden"
                animate="animate"
              >
                {turnosProximos.map((t) => (
                  <motion.div key={t.id} variants={itemVariants}>
                    <Card
                      className="border-l-4 overflow-hidden shadow-sm border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-200 hover:shadow-md hoverable:hover:-translate-y-0.5"
                      style={{ borderLeftColor: getTurnoColor(t.estado) }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {formatCLDate(t.fechaHora, "EEEE d 'de' MMMM")}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {t.hora} · {t.duracionMinutos} min
                            </p>
                          </div>
                          <Badge
                            style={{
                              backgroundColor: `${getTurnoColor(t.estado)}18`,
                              color: getTurnoColor(t.estado),
                            }}
                            variant="outline"
                            className="border-0 text-xs font-semibold"
                          >
                            {getTurnoLabel(t.estado)}
                          </Badge>
                        </div>
                        {t.motivo && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            {t.motivo}
                          </p>
                        )}
                        {t.medicoNombre && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                            <User className="h-3 w-3" /> Dr/a. {t.medicoNombre}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>

          {/* ── Historial ── */}
          <TabsContent value="historial" className="mt-4">
            {turnosPasados.length === 0 && historial.length === 0 ? (
              <Card className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <ClipboardList className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">Sin historial aún</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Tus visitas anteriores aparecerán aquí
                  </p>
                </CardContent>
              </Card>
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
                            <Card className="opacity-80 transition-all duration-200 hover:opacity-100 hover:shadow-sm bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800">
                              <CardContent className="p-3 flex items-center gap-3">
                                <Icon className="h-5 w-5 text-gray-400 dark:text-gray-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {formatCLDate(t.fechaHora, "d 'de' MMMM")} · {t.hora}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {t.motivo || t.tipoConsulta}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] dark:border-gray-700 dark:text-gray-400"
                                >
                                  {getTurnoLabel(t.estado)}
                                </Badge>
                              </CardContent>
                            </Card>
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
                          <Card className="transition-all duration-200 hover:shadow-sm bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800">
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between">
                                <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                  {h.titulo}
                                </p>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                  {formatCLShort(h.createdAt)}
                                </span>
                              </div>
                              {h.descripcion && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  {h.descripcion}
                                </p>
                              )}
                              <Badge
                                variant="outline"
                                className="mt-1 text-[10px] dark:border-gray-700 dark:text-gray-400"
                              >
                                {h.tipo}
                              </Badge>
                            </CardContent>
                          </Card>
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
              <Card className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <Syringe className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">
                    Sin recetas activas
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Las recetas aparecerán aquí cuando el médico las recete
                  </p>
                </CardContent>
              </Card>
            ) : (
              <motion.div
                className="space-y-3"
                variants={staggerContainer}
                initial="hidden"
                animate="animate"
              >
                {recetas.map((r) => (
                  <motion.div key={r.id} variants={itemVariants}>
                    <Card className="transition-all duration-200 hover:shadow-sm bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Syringe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {r.medicamento}
                            </p>
                          </div>
                          <Badge className={getEstadoRecetaColor(r.estado)} variant="outline">
                            {r.estado === 'activa' ? 'Activa' : 'Vencida'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {r.dosis} · {r.frecuencia}
                        </p>
                        {r.duracion && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Duración: {r.duracion}
                          </p>
                        )}
                        {r.indicaciones && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                            {r.indicaciones}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                          {r.fechaInicio && <span>Desde: {formatCLShort(r.fechaInicio)}</span>}
                          {r.fechaFin && <span>Hasta: {formatCLShort(r.fechaFin)}</span>}
                          {r.medicoNombre && <span>Dr/a. {r.medicoNombre}</span>}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <p className="text-center text-[10px] text-gray-400 dark:text-gray-600 pb-4">
        Portal del Paciente — {paciente.nombre} {paciente.apellido}
      </p>
    </div>
  );
}
