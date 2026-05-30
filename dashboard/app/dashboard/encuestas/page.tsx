import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, TrendingUp, TrendingDown, Minus, MessageSquare, Users, BarChart3 } from 'lucide-react';
import { EncuestasClient } from './encuestas-client';
import { PageHeader } from '@/components/page-header';

// ─── Types ────────────────────────────────────────────────

interface EncuestaApiResponse {
  data: {
    totalEncuestas: number;
    puntajePromedio: number;
    distribucion: Record<number, number>;
    ultimasSemana: number;
    tendencia: 'subiendo' | 'estable' | 'bajando';
    respuestasRecientes: Array<{
      id: string;
      pacienteId: string;
      pacienteNombre: string;
      pacienteApellido: string;
      puntaje: number;
      comentario: string;
      fecha: string;
    }>;
  };
}

// ─── Data fetching ─────────────────────────────────────────

/** Forzar renderizado dinámico */
export const dynamic = 'force-dynamic';

async function getSurveyStats(): Promise<EncuestaApiResponse | null> {
  try {
    const res = await fetch('http://localhost:3000/api/encuestas', {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── KPI Cards ─────────────────────────────────────────────

function TendenciaBadge({ tendencia }: { tendencia: string }) {
  if (tendencia === 'subiendo') {
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
        <TrendingUp className="h-3 w-3 mr-1" />
        Subiendo
      </Badge>
    );
  }
  if (tendencia === 'bajando') {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
        <TrendingDown className="h-3 w-3 mr-1" />
        Bajando
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
      <Minus className="h-3 w-3 mr-1" />
      Estable
    </Badge>
  );
}

function KpiCards({ stats }: { stats: EncuestaApiResponse['data'] }) {
  const kpis = [
    {
      label: 'Total Encuestas',
      value: stats.totalEncuestas,
      icon: BarChart3,
      color: 'text-blue-600',
    },
    {
      label: 'Puntaje Promedio',
      value: stats.puntajePromedio,
      suffix: '/5',
      icon: Star,
      color: 'text-amber-500',
    },
    {
      label: 'Última Semana',
      value: stats.ultimasSemana,
      icon: MessageSquare,
      color: 'text-emerald-600',
    },
    {
      label: 'Tendencia',
      value: '',
      custom: <TendenciaBadge tendencia={stats.tendencia} />,
      icon: TrendingUp,
      color: 'text-gray-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {kpi.label}
              </p>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <div className="mt-2">
              {kpi.custom ? (
                kpi.custom
              ) : (
                <p className={`text-2xl font-bold ${kpi.color}`}>
                  {kpi.value}{kpi.suffix || ''}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Distribución de puntajes ──────────────────────────────

function DistribucionSection({ distribucion }: { distribucion: Record<number, number> }) {
  const maxValor = Math.max(...Object.values(distribucion), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Distribución de Puntajes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((puntaje) => {
            const cantidad = distribucion[puntaje] || 0;
            const porcentaje = maxValor > 0 ? (cantidad / maxValor) * 100 : 0;
            const labels: Record<number, string> = {
              5: 'Excelente',
              4: 'Bueno',
              3: 'Regular',
              2: 'Malo',
              1: 'Muy malo',
            };
            return (
              <div key={puntaje} className="flex items-center gap-3">
                <span className="text-sm font-medium w-20 shrink-0">{labels[puntaje]}</span>
                <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      puntaje >= 4 ? 'bg-emerald-500' :
                      puntaje >= 3 ? 'bg-amber-400' :
                      'bg-red-400'
                    }`}
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-8 text-right">{cantidad}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────

export default async function EncuestasPage() {
  const apiData = await getSurveyStats();
  const stats = apiData?.data ?? null;

  if (!stats) {
    return (
      <div className="space-y-6">
        <PageHeader title="Encuestas" description="No hay datos de encuestas disponibles." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Encuestas" description="Resultados de encuestas post-consulta enviadas por WhatsApp" />

      {/* KPIs */}
      <KpiCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribución */}
        <div className="lg:col-span-1">
          <DistribucionSection distribucion={stats.distribucion} />
        </div>

        {/* Respuestas recientes (client component) */}
        <div className="lg:col-span-2">
          <EncuestasClient respuestas={stats.respuestasRecientes} />
        </div>
      </div>
    </div>
  );
}
