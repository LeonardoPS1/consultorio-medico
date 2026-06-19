'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface N8nStats {
  totalWorkflows: number;
  activeWorkflows: number;
  errorsLast24h: number;
  successfulExecutions24h: number;
  n8nReachable: boolean;
  healthStatus: 'ok' | 'degraded' | 'down';
  inactiveWorkflows?: { id: string; name: string }[];
}

export function N8nStatusIndicator() {
  const [stats, setStats] = useState<N8nStats | null>(null);
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/n8n/stats');
        if (!res.ok) {
          if (res.status === 403) {
            setStats(null);
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        if (mountedRef.current && json?.data) {
          setStats(json.data);
          setError(false);
        }
      } catch {
        if (mountedRef.current) {
          setError(true);
        }
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 60_000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  if (!stats) return null;

  const dotColor = error
    ? 'bg-red-500'
    : stats.healthStatus === 'down'
      ? 'bg-red-500'
      : stats.healthStatus === 'degraded'
        ? 'bg-amber-500'
        : 'bg-emerald-500';

  const pulseClass = error || stats.healthStatus === 'down'
    ? 'animate-pulse'
    : '';

  const tooltipText = error
    ? 'Error al conectar con n8n'
    : stats.healthStatus === 'down'
      ? 'n8n no responde'
      : stats.healthStatus === 'degraded'
        ? `${stats.inactiveWorkflows?.length ?? 0} workflows inactivos, ${stats.errorsLast24h} errores/24h`
        : `${stats.activeWorkflows}/${stats.totalWorkflows} workflows activos`;

  return (
    <span
      className="relative inline-flex items-center"
      title={tooltipText}
    >
      <span
        className={cn(
          'absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-1 ring-background',
          dotColor,
          pulseClass,
        )}
      />
    </span>
  );
}
