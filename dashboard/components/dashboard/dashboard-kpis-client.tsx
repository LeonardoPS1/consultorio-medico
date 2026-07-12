'use client';

import { useRef, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSucursal } from '@/lib/sucursal-context';
import { getKpiConfig } from '@/lib/kpi-config';

// ─── Types ────────────────────────────────────────────────

interface DashboardKpi {
  title: string;
  value: string;
  change: string;
  type: string;
  urgent?: boolean;
}

interface DashboardKpisClientProps {
  initialKpis: DashboardKpi[];
}

// ─── CountUp Hook ──────────────────────────────────────────

function useCountUp(targetValue: string, duration = 400) {
  const ref = useRef<HTMLSpanElement>(null);
  const numValue = parseFloat(targetValue.replace(/[^0-9.]/g, ''));
  const suffix = targetValue.replace(/[0-9.]/g, '');

  useEffect(() => {
    if (isNaN(numValue) || !ref.current) return;
    const el = ref.current;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2);
      const current = Math.round(eased * numValue);
      el.textContent = current + suffix;
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        el.textContent = targetValue;
      }
    }

    requestAnimationFrame(animate);
  }, [numValue, suffix, duration, targetValue]);

  return ref;
}

// ─── Component ─────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.03,
    },
  },
};

const kpiCardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

export function DashboardKpisClient({ initialKpis }: DashboardKpisClientProps) {
  const { sucursalId } = useSucursal();
  const prevDataRef = useRef<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-kpis', sucursalId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sucursalId) params.set('sucursalId', sucursalId);
      const res = await fetch(`/api/dashboard/stats?${params.toString()}`);
      if (!res.ok) throw new Error('Error fetching KPIs');
      return res.json();
    },
    initialData: { kpis: initialKpis },
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
    select: (data: { kpis?: DashboardKpi[] }) => data?.kpis ?? [],
  });

  const kpis = data ?? [];
  const kpisStr = JSON.stringify(kpis);
  const animKey =
    kpisStr !== prevDataRef.current ? ((prevDataRef.current = kpisStr), Date.now()) : 0;

  if (kpis.length === 0) return null;

  return (
    <motion.div
      key={animKey}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 ${isLoading ? 'opacity-60 transition-opacity' : ''}`}
    >
      {kpis.map((kpi) => {
        const { icon: Icon, gradient, bg } = getKpiConfig(kpi.type);
        return (
          <motion.div key={kpi.title} variants={kpiCardVariants}>
            <Card className="hover-card overflow-hidden relative glass-kpi">
              <div
                className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-[0.04] dark:opacity-[0.1]`}
              />
              <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 space-y-0 px-2.5 sm:px-3 md:px-6 pt-2.5 sm:pt-3 md:pt-6 relative">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate pr-1">
                  {kpi.title}
                </CardTitle>
                <div className={`rounded-lg ${bg} p-1 sm:p-1.5 md:p-2 shrink-0`}>
                  <Icon
                    className={`h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 ${kpi.urgent ? 'text-red-500 animate-pulse-soft' : ''}`}
                  />
                </div>
              </CardHeader>
              <CardContent className="px-2.5 sm:px-3 md:px-6 pb-2.5 sm:pb-3 md:pb-6 relative">
                <div className="flex items-baseline gap-1.5 sm:gap-2">
                  <KpiValue value={kpi.value} />
                  <span
                    className={`text-xs sm:text-sm font-medium ${kpi.urgent ? 'text-red-500' : 'text-emerald-500'}`}
                  >
                    {kpi.change}
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  {kpi.type === 'calendar'
                    ? 'vs día anterior'
                    : kpi.type === 'users'
                      ? 'vs semana anterior'
                      : 'últimas 24 hs'}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ─── KpiValue con count-up ─────────────────────────────────

function KpiValue({ value }: { value: string }) {
  const ref = useCountUp(value);

  if (/[a-zA-Z]/.test(value)) {
    return <div className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight">{value}</div>;
  }

  return (
    <div className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight tabular-nums">
      <span ref={ref}>{value}</span>
    </div>
  );
}
