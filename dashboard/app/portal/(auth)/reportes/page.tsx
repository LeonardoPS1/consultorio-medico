/**
 * Portal Reportes — Estadísticas personales del paciente
 * Muestra visitas, gastos, recetas activas y últimas atenciones
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  DollarSign,
  Syringe,
  Clock,
  TrendingUp,
  Loader2,
  Activity,
  Eye,
  ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// ─── Types ────────────────────────────────────────────────

interface ReportesData {
  totalVisitas: number;
  visitasEsteMes: number;
  visitasPorTipo: Array<{ tipo: string; value: number }>;
  visitasPorMes: Array<{ mes: string; value: number }>;
  totalGastado: number;
  recetasActivas: number;
  ultimaVisita: { fecha: string; medico: string | null } | null;
}

// ─── Helpers ──────────────────────────────────────────────

function formatCLPrice(amount: number): string {
  if (amount === 0) return '$0';
  return '$' + amount.toLocaleString('es-CL');
}

function formatShortMonth(mes: string): string {
  const [year, month] = mes.split('-');
  const months = [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
  ];
  return `${months[parseInt(month, 10) - 1]} ${year.slice(2)}`;
}

function formatDateCL(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

const tipoLabels: Record<string, string> = {
  presencial: 'Presencial',
  videollamada: 'Videollamada',
  domicilio: 'Domicilio',
};

// ─── Bar Chart Simple ─────────────────────────────────────

function MiniBarChart({ data }: { data: Array<{ mes: string; value: number }> }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-1.5 h-24 pt-2">
      {data.map((d) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={d.mes} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
              {d.value}
            </span>
            <div
              className="w-full rounded-t-md bg-blue-500 dark:bg-blue-400 transition-all duration-500"
              style={{ height: `${Math.max(pct, 4)}%` }}
            />
            <span className="text-[8px] text-gray-400 dark:text-gray-500 rotate-[-45deg] origin-left whitespace-nowrap">
              {formatShortMonth(d.mes)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  gradient,
  iconColor,
  delay,
  suffix,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  gradient: string;
  iconColor: string;
  delay: number;
  suffix?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className={`bg-gradient-to-br ${gradient} border-0 shadow-sm`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          <p className={`text-2xl font-bold ${iconColor}`}>
            {value}
            {suffix && <span className="text-sm font-normal ml-0.5">{suffix}</span>}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Página Principal ─────────────────────────────────────

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
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-gray-400">
        <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No se pudieron cargar las estadísticas</p>
      </div>
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mis Estadísticas</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Resumen de tu actividad en el consultorio
        </p>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Calendar}
          label="Total visitas"
          value={data.totalVisitas}
          gradient="from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20"
          iconColor="text-blue-600 dark:text-blue-400"
          delay={0}
        />
        <StatCard
          icon={Activity}
          label="Este mes"
          value={data.visitasEsteMes}
          gradient="from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20"
          iconColor="text-emerald-600 dark:text-emerald-400"
          delay={0.05}
        />
        <StatCard
          icon={DollarSign}
          label="Total gastado"
          value={formatCLPrice(data.totalGastado)}
          gradient="from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20"
          iconColor="text-purple-600 dark:text-purple-400"
          delay={0.1}
        />
        <StatCard
          icon={Syringe}
          label="Recetas activas"
          value={data.recetasActivas}
          gradient="from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20"
          iconColor="text-amber-600 dark:text-amber-400"
          delay={0.15}
        />
      </div>

      {/* Última visita */}
      {data.ultimaVisita && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  Última visita
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatDateCL(data.ultimaVisita.fecha)}
              </p>
              {data.ultimaVisita.medico && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                  Dr/a. {data.ultimaVisita.medico}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Visitas por tipo */}
      {data.visitasPorTipo.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4 text-gray-400" />
                Tipo de consultas
              </h3>
              <div className="space-y-2">
                {data.visitasPorTipo.map((tipo) => (
                  <div key={tipo.tipo} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {tipoLabels[tipo.tipo] || tipo.tipo}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500 dark:bg-blue-400 transition-all duration-500"
                          style={{
                            width: `${data.totalVisitas > 0 ? (tipo.value / data.totalVisitas) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-6 text-right">
                        {tipo.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Visitas por mes */}
      {data.visitasPorMes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-gray-400" />
                Visitas por mes
              </h3>
              <MiniBarChart data={data.visitasPorMes} />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {data.visitasPorMes.length === 0 &&
        data.visitasPorTipo.length === 0 &&
        data.totalVisitas === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-gray-400 dark:text-gray-500"
          >
            <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="font-medium text-gray-500 dark:text-gray-400">Sin actividad aún</p>
            <p className="text-sm mt-1">
              Tus estadísticas aparecerán aquí cuando tengas visitas registradas.
            </p>
          </motion.div>
        )}
    </div>
  );
}
