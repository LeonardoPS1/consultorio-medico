'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Calendar,
  Users,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  Smartphone,
  Activity,
} from 'lucide-react';
import { useSucursal } from '@/lib/sucursal-context';

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

// ─── Helpers ──────────────────────────────────────────────

function getKpiIcon(type: string) {
  switch (type) {
    case 'calendar': return Calendar;
    case 'users': return Users;
    case 'messages': return MessageSquare;
    case 'alert': return AlertTriangle;
    case 'response': return TrendingUp;
    case 'today': return Smartphone;
    default: return Activity;
  }
}

function getKpiGradient(type: string) {
  switch (type) {
    case 'calendar': return 'from-blue-500 to-blue-600';
    case 'users': return 'from-emerald-500 to-emerald-600';
    case 'messages': return 'from-amber-500 to-amber-600';
    case 'alert': return 'from-red-500 to-red-600';
    case 'response': return 'from-purple-500 to-purple-600';
    case 'today': return 'from-cyan-500 to-cyan-600';
    default: return 'from-gray-500 to-gray-600';
  }
}

function getKpiBg(type: string) {
  switch (type) {
    case 'calendar': return 'bg-blue-50 dark:bg-blue-950/30';
    case 'users': return 'bg-emerald-50 dark:bg-emerald-950/30';
    case 'messages': return 'bg-amber-50 dark:bg-amber-950/30';
    case 'alert': return 'bg-red-50 dark:bg-red-950/30';
    case 'response': return 'bg-purple-50 dark:bg-purple-950/30';
    case 'today': return 'bg-cyan-50 dark:bg-cyan-950/30';
    default: return 'bg-gray-50 dark:bg-gray-950/30';
  }
}

// ─── Component ─────────────────────────────────────────────

export function DashboardKpisClient({ initialKpis }: DashboardKpisClientProps) {
  const { sucursalId } = useSucursal();
  const [kpis, setKpis] = useState<DashboardKpi[]>(initialKpis);
  const [loading, setLoading] = useState(false);

  const fetchKpis = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sucursalId) params.set('sucursalId', sucursalId);
      const res = await fetch(`/api/dashboard/stats?${params.toString()}`);
      if (!res.ok) throw new Error('Error fetching KPIs');
      const data = await res.json();
      if (data?.kpis) setKpis(data.kpis);
    } catch {
      // Silently fail — keep showing current data
    } finally {
      setLoading(false);
    }
  }, [sucursalId]);

  // Re-fetch cuando cambia la sucursal
  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  if (kpis.length === 0) return null;

  return (
    <div className={`grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 stagger-children ${loading ? 'opacity-60 transition-opacity' : ''}`}>
      {kpis.map((kpi) => {
        const Icon = getKpiIcon(kpi.type);
        const gradient = getKpiGradient(kpi.type);
        const bg = getKpiBg(kpi.type);
        return (
          <Card key={kpi.title} className="hover-card overflow-hidden relative">
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-[0.03] dark:opacity-[0.08]`} />
            <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 space-y-0 px-3 md:px-6 pt-3 md:pt-6 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <div className={`rounded-lg ${bg} p-1.5 md:p-2`}>
                <Icon className={`h-3.5 w-3.5 md:h-4 md:w-4 ${kpi.urgent ? 'text-red-500 animate-pulse-soft' : ''}`} />
              </div>
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-3 md:pb-6 relative">
              <div className="flex items-baseline gap-2">
                <div className="text-2xl sm:text-3xl font-bold">{kpi.value}</div>
                <span className={`text-sm font-medium ${kpi.urgent ? 'text-red-500' : 'text-emerald-500'}`}>
                  {kpi.change}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpi.type === 'calendar'
                  ? 'vs día anterior'
                  : kpi.type === 'users'
                    ? 'vs semana anterior'
                    : 'últimas 24 hs'}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
