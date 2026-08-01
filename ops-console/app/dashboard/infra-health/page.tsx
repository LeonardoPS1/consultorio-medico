'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, AlertCircle, ExternalLink, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface ServiceHealth {
  name: string;
  displayName: string;
  status: 'up' | 'degraded' | 'down';
  latencyMs: number;
  lastCheck: string;
  lastOk: string | null;
  message?: string;
  url?: string;
  critical: boolean;
  category: string;
}

interface InfraHealthSummary {
  globalStatus: 'healthy' | 'degraded' | 'critical';
  services: ServiceHealth[];
  criticalDown: ServiceHealth[];
  timestamp: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  database: 'Base de Datos',
  cache: 'Caché',
  queue: 'Cola/Workers',
  ai: 'IA Local',
  communication: 'Comunicación',
  realtime: 'Tiempo Real',
};

const CATEGORY_COLORS: Record<string, string> = {
  database: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  cache: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  queue: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  ai: 'bg-green-500/10 text-green-400 border-green-500/20',
  communication: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  realtime: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return 'hace unos segs';
  if (diffMin < 60) return `hace ${diffMin}m`;
  if (diffHour < 24) return `hace ${diffHour}h`;
  return date.toLocaleDateString('es-CL');
}

function getMinutesSinceLastOk(lastOk: string | null): number | null {
  if (!lastOk) return null;
  const lastOkTime = new Date(lastOk).getTime();
  const now = Date.now();
  return Math.floor((now - lastOkTime) / 60000);
}

function StatusBadge({ status, critical, minutesDown }: { status: ServiceHealth['status']; critical: boolean; minutesDown: number | null }) {
  const baseClasses = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium';

  if (status === 'up') {
    return (
      <span className={`${baseClasses} bg-green-500/10 text-green-400 border border-green-500/20`}>
        <CheckCircle className="w-3 h-3" /> Operativo
      </span>
    );
  }
  if (status === 'degraded') {
    return (
      <span className={`${baseClasses} bg-yellow-500/10 text-yellow-400 border border-yellow-500/20`}>
        <AlertTriangle className="w-3 h-3" /> Degradado
      </span>
    );
  }
  return (
    <span className={`${baseClasses} bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse`}>
      <XCircle className="w-3 h-3" />
      {critical && minutesDown !== null && minutesDown > 5 ? (
        <>Caído ({minutesDown} min)</>
      ) : (
        <>Caído</>
      )}
    </span>
  );
}

function ServiceCard({ service, onToggleDetails }: { service: ServiceHealth; onToggleDetails: (name: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const minutesDown = getMinutesSinceLastOk(service.lastOk);
  const isDownLong = service.status === 'down' && service.critical && minutesDown !== null && minutesDown > 5;

  const statusColors = {
    up: 'border-l-green-500 bg-green-500/5',
    degraded: 'border-l-yellow-500 bg-yellow-500/5',
    down: 'border-l-red-500 bg-red-500/5',
  };

  const categoryLabel = CATEGORY_LABELS[service.category] || service.category;
  const categoryColor = CATEGORY_COLORS[service.category] || 'bg-gray-500/10 text-gray-400 border-gray-500/20 px-2 py-0.5 rounded text-xs font-medium';

  return (
    <div
      className={`group relative p-4 rounded-xl border transition-all duration-200 ${
        statusColors[service.status]
      } ${isDownLong ? 'ring-2 ring-red-500/30' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-semibold text-[var(--text-primary)] truncate">{service.displayName}</h3>
            {service.critical && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                <AlertTriangle className="w-3 h-3" /> Crítico
              </span>
            )}
            <span className={categoryColor}>{categoryLabel}</span>
          </div>

          <div className="mt-3 flex items-center gap-4 flex-wrap text-sm">
            <StatusBadge status={service.status} critical={service.critical} minutesDown={minutesDown} />
            <span className="text-[var(--text-secondary)] font-mono">{formatLatency(service.latencyMs)}</span>
            <span className="text-[var(--text-muted)]">Último check: {formatTimeAgo(service.lastCheck)}</span>
          </div>

          {service.message && service.status !== 'up' && (
            <p className="mt-2 text-sm text-red-400/90 font-mono break-all">{service.message}</p>
          )}

          {service.lastOk && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Último OK: {formatTimeAgo(service.lastOk)} {minutesDown !== null && `(${minutesDown} min atrás)`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {service.url && (
            <a
              href={service.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors"
              title="Abrir panel del servicio"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={() => {
              setExpanded(!expanded);
              onToggleDetails(service.name);
            }}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors"
            aria-expanded={expanded}
            aria-label={expanded ? 'Ocultar detalles' : 'Ver detalles'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-[var(--border)] animate-in slide-in-from-top-2 duration-200">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-[var(--text-muted)]">Nombre interno</dt>
            <dd className="font-mono text-[var(--text-secondary)]">{service.name}</dd>
            <dt className="text-[var(--text-muted)]">Categoría</dt>
            <dd>{CATEGORY_LABELS[service.category] || service.category}</dd>
            <dt className="text-[var(--text-muted)]">Crítico para flota</dt>
            <dd>{service.critical ? 'Sí' : 'No'}</dd>
            <dt className="text-[var(--text-muted)]">Latencia</dt>
            <dd className="font-mono">{formatLatency(service.latencyMs)}</dd>
            <dt className="text-[var(--text-muted)]">Último check</dt>
            <dd>{new Date(service.lastCheck).toLocaleString('es-CL')}</dd>
            <dt className="text-[var(--text-muted)]">Último OK</dt>
            <dd>{service.lastOk ? new Date(service.lastOk).toLocaleString('es-CL') : 'Nunca'}</dd>
            {service.url && (
              <>
                <dt className="text-[var(--text-muted)]">Panel</dt>
                <dd>
                  <a href={service.url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline text-sm">
                    {service.url}
                  </a>
                </dd>
              </>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

export default function InfraHealthPage() {
  const [health, setHealth] = useState<InfraHealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealth = async () => {
    try {
      setError(null);
      const res = await fetch('/api/infra-health', { cache: 'no-store' });
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      setError('Error al cargar estado de infraestructura');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(() => {
      if (autoRefresh) fetchHealth();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const toggleDetails = (name: string) => {
    setExpandedServices(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  if (loading && !health) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">Salud de Infraestructura</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Monitoreo en tiempo real de servicios críticos</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] animate-pulse">
              <div className="h-5 w-3/4 bg-[var(--bg-secondary)] rounded mb-3" />
              <div className="h-4 w-1/2 bg-[var(--bg-secondary)] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-red-400/50 mb-4" />
        <h2 className="text-lg font-medium">No se pudo cargar el estado</h2>
        <p className="text-[var(--text-secondary)] mt-1">{error}</p>
        <button onClick={fetchHealth} className="mt-4 px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)]">
          Reintentar
        </button>
      </div>
    );
  }

  const statusColors = {
    healthy: 'bg-green-500/10 text-green-400 border-green-500/20',
    degraded: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  const statusLabels = {
    healthy: 'Saludable',
    degraded: 'Degradado',
    critical: 'Crítico',
  };

  const statusIcons = {
    healthy: CheckCircle,
    degraded: AlertTriangle,
    critical: AlertCircle,
  };

  const GlobalStatusIcon = statusIcons[health.globalStatus];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Salud de Infraestructura</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Monitoreo en tiempo real de servicios críticos de la plataforma</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${statusColors[health.globalStatus]}`}>
            <GlobalStatusIcon className="w-4 h-4" />
            <span className="font-medium">{statusLabels[health.globalStatus]}</span>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="rounded border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--accent)] focus:ring-[var(--accent)]"
            />
            Auto-actualizar (30s)
          </label>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
          >
            <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {health.globalStatus === 'critical' && health.criticalDown.length > 0 && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 animate-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-400">Servicios críticos caídos — Afecta a TODOS los tenants</h3>
              <p className="text-sm text-red-300/90 mt-1">
                {health.criticalDown.map(s => s.displayName).join(', ')} {'llevan más de 5 min sin responder.'}
              </p>
              <p className="text-xs text-red-300/70 mt-2">
                Última actualización: {new Date(health.timestamp).toLocaleString('es-CL')}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {health.services.map(service => (
          <ServiceCard
            key={service.name}
            service={service}
            onToggleDetails={toggleDetails}
          />
        ))}
      </div>

      <div className="pt-4 border-t border-[var(--border)] text-xs text-[var(--text-muted)] flex items-center justify-between">
        <span>Última actualización: {new Date(health.timestamp).toLocaleString('es-CL')}</span>
        <Link href="/dashboard" className="text-[var(--accent)] hover:underline text-sm">
          ← Volver al Fleet Overview
        </Link>
      </div>
    </div>
  );
}