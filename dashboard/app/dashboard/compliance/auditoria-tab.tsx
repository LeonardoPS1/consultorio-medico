'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, ChevronLeft, ChevronRight, Download, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AccesoAuditoria } from './types';

interface Props {
  initialData: { accesos: AccesoAuditoria[]; paginacion: any } | null;
}

export function AuditoriaTab({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(false);
  const [filtros, setFiltros] = useState({
    accion: '',
    entidad: '',
    usuarioId: '',
    desde: '',
    hasta: '',
    busqueda: '',
  });
  const [pagina, setPagina] = useState(1);

  const fetchData = useCallback(async (p: number = 1) => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        pagina: String(p),
        limite: '50',
      });
      if (filtros.accion) params.set('accion', filtros.accion);
      if (filtros.entidad) params.set('entidad', filtros.entidad);
      if (filtros.usuarioId) params.set('usuarioId', filtros.usuarioId);
      if (filtros.desde) params.set('desde', filtros.desde);
      if (filtros.hasta) params.set('hasta', filtros.hasta);

      const res = await fetch(`/api/auditoria-accesos?${params.toString()}`);
      if (!res.ok) throw new Error('Error fetching');
      const json = await res.json();
      setData(json.data);
      setPagina(p);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  const handleFiltroChange = (key: string, value: string) => {
    setFiltros((prev) => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        accion: filtros.accion || '',
        entidad: filtros.entidad || '',
        usuarioId: filtros.usuarioId || '',
        desde: filtros.desde || '',
        hasta: filtros.hasta || '',
        limite: '10000',
      });
      const res = await fetch(`/api/auditoria-accesos/exportar?${params.toString()}`);
      if (!res.ok) throw new Error('Error exportando');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auditoria_accesos_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Error al exportar');
    }
  };

  const accesos = data?.accesos || [];
  const paginacion = data?.paginacion;

  const accionesUnicas = accesos.map((a) => a.accion).filter(Boolean);
  const entidadesUnicas = accesos.map((a) => a.entidad).filter(Boolean);

  if (loading && !initialData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6 text-center text-destructive">
          <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin" />
          <p>Error al cargar datos. Intentá de nuevo.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-muted-foreground mb-1">Buscar en detalle</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filtrar por detalle..."
              value={filtros.busqueda}
              onChange={(e) => handleFiltroChange('busqueda', e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex gap-2 min-w-[200px]">
          <select
            value={filtros.accion}
            onChange={(e) => handleFiltroChange('accion', e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todas las acciones</option>
            {Array.from(new Set(accionesUnicas)).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            value={filtros.entidad}
            onChange={(e) => handleFiltroChange('entidad', e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todas las entidades</option>
            {Array.from(new Set(entidadesUnicas)).map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 min-w-[300px]">
          <input
            type="date"
            value={filtros.desde}
            onChange={(e) => handleFiltroChange('desde', e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Desde"
          />
          <input
            type="date"
            value={filtros.hasta}
            onChange={(e) => handleFiltroChange('hasta', e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Hasta"
          />
        </div>

        <div className="flex gap-2 ml-auto">
          <button
            onClick={handleExport}
            className="px-3 py-2 text-sm border rounded-md bg-background hover:bg-muted transition-colors flex items-center gap-2"
            disabled={!accesos.length}
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-muted-foreground">Acción</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Entidad</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">ID Entidad</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Detalle</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Usuario</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">IP</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {accesos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay accesos registrados con los filtros actuales
                    </td>
                  </tr>
                ) : (
                  accesos.map((acceso) => (
                    <tr key={acceso.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2">
                        <Badge variant="outline" className="text-xs">
                          {acceso.accion}
                        </Badge>
                      </td>
                      <td className="py-2 font-mono text-xs">{acceso.entidad}</td>
                      <td className="py-2 font-mono text-xs text-muted-foreground">
                        {acceso.entidadId || '—'}
                      </td>
                      <td className="py-2 text-sm max-w-[300px] truncate block">
                        {acceso.detalle || '—'}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-sm">
                            {acceso.usuarioNombre || 'Sistema'}
                          </span>
                          {acceso.usuarioEmail && (
                            <span className="text-xs text-muted-foreground">{acceso.usuarioEmail}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 font-mono text-xs text-muted-foreground">
                        {acceso.ip || '—'}
                      </td>
                      <td className="py-2 text-sm whitespace-nowrap">
                        {format(new Date(acceso.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {paginacion && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Mostrando {((pagina - 1) * 50) + 1} a {Math.min(pagina * 50, paginacion.total)} de{' '}
            {paginacion.total} registros
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => fetchData(pagina - 1)}
              disabled={pagina === 1 || loading}
              className="px-3 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => fetchData(pagina + 1)}
              disabled={!paginacion.hayMas || loading}
              className="px-3 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}