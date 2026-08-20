/**
 * Portal Reportes — Estadísticas personales del paciente
 * Rediseñado con portal design system tokens.
 */

'use client';

import {
  Calendar,
  Syringe,
  Clock,
  TrendingUp,
  Activity,
  Eye,
  AlertTriangle,
  CheckCircle,
  Pill,
  ArrowRight,
  User,
  Shield,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { PortalBadge } from '@/components/portal/portal-badge';
import { PortalButton } from '@/components/portal/portal-button';
import { PortalCard } from '@/components/portal/portal-card';
import { PortalSkeleton } from '@/components/portal/portal-skeleton';

interface ReportesData {
  totalVisitas: number;
  visitasEsteMes: number;
  visitasPorTipo: Array<{ tipo: string; value: number }>;
  visitasPorMes: Array<{ mes: string; value: number }>;
  recetasActivas: number;
  ultimaVisita: { fecha: string; medico: string | null } | null;
  proximosTurnos: Array<{
    id: string;
    fechaHora: string;
    medicoNombre: string | null;
    tipoConsulta: string | null;
    motivo: string | null;
  }>;
  cancelacionesMes: number;
  recetasTotal: number;
  recetasRenovadas: number;
  adherenciaRecetas: number;
  diasDesdeUltimaVisita: number | null;
  proximoControlRecomendado: number | null;
}

function formatShortMonth(mes: string): string {
  const [year, month] = mes.split('-');
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ];
  return `${months[parseInt(month, 10) - 1]} ${year.slice(2)}`;
}

function formatDateCL(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTimeCL(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const tipoLabels: Record<string, string> = {
  consulta: 'Presencial',
  telemedicina: 'Telemedicina',
  control: 'Control',
  urgencia: 'Urgencia',
  procedimiento: 'Procedimiento',
  otro: 'Otro',
};

/* ─── Mini Bar Chart ───────────────────────────────────── */
function MiniBarChart({
  data,
}: {
  data: Array<{ mes: string; value: number }>;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-1.5 h-24 pt-2">
      {data.map((d) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={d.mes} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] font-medium text-portal-muted-fg">
              {d.value}
            </span>
            <div
              className="w-full rounded-t-md transition-[height] duration-500"
              style={{
                height: `${Math.max(pct, 4)}%`,
                background: 'hsl(var(--portal-primary))',
              }}
            />
            <span className="text-[8px] rotate-[-45deg] origin-left whitespace-nowrap text-portal-muted-fg/70">
              {formatShortMonth(d.mes)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Stat Card ──────────────────────────────────────────── */
function StatCard({
  icon: Icon,
  label,
  value,
  delay,
  suffix,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  delay: number;
  suffix?: string;
  trend?: { value: number; label: string; positive: boolean };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay,
        duration: 0.25,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <PortalCard padding="md" className="bg-portal-primary/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-portal-muted-fg">
            {label}
          </span>
          <Icon className="h-4 w-4 text-portal-primary" />
        </div>
        <p className="text-2xl font-bold text-portal-primary">
          {value}
          {suffix && (
            <span className="text-sm font-normal ml-0.5">{suffix}</span>
          )}
        </p>
        {trend && (
          <div
            className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${
              trend.positive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend.positive ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )}
            <span>{trend.label}</span>
          </div>
        )}
      </PortalCard>
    </motion.div>
  );
}

/* ─── Action Card ────────────────────────────────────────── */
function ActionCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  variant = 'secondary',
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <PortalCard padding="md" hover className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-portal-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-portal-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-portal-fg truncate">{title}</h4>
        <p className="text-sm text-portal-muted-fg mt-0.5">{description}</p>
      </div>
      <PortalButton
        variant={variant}
        fullWidth={false}
        onClick={() => window.location.href = actionHref}
        className="flex-shrink-0"
      >
        {actionLabel}
        <ArrowRight className="h-3.5 w-3.5 ml-1" />
      </PortalButton>
    </PortalCard>
  );
}

/* ─── Progress Ring ──────────────────────────────────────── */
function ProgressRing({
  value,
  label,
  size = 80,
  strokeWidth = 6,
}: {
  value: number;
  label: string;
  size?: number;
  strokeWidth?: number;
}) {
  const circumference = 2 * Math.PI * ((size - strokeWidth) / 2);
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - strokeWidth) / 2}
          fill="none"
          stroke="hsl(var(--portal-border))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - strokeWidth) / 2}
          fill="none"
          stroke="hsl(var(--portal-primary))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 500ms ease-out',
          }}
        />
      </svg>
      <p className="text-sm font-medium text-portal-fg mt-2">{label}</p>
      <p className="text-2xl font-bold text-portal-primary">{value}%</p>
    </div>
  );
}

/* ─── Página Principal ──────────────────────────────────── */
export default function PortalReportesPage() {
  const [data, setData] = useState<ReportesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/reportes')
      .then((res) => res.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PortalSkeleton />;
  }

  if (!data) {
    return (
      <PortalCard className="text-center text-portal-muted-fg/70" padding="lg">
        <TrendingUp
          className="h-12 w-12 mx-auto mb-3"
          style={{ color: 'hsl(var(--portal-muted-foreground) / 0.3)' }}
        />
        <p>No se pudieron cargar las estadísticas</p>
      </PortalCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-[20px] font-semibold tracking-[0.01em] text-portal-fg">
          Mis Estadísticas
        </h1>
        <p className="text-sm mt-1 text-portal-muted-fg">
          Resumen de tu actividad y salud en el consultorio
        </p>
      </motion.div>

      {/* Stats Grid - 4 cards principales */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Calendar}
          label="Total visitas"
          value={data.totalVisitas}
          delay={0}
        />
        <StatCard
          icon={Activity}
          label="Este mes"
          value={data.visitasEsteMes}
          delay={0.05}
          trend={data.visitasEsteMes > 0 ? { value: data.visitasEsteMes, label: 'visitas', positive: true } : undefined}
        />
        <StatCard
          icon={Pill}
          label="Recetas activas"
          value={data.recetasActivas}
          delay={0.1}
        />
        <StatCard
          icon={TrendingUp}
          label="Adherencia tratamientos"
          value={data.adherenciaRecetas}
          delay={0.15}
          suffix="%"
          trend={data.adherenciaRecetas >= 80 ? { value: data.adherenciaRecetas, label: 'buena', positive: true } : { value: data.adherenciaRecetas, label: 'revisar', positive: false }}
        />
      </div>

      {/* Próximos turnos */}
      {data.proximosTurnos.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <PortalCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-portal-fg">
                <Calendar className="h-4 w-4 text-portal-muted-fg/50" />
                Próximos turnos
              </h3>
              <PortalButton
                variant="ghost"
                fullWidth={false}
                onClick={() => window.location.href = '/portal/turnos'}
              >
                Ver todos
              </PortalButton>
            </div>
            <div className="space-y-2">
              {data.proximosTurnos.slice(0, 3).map((turno) => (
                <div key={turno.id} className="flex items-center justify-between p-2 bg-portal-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-portal-primary/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-5 w-5 text-portal-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-portal-fg text-sm">
                        {formatDateTimeCL(turno.fechaHora)}
                      </p>
                      <p className="text-xs text-portal-muted-fg">
                        {turno.medicoNombre ? `Dr/a. ${turno.medicoNombre}` : 'Médico por confirmar'}
                        {turno.tipoConsulta && ` • ${tipoLabels[turno.tipoConsulta] || turno.tipoConsulta}`}
                      </p>
                    </div>
                  </div>
                  {turno.motivo && (
                    <PortalBadge variant="primary" className="text-xs ml-2">
                      {turno.motivo}
                    </PortalBadge>
                  )}
                </div>
              ))}
            </div>
          </PortalCard>
        </motion.div>
      )}

      {/* Alertas y recomendaciones */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Próximo control recomendado */}
          {data.proximoControlRecomendado !== null && (
            <ActionCard
              icon={Shield}
              title={
                data.proximoControlRecomendado === 0
                  ? 'Control recomendado ya'
                  : 'Próximo control recomendado'
              }
              description={
                data.proximoControlRecomendado === 0
                  ? 'Ha pasado más de 90 días desde tu última visita. Es hora de un control.'
                  : `En ${data.proximoControlRecomendado} días se recomienda un control de rutina.`
              }
              actionLabel="Agendar control"
              actionHref="/portal/agendar"
              variant="primary"
            />
          )}

          {/* Adherencia a recetas */}
          {data.recetasTotal > 0 && (
            <div className="relative">
              <PortalCard padding="md">
                <h4 className="font-semibold text-portal-fg mb-3 flex items-center gap-2">
                  <Pill className="h-4 w-4 text-portal-primary" />
                  Adherencia a tratamientos
                </h4>
                <div className="flex items-center justify-center gap-6">
                  <ProgressRing value={data.adherenciaRecetas} label="Renovadas" size={70} />
                  <div className="text-left">
                    <p className="text-sm text-portal-muted-fg">
                      {data.recetasRenovadas} de {data.recetasTotal} recetas renovadas
                    </p>
                    <p className={`text-sm font-medium mt-1 ${
                      data.adherenciaRecetas >= 80 ? 'text-green-600' : data.adherenciaRecetas >= 50 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {data.adherenciaRecetas >= 80 ? 'Excelente' : data.adherenciaRecetas >= 50 ? 'Regular' : 'Baja'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-portal-border">
<PortalButton
                  variant="secondary"
                  fullWidth
                  onClick={() => window.location.href = '/portal/recetas'}
                >
                  Gestionar recetas
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </PortalButton>
                </div>
              </PortalCard>
            </div>
          )}

          {/* Alertas: cancelaciones o sin visita reciente */}
          {(data.cancelacionesMes > 2 || (data.diasDesdeUltimaVisita !== null && data.diasDesdeUltimaVisita > 180)) && (
            <PortalCard padding="md" className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h4 className="font-semibold text-amber-800 dark:text-amber-200">Atención</h4>
              </div>
              <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-300">
                {data.cancelacionesMes > 2 && (
                  <li className="flex items-center gap-1">
                    <span>•</span> {data.cancelacionesMes} cancelaciones este mes
                  </li>
                )}
                {data.diasDesdeUltimaVisita !== null && data.diasDesdeUltimaVisita > 180 && (
                  <li className="flex items-center gap-1">
                    <span>•</span> {data.diasDesdeUltimaVisita} días sin visita médica
                  </li>
                )}
              </ul>
<PortalButton
                variant="primary"
                fullWidth
                onClick={() => window.location.href = '/portal/agendar'}
              >
                Agendar control
              </PortalButton>
            </PortalCard>
          )}

          {/* Última visita */}
          {data.ultimaVisita && (
            <PortalCard>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-portal-primary" />
                <h3 className="font-semibold text-sm text-portal-fg">Última visita</h3>
              </div>
              <p className="text-sm text-portal-muted-fg">
                {formatDateCL(data.ultimaVisita.fecha)}
              </p>
              {data.ultimaVisita.medico && (
                <p className="text-xs mt-0.5 text-portal-muted-fg/70">
                  Dr/a. {data.ultimaVisita.medico}
                </p>
              )}
              {data.diasDesdeUltimaVisita !== null && (
                <p className="text-xs mt-1 text-portal-muted-fg/60">
                  Hace {data.diasDesdeUltimaVisita} día{data.diasDesdeUltimaVisita !== 1 ? 's' : ''}
                </p>
              )}
            </PortalCard>
          )}
        </div>
      </motion.div>

      {/* Visitas por tipo */}
      {data.visitasPorTipo.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <PortalCard>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-portal-fg">
              <Eye className="h-4 w-4 text-portal-muted-fg/50" />
              Tipo de consultas
            </h3>
            <div className="space-y-2">
              {data.visitasPorTipo.map((tipo) => (
                <div key={tipo.tipo} className="flex items-center justify-between">
                  <span className="text-sm text-portal-muted-fg">
                    {tipoLabels[tipo.tipo] || tipo.tipo}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 rounded-full overflow-hidden bg-portal-muted">
                      <div
                        className="h-full rounded-full transition-[width] duration-500 bg-portal-primary"
                        style={{
                          width: `${
                            data.totalVisitas > 0
                              ? (tipo.value / data.totalVisitas) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-6 text-right text-portal-fg/80">
                      {tipo.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </PortalCard>
        </motion.div>
      )}

      {/* Visitas por mes */}
      {data.visitasPorMes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <PortalCard>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-portal-fg">
              <TrendingUp className="h-4 w-4 text-portal-muted-fg/50" />
              Visitas por mes
            </h3>
            <MiniBarChart data={data.visitasPorMes} />
          </PortalCard>
        </motion.div>
      )}

      {/* Estado vacío */}
      {data.visitasPorMes.length === 0 &&
        data.visitasPorTipo.length === 0 &&
        data.totalVisitas === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <PortalCard className="text-center text-portal-muted-fg/70" padding="lg">
              <TrendingUp
                className="h-12 w-12 mx-auto mb-3"
                style={{ color: 'hsl(var(--portal-muted-foreground) / 0.3)' }}
              />
              <p className="font-medium text-portal-muted-fg/70">Sin actividad aún</p>
              <p className="text-sm mt-1">
                Tus estadísticas aparecerán aquí cuando tengas visitas registradas.
              </p>
              <PortalButton
                variant="primary"
                onClick={() => window.location.href = '/portal/agendar'}
                className="mt-4 w-full sm:w-auto"
              >
                Agendar primera cita
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </PortalButton>
            </PortalCard>
          </motion.div>
        )}
    </div>
  );
}