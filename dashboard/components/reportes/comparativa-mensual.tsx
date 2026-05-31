'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import type { Periodo } from '@/app/dashboard/reportes/reportes-data';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ComparativaData = { kpis: { titulo: string; actual: string; anterior: string; cambio: string; cambioPct: string; up: boolean }[]; turnos: { label: string; actual: number; anterior: number }[]; intenciones: { intencion: string; actual: number; anterior: number; cambioPct: number }[]; whatsapp: { titulo: string; actual: string; anterior: string; cambio: string; up: boolean }[]; pacientesActual: number; pacientesAnterior: number; };

interface Props {
  data: ComparativaData;
  periodo: Periodo;
}

const periodoAnteriorLabel: Record<Periodo, string> = {
  semana: 'Semana anterior',
  mes: 'Mes anterior',
  año: 'Año anterior',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-foreground text-background text-xs rounded-lg px-3 py-2 shadow-card border border-border/50">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color }} />
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

export default function ComparativaMensual({ data, periodo }: Props) {
  const pALabel = periodoAnteriorLabel[periodo];

  return (
    <div className="space-y-6">
      {/* KPIs Comparativos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {data.kpis.map((kpi) => (
          <Card key={kpi.titulo} className="transition-all hoverable:hover:shadow-card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.titulo}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold">{kpi.actual}</div>
                <div className="flex items-center gap-1">
                  {kpi.up ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm font-semibold ${kpi.up ? 'text-emerald-600' : 'text-red-600'}`}>
                    {kpi.cambioPct}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[11px] text-muted-foreground border-t pt-1.5">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {kpi.actual}
                </span>
                <Minus className="h-3 w-3" />
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                  {kpi.anterior}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráfico comparativo de turnos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Turnos: Actual vs {pALabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.turnos} barGap={4} barCategoryGap="20%">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.4}
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))', strokeOpacity: 0.4 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
                <Legend
                  content={({ payload }: any) => (
                    <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground pt-2">
                      {payload?.map((entry: any, idx: number) => (
                        <span key={idx} className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color }} />
                          {entry.value}
                        </span>
                      ))}
                    </div>
                  )}
                />
                <Bar
                  dataKey="actual"
                  name="Actual"
                  fill="hsl(var(--primary))"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={32}
                  animationBegin={0}
                  animationDuration={300}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="anterior"
                  name={pALabel}
                  fill="hsl(142, 76%, 36%)"
                  fillOpacity={0.3}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={32}
                  animationBegin={100}
                  animationDuration={300}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Intenciones comparativas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Intenciones de mensajes: Actual vs {pALabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="pb-2 font-medium">Intención</th>
                  <th className="pb-2 font-medium text-right">Actual</th>
                  <th className="pb-2 font-medium text-right">{pALabel}</th>
                  <th className="pb-2 font-medium text-right">Cambio</th>
                </tr>
              </thead>
              <tbody>
                {data.intenciones.map((item) => {
                  const isUp = item.cambioPct > 0;
                  return (
                    <tr key={item.intencion} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 font-medium">{item.intencion}</td>
                      <td className="py-2.5 text-right font-semibold">{item.actual}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{item.anterior}</td>
                      <td className="py-2.5 text-right">
                        <span className={`inline-flex items-center gap-0.5 font-medium ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isUp ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {item.cambioPct > 0 ? '+' : ''}{item.cambioPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp comparativo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {data.whatsapp.map((w) => (
          <Card key={w.titulo}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{w.titulo}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold">{w.actual}</div>
                <div className="flex items-center gap-1">
                  {w.up ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm font-semibold ${w.up ? 'text-emerald-600' : 'text-red-600'}`}>
                    {w.cambio}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 border-t pt-1.5">
                {pALabel}: <span className="font-medium">{w.anterior}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumen pacientes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumen de Pacientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center p-4 rounded-lg bg-primary/5">
              <p className="text-3xl font-bold text-primary">{data.pacientesActual}</p>
              <p className="text-xs text-muted-foreground mt-1">Pacientes actuales</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <p className="text-3xl font-bold text-muted-foreground">{data.pacientesAnterior}</p>
              <p className="text-xs text-muted-foreground mt-1">{pALabel}</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mt-4 text-sm">
            <span className="text-muted-foreground">Diferencia:</span>
            <span className={`font-semibold flex items-center gap-1 ${data.pacientesActual >= data.pacientesAnterior ? 'text-emerald-600' : 'text-red-600'}`}>
              {data.pacientesActual >= data.pacientesAnterior ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {data.pacientesActual >= data.pacientesAnterior ? '+' : ''}
              {data.pacientesActual - data.pacientesAnterior}
              {' '}
              ({((data.pacientesActual - data.pacientesAnterior) / data.pacientesAnterior * 100).toFixed(1)}%)
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
