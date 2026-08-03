import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { getMensajes } from '@/lib/data-store';
import { WebhooksClient } from './webhooks-client';

// ─── Types ────────────────────────────────────────────────

interface WebhooksApiResponse {
  success: boolean;
  data: Awaited<ReturnType<typeof getMensajes>>['mensajes'];
  total: number;
  porEstado: Record<string, number>;
}

// ─── Data fetching ─────────────────────────────────────────

/** Forzar renderizado dinámico */
export const dynamic = 'force-dynamic';

async function getInitialData(): Promise<WebhooksApiResponse | null> {
  try {
    const result = await getMensajes({ limit: 50, offset: 0 });
    return {
      success: true,
      data: result.mensajes,
      total: result.total,
      porEstado: result.porEstado,
    };
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
        <Card key={kpi.label}>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {kpi.label}
            </p>
            <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────

/**
 *
 */
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
