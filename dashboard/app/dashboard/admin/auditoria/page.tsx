'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Shield, ArrowLeft, ArrowRight, Filter } from 'lucide-react';

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
const ENTIDADES = ['paciente', 'turno', 'conversacion', 'mensaje', 'receta', 'credencial', 'usuario', 'reporte', 'historial_medico', 'configuracion'];

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  logout: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  view: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  edit: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  export: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  config: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
};

export default function AdminAuditoriaPage() {
  const { data: session } = useSession();

  if (session?.user?.role !== 'admin') {
    redirect('/dashboard');
  }

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
    ? logs.filter(l =>
        l.detalle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.usuarioNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.usuarioEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.entidadId?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : logs;

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Shield className="h-7 w-7" />
            Auditoría
          </h1>
          <p className="text-muted-foreground mt-1">
            Registro de accesos y acciones del sistema
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          {total} registros
        </Badge>
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
            <select
              value={filtroAccion}
              onChange={(e) => { setFiltroAccion(e.target.value === ' ' ? '' : e.target.value); setOffset(0); }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-[160px]"
            >
              <option value=" ">Acción</option>
              {ACCIONES.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select
              value={filtroEntidad}
              onChange={(e) => { setFiltroEntidad(e.target.value === ' ' ? '' : e.target.value); setOffset(0); }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-[180px]"
            >
              <option value=" ">Entidad</option>
              {ENTIDADES.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
            <Button variant="outline" size="sm" className="h-9" onClick={() => { setFiltroAccion(''); setFiltroEntidad(''); setSearchTerm(''); setOffset(0); }}>
              Limpiar
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
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Acción</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Entidad</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Usuario</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Detalle</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                        {format(new Date(log.createdAt), 'dd/MM/yy HH:mm', { locale: es })}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge className={`font-mono text-[10px] uppercase ${ACTION_COLORS[log.accion] || ''}`} variant="outline">
                          {log.accion}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs font-medium">{log.entidad}</span>
                        {log.entidadId && (
                          <span className="text-[10px] text-muted-foreground ml-1">#{log.entidadId.slice(0, 8)}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {log.usuarioNombre || log.usuarioEmail || <span className="text-muted-foreground">—</span>}
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
    </div>
  );
}
