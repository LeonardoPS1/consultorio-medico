'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'motion/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, TrendingDown, Calendar, AlertTriangle, Users, Shield, FileText, Search } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import type { ComplianceData, Periodo, AccesoAuditoria, SolicitudARCO } from './types';
import { AuditoriaTab } from './auditoria-tab';
import { ArcOTab } from './arco-tab';

const TiempoChart = dynamic(() => import('@/components/charts/compliance-tiempo-chart'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-lg bg-muted" />,
});
const MedicosChart = dynamic(() => import('@/components/charts/compliance-medicos-chart'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-lg bg-muted" />,
});

interface Props {
  initialData: ComplianceData | null;
  initialAuditoriaData: { accesos: AccesoAuditoria[]; paginacion: any } | null;
  initialArcData: { solicitudes: SolicitudARCO[]; paginacion: any } | null;
}

export function ComplianceClient({ initialData, initialAuditoriaData, initialArcData }: Props) {
  const [activeTab, setActiveTab] = useState<'tiempos' | 'auditoria' | 'arco'>('tiempos');
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [data, setData] = useState<ComplianceData | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async (p: Periodo) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/compliance?periodo=${p}&demo=true`);
      if (!res.ok) throw new Error('Error fetching');
      const json = await res.json();
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(periodo);
  }, [periodo, fetchData]);

  const m = data?.metricas;

  const kpis = [
    {
      titulo: 'Tiempo Espera Promedio',
      valor: m ? `${m.tiempoEsperaPromedio} días` : '—',
      cambio: m ? `${m.tendenciaTiempo >= 0 ? '+' : ''}${m.tendenciaTiempo}` : '',
      up: m ? m.tendenciaTiempo <= 0 : false,
      icon: Clock,
    },
    {
      titulo: 'Cumplimiento Plazos',
      valor: m ? `${m.cumplimientoPlazos}%` : '—',
      cambio: m ? `${m.tendenciaCumplimiento >= 0 ? '+' : ''}${m.tendenciaCumplimiento}%` : '',
      up: m ? m.tendenciaCumplimiento >= 0 : false,
      icon: Calendar,
    },
    {
      titulo: 'No-Show Rate',
      valor: m ? `${m.noShowRate}%` : '—',
      cambio: '',
      up: m ? m.noShowRate <= 10 : false,
      icon: AlertTriangle,
    },
    {
      titulo: 'Cancelación Rate',
      valor: m ? `${m.cancelacionRate}%` : '—',
      cambio: '',
      up: m ? m.cancelacionRate <= 10 : false,
      icon: TrendingDown,
    },
  ];

  const tabLabels = {
    tiempos: 'Tiempos de Espera',
    auditoria: 'Registro de Accesos',
    arco: 'Solicitudes ARCO',
  };

  const tabIcons = {
    tiempos: Clock,
    auditoria: Shield,
    arco: FileText,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trazabilidad y Cumplimiento"
        description="Monitoreo de tiempos de espera, registro de accesos a datos y gestión de derechos ARCO"
        action={
          <div className="flex items-center gap-2">
            {(['mes', 'semana'] as Periodo[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  periodo === p
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {p === 'mes' ? '12 meses' : '7 días'}
              </button>
            ))}
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'tiempos' | 'auditoria' | 'arco')} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {(['tiempos', 'auditoria', 'arco'] as const).map((tab) => {
            const Icon = tabIcons[tab];
            return (
              <TabsTrigger key={tab} value={tab} className="flex items-center justify-center gap-2 text-sm">
                <Icon className="h-4 w-4" />
                {tabLabels[tab]}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="tiempos" className="space-y-6">
          {error && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="pt-6 text-center text-destructive">
                <p>Error al cargar datos. Intentá de nuevo más tarde.</p>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <div className="h-20 animate-pulse rounded-lg bg-muted" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : data ? (
            <>
              {/* KPIs */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {kpis.map((kpi, i) => {
                  const Icon = kpi.icon;
                  return (
                    <motion.div
                      key={kpi.titulo}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.05 }}
                    >
                      <Card className="relative overflow-hidden">
                        <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${kpi.up ? 'from-emerald-400 to-emerald-600' : 'from-red-400 to-red-600'}`} />
                        <CardContent className="pt-4 pb-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">{kpi.titulo}</p>
                              <p className="text-2xl font-bold tracking-tight">{kpi.valor}</p>
                              {kpi.cambio && (
                                <div className="flex items-center gap-1">
                                  {kpi.up ? (
                                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                                  ) : (
                                    <TrendingDown className="h-3 w-3 text-red-500" />
                                  )}
                                  <span className={`text-xs ${kpi.up ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {kpi.cambio}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>

              {/* Charts */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Tiempo de Espera Promedio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TiempoChart data={data.tendencias} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      Cumplimiento por Médico
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MedicosChart data={data.porMedico} />
                  </CardContent>
                </Card>
              </div>

              {/* Tabla de distribución */}
              {data.distribucionCancelacion.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      Motivos de Cancelación
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 font-medium text-muted-foreground">Motivo</th>
                            <th className="text-right py-2 font-medium text-muted-foreground">Cantidad</th>
                            <th className="text-right py-2 font-medium text-muted-foreground">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.distribucionCancelacion.map((item) => {
                            const total = data.distribucionCancelacion.reduce((s, i) => s + i.cantidad, 0);
                            return (
                              <tr key={item.motivo} className="border-b last:border-0">
                                <td className="py-2">{item.motivo}</td>
                                <td className="text-right py-2">{item.cantidad}</td>
                                <td className="text-right py-2 text-muted-foreground">
                                  {total > 0 ? Math.round((item.cantidad / total) * 100) : 0}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {data._demo && (
                <div className="text-center">
                  <Badge variant="outline" className="text-muted-foreground">
                    Datos demo — configura la conexión a DB para ver datos reales
                  </Badge>
                </div>
              )}
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="auditoria">
          <AuditoriaTab initialData={initialAuditoriaData} />
        </TabsContent>

        <TabsContent value="arco">
          <ArcOTab initialData={initialArcData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}