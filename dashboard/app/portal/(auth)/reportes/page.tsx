/**
 * Portal Reportes — Estadísticas personales del paciente
 * Rediseñado con portal design system tokens.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  DollarSign,
  Syringe,
  Clock,
  TrendingUp,
  Loader2,
  Activity,
  Eye,
} from 'lucide-react';
import { PortalCard } from '@/components/portal/portal-card';

interface ReportesData {
  totalVisitas: number;
  visitasEsteMes: number;
  visitasPorTipo: Array<{ tipo: string; value: number }>;
  visitasPorMes: Array<{ mes: string; value: number }>;
  totalGastado: number;
  recetasActivas: number;
  ultimaVisita: { fecha: string; medico: string | null } | null;
}

function formatCLPrice(amount: number): string {
  if (amount === 0) return '$0';
  return '$' + amount.toLocaleString('es-CL');
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

const tipoLabels: Record<string, string> = {
  presencial: 'Presencial',
  videollamada: 'Videollamada',
  domicilio: 'Domicilio',
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
          <div
            key={d.mes}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <span
              className="text-[10px] font-medium"
              style={{ color: 'hsl(var(--portal-muted-foreground))' }}
            >
              {d.value}
            </span>
            <div
              className="w-full rounded-t-md transition-all duration-500"
              style={{
                height: `${Math.max(pct, 4)}%`,
                background:
                  'linear-gradient(180deg, hsl(var(--portal-primary)), hsl(var(--portal-accent)))',
              }}
            />
            <span
              className="text-[8px] rotate-[-45deg] origin-left whitespace-nowrap"
              style={{
                color: 'hsl(var(--portal-muted-foreground) / 0.7)',
              }}
            >
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
  bg,
  iconColor,
  delay,
  suffix,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  bg: string;
  iconColor: string;
  delay: number;
  suffix?: string;
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
      <PortalCard style={{ background: bg }}>
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-xs font-medium"
            style={{ color: 'hsl(var(--portal-muted-foreground))' }}
          >
            {label}
          </span>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <p className={`text-2xl font-bold ${iconColor}`}>
          {value}
          {suffix && (
            <span className="text-sm font-normal ml-0.5">
              {suffix}
            </span>
          )}
        </p>
      </PortalCard>
    </motion.div>
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
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2
          className="h-8 w-8 animate-spin"
          style={{ color: 'hsl(var(--portal-primary))' }}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <PortalCard className="text-center" padding="lg" style={{ color: 'hsl(var(--portal-muted-foreground) / 0.7)' }}>
        <TrendingUp
          className="h-12 w-12 mx-auto mb-3"
          style={{
            color: 'hsl(var(--portal-muted-foreground) / 0.3)',
          }}
        />
        <p>No se pudieron cargar las estadísticas</p>
      </PortalCard>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1
          className="text-2xl font-bold"
          style={{ color: 'hsl(var(--portal-foreground))' }}
        >
          Mis Estadísticas
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: 'hsl(var(--portal-muted-foreground))' }}
        >
          Resumen de tu actividad en el consultorio
        </p>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Calendar}
          label="Total visitas"
          value={data.totalVisitas}
          bg="hsl(var(--portal-primary) / 0.06)"
          iconColor=""
          delay={0}
        />
        <StatCard
          icon={Activity}
          label="Este mes"
          value={data.visitasEsteMes}
          bg="hsl(var(--portal-accent) / 0.06)"
          iconColor=""
          delay={0.05}
        />
        <StatCard
          icon={DollarSign}
          label="Total gastado"
          value={formatCLPrice(data.totalGastado)}
          bg="hsl(var(--portal-primary) / 0.06)"
          iconColor=""
          delay={0.1}
        />
        <StatCard
          icon={Syringe}
          label="Recetas activas"
          value={data.recetasActivas}
          bg="hsl(38 92% 50% / 0.06)"
          iconColor=""
          delay={0.15}
        />
      </div>

      {/* Última visita */}
      {data.ultimaVisita && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.2,
            duration: 0.25,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <PortalCard>
            <div className="flex items-center gap-2 mb-2">
              <Clock
                className="h-4 w-4"
                style={{ color: 'hsl(var(--portal-primary))' }}
              />
              <h3
                className="font-semibold text-sm"
                style={{ color: 'hsl(var(--portal-foreground))' }}
              >
                Última visita
              </h3>
            </div>
            <p
              className="text-sm"
              style={{ color: 'hsl(var(--portal-muted-foreground))' }}
            >
              {formatDateCL(data.ultimaVisita.fecha)}
            </p>
            {data.ultimaVisita.medico && (
              <p
                className="text-xs mt-0.5"
                style={{
                  color:
                    'hsl(var(--portal-muted-foreground) / 0.7)',
                }}
              >
                Dr/a. {data.ultimaVisita.medico}
              </p>
            )}
          </PortalCard>
        </motion.div>
      )}

      {/* Visitas por tipo */}
      {data.visitasPorTipo.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.25,
            duration: 0.25,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <PortalCard>
            <h3
              className="font-semibold text-sm mb-3 flex items-center gap-2"
              style={{ color: 'hsl(var(--portal-foreground))' }}
            >
              <Eye
                className="h-4 w-4"
                style={{
                  color:
                    'hsl(var(--portal-muted-foreground) / 0.5)',
                }}
              />
              Tipo de consultas
            </h3>
            <div className="space-y-2">
              {data.visitasPorTipo.map((tipo) => (
                <div
                  key={tipo.tipo}
                  className="flex items-center justify-between"
                >
                  <span
                    className="text-sm"
                    style={{
                      color: 'hsl(var(--portal-muted-foreground))',
                    }}
                  >
                    {tipoLabels[tipo.tipo] || tipo.tipo}
                  </span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-24 h-2 rounded-full overflow-hidden"
                      style={{
                        background: 'hsl(var(--portal-muted))',
                      }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            data.totalVisitas > 0
                              ? (tipo.value /
                                  data.totalVisitas) *
                                100
                              : 0
                          }%`,
                          background:
                            'linear-gradient(90deg, hsl(var(--portal-primary)), hsl(var(--portal-accent)))',
                        }}
                      />
                    </div>
                    <span
                      className="text-sm font-medium w-6 text-right"
                      style={{
                        color:
                          'hsl(var(--portal-foreground) / 0.8)',
                      }}
                    >
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
          transition={{
            delay: 0.3,
            duration: 0.25,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <PortalCard>
            <h3
              className="font-semibold text-sm mb-3 flex items-center gap-2"
              style={{ color: 'hsl(var(--portal-foreground))' }}
            >
              <TrendingUp
                className="h-4 w-4"
                style={{
                  color:
                    'hsl(var(--portal-muted-foreground) / 0.5)',
                }}
              />
              Visitas por mes
            </h3>
            <MiniBarChart data={data.visitasPorMes} />
          </PortalCard>
        </motion.div>
      )}

      {data.visitasPorMes.length === 0 &&
        data.visitasPorTipo.length === 0 &&
        data.totalVisitas === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <PortalCard className="text-center" padding="lg" style={{ color: 'hsl(var(--portal-muted-foreground) / 0.7)' }}>
              <TrendingUp
                className="h-12 w-12 mx-auto mb-3"
                style={{
                  color:
                    'hsl(var(--portal-muted-foreground) / 0.3)',
                }}
              />
              <p
                className="font-medium"
                style={{
                  color: 'hsl(var(--portal-muted-foreground) / 0.7)',
                }}
              >
                Sin actividad aún
              </p>
              <p className="text-sm mt-1">
                Tus estadísticas aparecerán aquí cuando tengas
                visitas registradas.
              </p>
            </PortalCard>
          </motion.div>
        )}
    </div>
  );
}
