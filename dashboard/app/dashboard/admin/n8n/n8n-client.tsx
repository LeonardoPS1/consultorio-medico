'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2,
  Network,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────

interface N8nStats {
  totalWorkflows: number;
  activeWorkflows: number;
  errorsLast24h: number;
  successfulExecutions24h: number;
}

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface N8nExecution {
  id: string;
  workflowId: string;
  workflowName?: string;
  status: 'success' | 'error' | 'waiting';
  startedAt: string;
  stoppedAt?: string;
  mode?: string;
}

interface WorkflowLog {
  id: string;
  workflowId: string;
  workflowName?: string;
  executionId?: string;
  nivel: string;
  mensaje: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface WorkflowError {
  id: string;
  workflowId: string;
  executionId?: string;
  nodo?: string;
  codigo?: string;
  mensajeError?: string;
  detalle?: Record<string, unknown>;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  waiting: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

const LEVEL_BADGE: Record<string, string> = {
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  warn: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  debug: 'bg-muted text-muted-foreground',
};

// ─── Component ────────────────────────────────────────────

interface Props {
  initialStats: N8nStats;
}

export default function N8nClient({ initialStats }: Props) {
  const [tab, setTab] = useState('workflows');

  // Data
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [executions, setExecutions] = useState<N8nExecution[]>([]);
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [errors, setErrors] = useState<WorkflowError[]>([]);
  const [stats, setStats] = useState<N8nStats>(initialStats);
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);

  // Pagination / Filters
  const [logOffset, setLogOffset] = useState(0);
  const [logTotal, setLogTotal] = useState(0);
  const [logFilterNivel, setLogFilterNivel] = useState('');
  const [errorOffset, setErrorOffset] = useState(0);
  const [errorTotal, setErrorTotal] = useState(0);

  // Loading & Errors
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [loadingExecutions, setLoadingExecutions] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingErrors, setLoadingErrors] = useState(false);
  const [errorWorkflows, setErrorWorkflows] = useState<string | null>(null);
  const [errorExecutions, setErrorExecutions] = useState<string | null>(null);

  const limit = 50;

  // ─── Fetch functions ────────────────────────────────────

  const fetchWorkflows = useCallback(async () => {
    setLoadingWorkflows(true);
    setErrorWorkflows(null);
    try {
      const res = await fetch('/api/admin/n8n/workflows');
      const json = await res.json();
      if (!res.ok) {
        setErrorWorkflows(json.error || 'Error al cargar workflows');
        setWorkflows([]);
      } else {
        setWorkflows(json.data || []);
      }
    } catch {
      setErrorWorkflows('Error de conexión con el servidor');
      setWorkflows([]);
    } finally {
      setLoadingWorkflows(false);
    }
  }, []);

  const fetchExecutions = useCallback(async () => {
    setLoadingExecutions(true);
    setErrorExecutions(null);
    try {
      const res = await fetch('/api/admin/n8n/executions?limit=50');
      const json = await res.json();
      if (!res.ok) {
        setErrorExecutions(json.error || 'Error al cargar ejecuciones');
        setExecutions([]);
      } else {
        setExecutions(json.data || []);
      }
    } catch {
      setErrorExecutions('Error de conexión con el servidor');
      setExecutions([]);
    } finally {
      setLoadingExecutions(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(logOffset),
      });
      if (logFilterNivel) params.set('nivel', logFilterNivel);

      const res = await fetch(`/api/admin/n8n/logs?${params}`);
      const json = await res.json();
      setLogs(json.logs || []);
      setLogTotal(json.total || 0);
    } catch {
      setLogs([]);
      setLogTotal(0);
    } finally {
      setLoadingLogs(false);
    }
  }, [logOffset, logFilterNivel]);

  const fetchErrors = useCallback(async () => {
    setLoadingErrors(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(errorOffset),
      });
      const res = await fetch(`/api/admin/n8n/errors?${params}`);
      const json = await res.json();
      setErrors(json.errors || []);
      setErrorTotal(json.total || 0);
    } catch {
      setErrors([]);
      setErrorTotal(0);
    } finally {
      setLoadingErrors(false);
    }
  }, [errorOffset]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/n8n/stats');
      const json = await res.json();
      if (json.data) setStats(json.data);
    } catch {
      // silent
    }
  }, []);

  // ─── Effects ────────────────────────────────────────────

  useEffect(() => {
    fetchWorkflows();
    fetchExecutions();
    fetchStats();
  }, [fetchWorkflows, fetchExecutions, fetchStats]);

  useEffect(() => {
    if (tab === 'logs') fetchLogs();
  }, [tab, fetchLogs]);

  useEffect(() => {
    if (tab === 'errors') fetchErrors();
  }, [tab, fetchErrors]);

  // ─── Pagination helpers ─────────────────────────────────

  const logTotalPages = Math.ceil(logTotal / limit);
  const logCurrentPage = Math.floor(logOffset / limit) + 1;
  const errorTotalPages = Math.ceil(errorTotal / limit);
  const errorCurrentPage = Math.floor(errorOffset / limit) + 1;

  // ─── Render ─────────────────────────────────────────────

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWorkflows}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-500 font-medium">{stats.activeWorkflows}</span> activos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Workflows Activos</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeWorkflows}</div>
            <p className="text-xs text-muted-foreground mt-1">de {stats.totalWorkflows} totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ejecuciones (24h)</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successfulExecutions24h}</div>
            <p className="text-xs text-muted-foreground mt-1">exitosas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Errores (24h)</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.errorsLast24h}</div>
            <p className="text-xs text-muted-foreground mt-1">últimas 24h</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="workflows" className="gap-2">
            <Network className="h-4 w-4" />
            <span className="hidden sm:inline">Workflows</span>
          </TabsTrigger>
          <TabsTrigger value="ejecuciones" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Ejecuciones</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Logs</span>
          </TabsTrigger>
          <TabsTrigger value="errores" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Errores</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab: Workflows ─────────────────────────── */}
        <TabsContent value="workflows" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loadingWorkflows ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : workflows.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Network className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  {errorWorkflows ? (
                    <>
                      <p className="text-red-500 font-medium">Error al cargar workflows</p>
                      <p className="text-xs mt-1 max-w-md mx-auto text-balance">{errorWorkflows}</p>
                    </>
                  ) : (
                    <>
                      <p>No hay workflows</p>
                      <p className="text-xs mt-1">Crea workflows en n8n para verlos aquí</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left font-medium text-muted-foreground px-4 py-3">
                          Nombre
                        </th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3">
                          Estado
                        </th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3">
                          Creado
                        </th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3">
                          Actualizado
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {workflows.map((wf) => (
                        <>
                          <tr
                            key={wf.id}
                            className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() =>
                              setExpandedWorkflow(expandedWorkflow === wf.id ? null : wf.id)
                            }
                          >
                            <td className="px-4 py-2.5 font-medium">{wf.name}</td>
                            <td className="px-4 py-2.5">
                              <Badge
                                variant={wf.active ? 'default' : 'secondary'}
                                className={
                                  wf.active
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : ''
                                }
                              >
                                {wf.active ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">
                              {format(new Date(wf.createdAt), 'dd/MM/yy HH:mm', { locale: es })}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">
                              {format(new Date(wf.updatedAt), 'dd/MM/yy HH:mm', { locale: es })}
                            </td>
                          </tr>
                          {expandedWorkflow === wf.id && (
                            <tr key={`${wf.id}-detail`} className="bg-muted/20">
                              <td colSpan={4} className="px-6 py-4">
                                <div className="text-sm space-y-1">
                                  <p>
                                    <span className="font-medium text-muted-foreground">ID:</span>{' '}
                                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                      {wf.id}
                                    </code>
                                  </p>
                                  <p>
                                    <span className="font-medium text-muted-foreground">
                                      Nombre:
                                    </span>{' '}
                                    {wf.name}
                                  </p>
                                  <p>
                                    <span className="font-medium text-muted-foreground">
                                      Estado:
                                    </span>{' '}
                                    {wf.active ? 'Activo' : 'Inactivo'}
                                  </p>
                                  <p>
                                    <span className="font-medium text-muted-foreground">
                                      Creado:
                                    </span>{' '}
                                    {format(new Date(wf.createdAt), 'dd/MM/yyyy HH:mm:ss', {
                                      locale: es,
                                    })}
                                  </p>
                                  <p>
                                    <span className="font-medium text-muted-foreground">
                                      Última actualización:
                                    </span>{' '}
                                    {format(new Date(wf.updatedAt), 'dd/MM/yyyy HH:mm:ss', {
                                      locale: es,
                                    })}
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab: Ejecuciones ──────────────────────────── */}
        <TabsContent value="ejecuciones" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loadingExecutions ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : executions.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  {errorExecutions ? (
                    <>
                      <p className="text-red-500 font-medium">Error al cargar ejecuciones</p>
                      <p className="text-xs mt-1 max-w-md mx-auto text-balance">{errorExecutions}</p>
                    </>
                  ) : (
                    <>
                      <p>No hay ejecuciones recientes</p>
                      <p className="text-xs mt-1">Las ejecuciones aparecen aquí cuando los workflows se ejecuten</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left font-medium text-muted-foreground px-4 py-3">
                          ID
                        </th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3">
                          Workflow
                        </th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3">
                          Estado
                        </th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3">
                          Inicio
                        </th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3">
                          Duración
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {executions.map((ex) => {
                        const start = new Date(ex.startedAt);
                        const stop = ex.stoppedAt ? new Date(ex.stoppedAt) : null;
                        const duration = stop
                          ? `${Math.round((stop.getTime() - start.getTime()) / 1000)}s`
                          : '—';
                        return (
                          <tr
                            key={ex.id}
                            className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">
                              {ex.id.slice(0, 8)}...
                            </td>
                            <td className="px-4 py-2.5 font-medium">{ex.workflowName || '—'}</td>
                            <td className="px-4 py-2.5">
                              <Badge
                                className={`font-mono text-[10px] uppercase ${STATUS_BADGE[ex.status] || ''}`}
                                variant="outline"
                              >
                                {ex.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">
                              {format(start, 'dd/MM/yy HH:mm:ss', { locale: es })}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">
                              {duration}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab: Logs ────────────────────────────────── */}
        <TabsContent value="logs" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <Select
              value={logFilterNivel || 'all'}
              onValueChange={(v) => {
                setLogFilterNivel(v === 'all' ? '' : v);
                setLogOffset(0);
              }}
            >
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Nivel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {logTotal} logs
            </Badge>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingLogs ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No hay logs</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left font-medium text-muted-foreground px-4 py-3">
                          Fecha
                        </th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3">
                          Workflow
                        </th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3">
                          Nivel
                        </th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3">
                          Mensaje
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr
                          key={log.id}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                            {format(new Date(log.createdAt), 'dd/MM/yy HH:mm:ss', { locale: es })}
                          </td>
                          <td className="px-4 py-2.5 text-xs font-medium">
                            {log.workflowName || log.workflowId.slice(0, 8)}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge
                              className={`font-mono text-[10px] uppercase ${LEVEL_BADGE[log.nivel] || ''}`}
                              variant="outline"
                            >
                              {log.nivel}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[400px] truncate">
                            {log.mensaje}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Paginación logs */}
          {logTotal > limit && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {logCurrentPage} de {logTotalPages} ({logTotal} registros)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={logOffset === 0}
                  onClick={() => setLogOffset(Math.max(0, logOffset - limit))}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={logOffset + limit >= logTotal}
                  onClick={() => setLogOffset(logOffset + limit)}
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── Tab: Errores ─────────────────────────────── */}
        <TabsContent value="errores" className="mt-4 space-y-4">
          <div>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {errorTotal} errores
            </Badge>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingErrors ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : errors.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No hay errores registrados</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left font-medium text-muted-foreground px-4 py-3">
                          Fecha
                        </th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3">
                          Workflow
                        </th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3">
                          Nodo
                        </th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3">
                          Código
                        </th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3">
                          Error
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {errors.map((err) => (
                        <tr
                          key={err.id}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                            {format(new Date(err.createdAt), 'dd/MM/yy HH:mm:ss', { locale: es })}
                          </td>
                          <td className="px-4 py-2.5 text-xs font-medium">
                            {err.workflowId.slice(0, 8)}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {err.nodo || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">
                            {err.codigo || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-red-600 dark:text-red-400 max-w-[300px] truncate">
                            {err.mensajeError || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Paginación errores */}
          {errorTotal > limit && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {errorCurrentPage} de {errorTotalPages} ({errorTotal} registros)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={errorOffset === 0}
                  onClick={() => setErrorOffset(Math.max(0, errorOffset - limit))}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={errorOffset + limit >= errorTotal}
                  onClick={() => setErrorOffset(errorOffset + limit)}
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
