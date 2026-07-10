import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  MessageSquare,
  Users,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Meh,
} from 'lucide-react';
import { EncuestasClient } from './encuestas-client';
import { PageHeader } from '@/components/page-header';
import { EvolucionEncuestasChart } from '@/components/charts/evolucion-encuestas-chart';

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
      medicoNombre?: string;
      puntaje: number;
      comentario: string;
      sentimiento?: 'positivo' | 'neutral' | 'negativo';
      sentimientoScore?: number;
      fecha: string;
    }>;
    evolucionMensual: Array<{ mes: string; promedio: number; cantidad: number }>;
    sentimientoDistribucion: {
      positivo: number;
      neutral: number;
      negativo: number;
    };
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
      <Badge
        variant="outline"
        className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
      >
        <TrendingUp className="h-3 w-3 mr-1" />
        Subiendo
      </Badge>
    );
  }
  if (tendencia === 'bajando') {
    return (
      <Badge
        variant="outline"
        className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
      >
        <TrendingDown className="h-3 w-3 mr-1" />
        Bajando
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="bg-muted text-muted-foreground border-border"
    >
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
                  {kpi.value}
                  {kpi.suffix || ''}
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
className={`h-full rounded-full transition-[width] duration-500 ${
                       puntaje >= 4 ? 'bg-emerald-500' : puntaje >= 3 ? 'bg-amber-400' : 'bg-red-400'
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

// ─── Sentimiento ───────────────────────────────────────────

function SentimientoSection({
  distribucion,
}: {
  distribucion: { positivo: number; neutral: number; negativo: number };
}) {
  const total = distribucion.positivo + distribucion.neutral + distribucion.negativo;
  const items = [
    {
      label: 'Positivo',
      value: distribucion.positivo,
      icon: ThumbsUp,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    },
    {
      label: 'Neutral',
      value: distribucion.neutral,
      icon: Meh,
      color: 'bg-amber-400',
      textColor: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950',
    },
    {
      label: 'Negativo',
      value: distribucion.negativo,
      icon: ThumbsDown,
      color: 'bg-red-400',
      textColor: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950',
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Análisis de Sentimiento (IA)</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Star className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground/60">
              El análisis de sentimiento aparece automáticamente cuando los pacientes dejan
              comentarios
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const porcentaje = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <item.icon className={`h-4 w-4 ${item.textColor}`} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{item.value}</span>
                      <span className="text-xs text-muted-foreground">({porcentaje}%)</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ${item.color}`}
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
      <PageHeader
        title="Encuestas"
        description="Resultados de encuestas post-consulta enviadas por WhatsApp"
      />

      {/* KPIs */}
      <KpiCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribución */}
        <div className="lg:col-span-1">
          <DistribucionSection distribucion={stats.distribucion} />
        </div>

        {/* Sentimiento */}
        <div className="lg:col-span-2">
          <SentimientoSection distribucion={stats.sentimientoDistribucion} />
        </div>
      </div>

      {/* Evolución mensual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Evolución del Promedio Mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <EvolucionEncuestasChart data={stats.evolucionMensual} />
        </CardContent>
      </Card>

      {/* Respuestas recientes (client component) */}
      <EncuestasClient respuestas={stats.respuestasRecientes} />
    </div>
  );
}
