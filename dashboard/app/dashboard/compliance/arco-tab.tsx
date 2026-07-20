'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Filter, ChevronLeft, ChevronRight, FileText, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { SolicitudARCO } from './types';

interface Props {
  initialData: { solicitudes: SolicitudARCO[]; paginacion: any } | null;
}

export function ArcOTab({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(false);
  const [filtros, setFiltros] = useState({
    tipo: '',
    estado: '',
    pacienteId: '',
    busqueda: '',
  });
  const [pagina, setPagina] = useState(1);
  const [showModal, setShowModal] = useState<{ pacienteId: string; tipo: string } | null>(null);

  const fetchData = useCallback(async (p: number = 1) => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        pagina: String(p),
        limite: '50',
      });
      if (filtros.tipo) params.set('tipo', filtros.tipo);
      if (filtros.estado) params.set('estado', filtros.estado);
      if (filtros.pacienteId) params.set('pacienteId', filtros.pacienteId);

      const res = await fetch(`/api/arco?${params.toString()}`);
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

  const handleNuevaSolicitud = (pacienteId: string, tipo: string) => {
    setShowModal({ pacienteId, tipo });
  };

  const handleSubmitSolicitud = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!showModal) return;

    const formData = new FormData(e.currentTarget);
    const accion = formData.get('accion') as string;
    const motivo = formData.get('motivo') as string;

    try {
      const res = await fetch('/api/arco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: showModal.pacienteId,
          tipo: showModal.tipo,
          accion,
          motivo,
        }),
      });
      if (!res.ok) throw new Error('Error creando solicitud');
      setShowModal(null);
      fetchData(pagina);
      alert('Solicitud ARCO registrada correctamente');
    } catch {
      alert('Error al registrar la solicitud');
    }
  };

  const solicitudes = data?.solicitudes || [];
  const paginacion = data?.paginacion;

  const tiposUnicos = solicitudes.map((s) => s.tipo).filter(Boolean);

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
          <AlertCircle className="h-6 w-6 mx-auto mb-2" />
          <p>Error al cargar solicitudes ARCO. Intentá de nuevo.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-muted-foreground mb-1">Buscar paciente</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Nombre, apellido o ID..."
              value={filtros.busqueda}
              onChange={(e) => handleFiltroChange('busqueda', e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex gap-2 min-w-[200px]">
          <select
            value={filtros.tipo}
            onChange={(e) => handleFiltroChange('tipo', e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todos los tipos</option>
            {Array.from(new Set(tiposUnicos)).map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={filtros.estado}
            onChange={(e) => handleFiltroChange('estado', e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todos los estados</option>
            <option value="true">Aceptado</option>
            <option value="false">Pendiente</option>
          </select>
        </div>

        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => handleNuevaSolicitud('', 'datos')}>
            <FileText className="h-4 w-4 mr-2" />
            Nueva Solicitud ARCO
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Acción</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Paciente</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Fecha</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">IP / Origen</th>
                </tr>
              </thead>
              <tbody>
                {solicitudes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      No hay solicitudes ARCO registradas
                    </td>
                  </tr>
                ) : (
                  solicitudes.map((solicitud) => (
                    <tr key={solicitud.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2">
                        <Badge
                          variant="secondary"
                          className={
                            solicitud.tipo === 'datos'
                              ? 'bg-blue-100 text-blue-700'
                              : solicitud.tipo === 'whatsapp'
                              ? 'bg-green-100 text-green-700'
                              : solicitud.tipo === 'email'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-orange-100 text-orange-700'
                          }
                        >
                          {solicitud.tipo.charAt(0).toUpperCase() + solicitud.tipo.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-2">
                        <Badge
                          variant="secondary"
                          className={
                            solicitud.accion === 'grant'
                              ? 'bg-emerald-100 text-emerald-700'
                              : solicitud.accion === 'revoke'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                          }
                        >
                          {solicitud.accion === 'grant' ? 'Otorgar' : solicitud.accion === 'revoke' ? 'Revocar' : 'Aceptar'}
                        </Badge>
                      </td>
                      <td className="py-2">
                        <Badge variant={solicitud.aceptado ? 'default' : 'outline'}>
                          {solicitud.aceptado ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Aceptado
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              Pendiente
                            </>
                          )}
                        </Badge>
                      </td>
                      <td className="py-2">
                        <div>
                          <span className="font-medium text-sm">
                            {solicitud.pacienteNombre} {solicitud.pacienteApellido}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {solicitud.pacienteId?.slice(0, 8)}...
                          </span>
                        </div>
                      </td>
                      <td className="py-2 text-sm whitespace-nowrap">
                        {format(new Date(solicitud.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </td>
                      <td className="py-2 text-xs text-muted-foreground font-mono max-w-[200px] truncate block">
                        {solicitud.ip || '—'}
                        {solicitud.userAgent && (
                          <div className="truncate">{solicitud.userAgent}</div>
                        )}
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
            {paginacion.total} solicitudes
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchData(pagina - 1)} disabled={pagina === 1 || loading}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => fetchData(pagina + 1)} disabled={!paginacion.hayMas || loading}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Nueva Solicitud ARCO</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleSubmitSolicitud} className="space-y-4">
              <input type="hidden" name="pacienteId" value={showModal.pacienteId} />
              <input type="hidden" name="tipo" value={showModal.tipo} />
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Derecho ARCO</label>
                <select
                  name="tipo"
                  value={showModal.tipo}
                  disabled
                  className="w-full px-3 py-2 text-sm border rounded-md bg-muted"
                >
                  <option value="datos">Acceso / Rectificación / Cancelación / Oposición (Datos)</option>
                  <option value="whatsapp">Consentimiento WhatsApp</option>
                  <option value="email">Consentimiento Email</option>
                  <option value="terminos">Términos y Condiciones</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Acción</label>
                <select name="accion" required className="w-full px-3 py-2 text-sm border rounded-md bg-background">
                  <option value="grant">Otorgar / Solicitar Acceso</option>
                  <option value="revoke">Revocar / Cancelar / Oponer</option>
                  <option value="accept">Aceptar</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Motivo (opcional)</label>
                <textarea name="motivo" rows={3} className="w-full px-3 py-2 text-sm border rounded-md bg-background" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowModal(null)}>
                  Cancelar
                </Button>
                <Button type="submit">Registrar Solicitud</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}