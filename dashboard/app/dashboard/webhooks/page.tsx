import { WebhooksClient } from './webhooks-client';
import { PageHeader } from '@/components/page-header';

// ─── Types ────────────────────────────────────────────────

interface MensajeLog {
  id: string;
  conversacionId: string;
  rol: string;
  contenido: string;
  tipo: string;
  twilioSid?: string;
  twilioStatus?: string;
  n8nExecutionId?: string;
  createdAt: string;
  pacienteNombre: string;
  pacienteApellido: string;
  pacienteTelefono: string;
  conversacionEstado: string;
  conversacionCanal: string;
}

interface WebhooksApiResponse {
  success: boolean;
  data: MensajeLog[];
  total: number;
  porEstado: Record<string, number>;
}

// ─── Data fetching ─────────────────────────────────────────

/** Forzar renderizado dinámico */
export const dynamic = 'force-dynamic';

async function getInitialData(): Promise<WebhooksApiResponse | null> {
  try {
    const res = await fetch('http://localhost:3000/api/webhooks/logs?limit=50&offset=0', {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── KPI card component (server-rendered) ─────────────────

function KpiCards({ total, porEstado }: { total: number; porEstado: Record<string, number> }) {
  const kpis = [
    {
      label: 'Total mensajes',
      value: total,
      color: 'text-gray-900 dark:text-gray-100',
    },
    {
      label: 'Recibidos',
      value: porEstado.received || 0,
      color: 'text-blue-600',
    },
    {
      label: 'Entregados',
      value: (porEstado.delivered || 0) + (porEstado.read || 0),
      color: 'text-emerald-600',
    },
    {
      label: 'Fallidos',
      value: (porEstado.failed || 0) + (porEstado.undelivered || 0),
      color: 'text-red-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
        >
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {kpi.label}
          </p>
          <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────

export default async function WebhooksLogsPage() {
  const initialData = await getInitialData();

  const total = initialData?.total ?? 0;
  const porEstado = initialData?.porEstado ?? {};
  const initialMensajes = initialData?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Webhooks" />

      {/* KPIs (server-rendered — sin loading state) */}
      <KpiCards total={total} porEstado={porEstado} />

      {/* Tabla + filtros (client — recibe data inicial del server) */}
      <WebhooksClient initialMensajes={initialMensajes} initialTotal={total} />
    </div>
  );
}
