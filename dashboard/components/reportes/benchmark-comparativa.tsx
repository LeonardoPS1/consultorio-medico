'use client';

import { ShieldCheck, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface BenchComparativaResponse {
  tenantId: string;
  pacientesActivos: number;
  totalTurnos: number;
  noShowRate: number;
  ocupacion: number;
  nps: number | null;
  bucketLabel: string;
  bucketRange: string;
  promedioBucket: {
    bucketLabel: string;
    bucketRange: string;
    tenantCount: number;
    avgNoShow: number;
    avgOcupacion: number;
    avgNps: number | null;
  } | null;
  diferenciaNoShow: number | null;
  diferenciaOcupacion: number | null;
  diferenciaNps: number | null;
  minimoCumplido: boolean;
  umbralTenants: number;
  _fuente: 'real' | 'demo';
}

interface Props {
  data: BenchComparativaResponse | null;
  loading: boolean;
  isAdvancedReports: boolean;
}

/**
 *
 * @param root0
 * @param root0.data
 * @param root0.loading
 * @param root0.isAdvancedReports
 */
export function BenchmarkComparativa({ data, loading, isAdvancedReports }: Props) {
  function fmtPct(v: number | null | undefined): string {
    if (v == null) return '—';
    return `${v.toFixed(1)}%`;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Benchmark anónimo entre clínicas</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 w-full max-w-xs bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isAdvancedReports) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Benchmark anónimo entre clínicas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Disponible en planes Professional o superiores.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Benchmark anónimo entre clínicas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No se pudieron cargar los datos de benchmark.</p>
        </CardContent>
      </Card>
    );
  }

  const prom = data.promedioBucket;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Benchmark anónimo entre clínicas"
        description="Comparás tu clínica contra el promedio de clínicas similares (misma escala de pacientes). Datos agregados y anónimos."
      />

      {!data.minimoCumplido && prom == null ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <ShieldCheck className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Aún no hay suficientes clínicas similares para comparar.
            </p>
            <p className="text-xs text-muted-foreground">
              Necesitamos al menos {data.umbralTenants} clínicas del mismo rango
              ({data.bucketLabel}, {data.bucketRange} pacientes) para generar un promedio anónimo.
              Tu clínica está en el rango <strong>{data.bucketLabel}</strong>
              ({data.pacientesActivos} pacientes activos).
            </p>
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800">
              Tu clínica ({data.bucketLabel}, {data.bucketRange})
            </Badge>
            <Badge variant="secondary">Promedio de {prom?.tenantCount ?? 0} clínicas similares</Badge>
            {data._fuente === 'demo' && (
              <Badge variant="outline" className="text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800">
                ⚡ Datos demo
              </Badge>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard
              title="Tasa de No-Show"
              miValor={fmtPct(data.noShowRate)}
              promValor={fmtPct(prom?.avgNoShow ?? null)}
              diferencia={data.diferenciaNoShow}
              invert
            />
            <StatCard
              title="Ocupación"
              miValor={fmtPct(data.ocupacion)}
              promValor={fmtPct(prom?.avgOcupacion ?? null)}
              diferencia={data.diferenciaOcupacion}
            />
            <StatCard
              title="NPS"
              miValor={data.nps == null ? '—' : String(data.nps)}
              promValor={prom?.avgNps == null ? '—' : String(prom.avgNps)}
              diferencia={data.diferenciaNps}
              fmt={(v) => (v == null ? '—' : String(Math.round(v)))}
            />
            <StatCard
              title="Pacientes activos"
              miValor={String(data.pacientesActivos)}
              promValor="—"
              diferencia={null}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tu clínica vs. promedio de similares</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <BarraComparativa
                label="No-Show rate"
                mi={data.noShowRate}
                prom={prom?.avgNoShow ?? 0}
                invert
                max={80}
              />
              <BarraComparativa
                label="Ocupación"
                mi={data.ocupacion}
                prom={prom?.avgOcupacion ?? 0}
                max={100}
              />
              <BarraComparativa
                label="NPS"
                mi={data.nps ?? 0}
                prom={prom?.avgNps ?? 0}
                max={100}
                min={-100}
              />
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Detalle metodológico
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div>
                <span className="font-medium">Ventana analizada:</span> últimos 90 días
              </div>
              <div>
                <span className="font-medium">No-show rate =</span> no_asistio / (completada + no_asistio)
              </div>
              <div>
                <span className="font-medium">Ocupación =</span> (completada + no_asistio) / (completada + no_asistio + cancelada)
              </div>
              <div>
                <span className="font-medium">NPS =</span> (promotores 5 − detractores 1-2) / respondentes × 100
              </div>
              <div>
                <span className="font-medium">Rangos de tamaño:</span> 0-99 (pequeña), 100-499 (mediana),
                500-1499 (grande), 1500+ (muy grande)
              </div>
              <div className="text-xs text-muted-foreground">
                Para proteger tu privacidad, un promedio solo se muestra cuando un bucket contiene al menos{' '}
                {data.umbralTenants} clínicas. Los datos se calculan de forma anónima y agregada; nunca se
                expone información de un tenant individual.
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  miValor,
  promValor,
  diferencia,
  invert,
  fmt,
}: {
  title: string;
  miValor: string;
  promValor: string;
  diferencia: number | null;
  invert?: boolean;
  fmt?: (v: number) => string;
}) {
  const bueno =
    diferencia == null
      ? null
      : invert
        ? diferencia < 0
        : diferencia > 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold">{miValor}</div>
        <div className="flex items-center gap-1.5 mt-1">
          {diferencia == null ? (
            <span className="text-xs text-muted-foreground">sin comparación</span>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">Prom: {promValor}</span>
              <span className="flex items-center gap-1 text-xs font-medium">
                {bueno ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={bueno ? 'text-emerald-600' : 'text-red-600'}>
                  {diferencia > 0 ? '+' : ''}
                  {fmt ? fmt(diferencia) : `${diferencia.toFixed(2)} pp`}
                </span>
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default BenchmarkComparativa;


function BarraComparativa({
  label,
  mi,
  prom,
  invert,
  max = 100,
  min = 0,
}: {
  label: string;
  mi: number;
  prom: number;
  invert?: boolean;
  max?: number;
  min?: number;
}) {
  const rango = max - min;
  const pct = (v: number) => {
    const norm = (v - min) / rango;
    return Math.max(0, Math.min(1, norm)) * 100;
  };
  const better = invert ? mi < prom : mi > prom;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          ({better ? 'mejor' : 'peor'} que el promedio)
        </span>
      </div>
      <div className="relative h-5 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute inset-0 bg-muted rounded-full"
          style={{ width: `${pct(prom)}%` }}
        />
        <div className="relative h-5">
          <div
            className={`absolute top-0 h-5 rounded-full ${invert ? 'bg-amber-500' : 'bg-emerald-500'} opacity-70`}
            style={{ width: `${pct(mi)}%`, left: 0 }}
          />
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Tú: {mi.toFixed(1)}</span>
        <span>Prom: {prom.toFixed(1)}</span>
      </div>
    </div>
  );
}
