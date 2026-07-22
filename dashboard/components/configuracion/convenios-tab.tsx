'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import {
  Globe,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Calendar,
  Building2,
} from 'lucide-react';

interface ConvenioItem {
  id: string;
  tenantOrigenId: string;
  tenantDestinoId: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface ConveniosTabProps {
  isAdmin: boolean;
}

export default function ConveniosTab({ isAdmin }: ConveniosTabProps) {
  const [convenios, setConvenios] = useState<ConvenioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tenantDestinoId: '',
    fechaFin: '',
  });

  const loadConvenios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/convenios');
      if (res.ok) {
        const json = await res.json();
        setConvenios(json.data ?? []);
      }
    } catch {
      toast({ title: 'Error al cargar convenios', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConvenios();
  }, [loadConvenios]);

  const handleCreate = async () => {
    if (!form.tenantDestinoId) {
      toast({ title: 'Completá el ID del tenant destino', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        tenantDestinoId: form.tenantDestinoId,
      };
      if (form.fechaFin) payload.fechaFin = form.fechaFin;

      const res = await fetch('/api/convenios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al crear');
      }
      toast({ title: 'Convenio creado exitosamente' });
      setCreateOpen(false);
      setForm({ tenantDestinoId: '', fechaFin: '' });
      loadConvenios();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo crear el convenio',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleEstado = async (id: string, nuevoEstado: string) => {
    try {
      const res = await fetch(`/api/convenios/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!res.ok) throw new Error();
      toast({
        title: `Convenio ${nuevoEstado === 'activo' ? 'activado' : 'desactivado'}`,
      });
      loadConvenios();
    } catch {
      toast({ title: 'Error al actualizar estado', variant: 'destructive' });
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-CL');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Globe className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <CardTitle className="text-base">Convenios de Intercambio</CardTitle>
                <CardDescription>
                  Acuerdos entre tenants para compartir datos de pacientes mediante derivaciones
                </CardDescription>
              </div>
            </div>
            {isAdmin && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Nuevo Convenio
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {convenios.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-1">Sin convenios</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              No hay convenios de intercambio configurados. Creá un convenio para permitir
              derivaciones cross-tenant con otras organizaciones.
            </p>
            {isAdmin && (
              <Button variant="outline" className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Crear primer convenio
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {convenios.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">Convenio</span>
                    <Badge
                      variant={c.estado === 'activo' ? 'default' : 'secondary'}
                      className={c.estado === 'activo'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}
                    >
                      {c.estado === 'activo' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      Destino: {c.tenantDestinoId.substring(0, 8)}...
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Inicio: {formatDate(c.fechaInicio)}
                    </span>
                    {c.fechaFin && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Fin: {formatDate(c.fechaFin)}
                      </span>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 shrink-0 ml-4">
                    {c.estado === 'activo' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-amber-600"
                        onClick={() => toggleEstado(c.id, 'inactivo')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Desactivar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-emerald-600"
                        onClick={() => toggleEstado(c.id, 'activo')}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Activar
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Convenio de Intercambio</DialogTitle>
            <DialogDescription>
              Creá un acuerdo con otro tenant para compartir datos clínicos mediante derivaciones.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ID del Tenant Destino *</Label>
              <Input
                placeholder="UUID del tenant destino"
                value={form.tenantDestinoId}
                onChange={(e) => setForm((f) => ({ ...f, tenantDestinoId: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Ingresá el UUID del tenant con el que querés establecer el convenio.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Fecha de término (opcional)</Label>
              <Input
                type="date"
                value={form.fechaFin}
                onChange={(e) => setForm((f) => ({ ...f, fechaFin: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Convenio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
