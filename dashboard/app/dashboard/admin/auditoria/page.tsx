'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2,
  Search,
  Shield,
  ArrowLeft,
  ArrowRight,
  Filter,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { canAccess, type FeatureId } from '@/lib/features';
import { toast } from '@/components/ui/use-toast';
import { PageHeader } from '@/components/page-header';

interface AuditEntry {
  id: string;
  usuarioId?: string;
  usuarioEmail?: string;
  usuarioNombre?: string;
  accion: string;
  entidad: string;
  entidadId?: string;
  detalle?: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

const ACCIONES = ['login', 'logout', 'view', 'create', 'edit', 'delete', 'export', 'config'];
const ENTIDADES = [
  'paciente',
  'turno',
  'conversacion',
  'mensaje',
  'receta',
  'credencial',
  'usuario',
  'reporte',
  'historial_medico',
  'configuracion',
];

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  logout: 'bg-muted text-muted-foreground',
  view: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  edit: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  export: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  config: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
};

export default function AdminAuditoriaPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') return null;
  if (session?.user?.role !== 'admin') redirect('/dashboard');

  const plan = session?.user?.plan ?? 'free';
  if (!canAccess(plan, 'auditoria')) redirect('/dashboard');

  return <AuditoriaContent />;
}

function AuditoriaContent() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [filtroEntidad, setFiltroEntidad] = useState('');
  const [filtroAccion, setFiltroAccion] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [cleanupMode, setCleanupMode] = useState<'old' | 'all'>('old');
  const [cleaning, setCleaning] = useState(false);
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (filtroEntidad) params.set('entidad', filtroEntidad);
      if (filtroAccion) params.set('accion', filtroAccion);

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [offset, filtroEntidad, filtroAccion]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = searchTerm
    ? logs.filter(
        (l) =>
          l.detalle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.usuarioNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.usuarioEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.entidadId?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : logs;

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      const params = new URLSearchParams();
      if (cleanupMode === 'all') {
        params.set('all', 'true');
      } else {
        params.set('beforeDays', '90');
      }

      const res = await fetch(`/api/admin/audit-logs?${params}`, { method: 'DELETE' });
      const data = await res.json();

      toast({
        title: 'Registros eliminados',
        description: `Se eliminaron ${data.deleted} registros de auditoría.`,
      });

      setShowCleanupDialog(false);
      fetchLogs();
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudieron limpiar los registros',
        variant: 'destructive',
      });
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Auditoría"
          description="Registro de accesos y acciones del sistema"
          gradient
        />
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm px-3 py-1">
            {total} registros
          </Badge>
          {total > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCleanupDialog(true)}
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Buscar en detalle, usuario o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>
            <Select
              value={filtroAccion || 'all'}
              onValueChange={(v) => {
                setFiltroAccion(v === 'all' ? '' : v);
                setOffset(0);
              }}
            >
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                {ACCIONES.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filtroEntidad || 'all'}
              onValueChange={(v) => {
                setFiltroEntidad(v === 'all' ? '' : v);
                setOffset(0);
              }}
            >
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="Entidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las entidades</SelectItem>
                {ENTIDADES.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => {
                setFiltroAccion('');
                setFiltroEntidad('');
                setSearchTerm('');
                setOffset(0);
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de logs */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No hay registros de auditoría</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Fecha</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Acción
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Entidad
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Usuario
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Detalle
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                        {format(new Date(log.createdAt), 'dd/MM/yy HH:mm', { locale: es })}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          className={`font-mono text-[10px] uppercase ${ACTION_COLORS[log.accion] || ''}`}
                          variant="outline"
                        >
                          {log.accion}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs font-medium">{log.entidad}</span>
                        {log.entidadId && (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            #{log.entidadId.slice(0, 8)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {log.usuarioNombre || log.usuarioEmail || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[250px] truncate">
                        {log.detalle || <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-[10px] font-mono text-muted-foreground">
                        {log.ip || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages} ({total} registros)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + limit >= total}
              onClick={() => setOffset(offset + limit)}
            >
              Siguiente
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Diálogo de limpieza */}
      <Dialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Limpiar registros de auditoría
            </DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. Los registros eliminados no se pueden recuperar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="radio"
                  name="cleanupMode"
                  checked={cleanupMode === 'old'}
                  onChange={() => setCleanupMode('old')}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">Eliminar registros antiguos</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Borra solo los registros con más de 90 días de antigüedad
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="radio"
                  name="cleanupMode"
                  checked={cleanupMode === 'all'}
                  onChange={() => setCleanupMode('all')}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    Eliminar todos los registros
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Vacía completamente la tabla de auditoría
                  </p>
                </div>
              </label>
            </div>

            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-xs text-destructive">
              <p className="font-medium mb-1">⚠️ Advertencia</p>
              <p>
                Esta operación borra {cleanupMode === 'all' ? 'todos los' : 'los'} registros de la
                base de datos. No hay forma de deshacerla.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCleanupDialog(false)}
              disabled={cleaning}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleCleanup} disabled={cleaning}>
              {cleaning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {cleanupMode === 'all' ? 'Eliminar todo' : 'Eliminar antiguos'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
