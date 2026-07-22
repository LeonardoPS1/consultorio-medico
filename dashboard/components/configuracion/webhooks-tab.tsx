'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Edit, Play, Copy, Loader2 } from 'lucide-react';

const EVENTOS = [
  { value: 'turno.creado', label: 'Turno creado' },
  { value: 'turno.actualizado', label: 'Turno actualizado' },
  { value: 'turno.cancelado', label: 'Turno cancelado' },
  { value: 'paciente.creado', label: 'Paciente creado' },
  { value: 'paciente.actualizado', label: 'Paciente actualizado' },
  { value: 'receta.creada', label: 'Receta creada' },
  { value: 'derivacion.creada', label: 'Derivación creada' },
  { value: 'derivacion.actualizada', label: 'Derivación actualizada' },
  { value: 'pago.completado', label: 'Pago completado' },
];

interface WebhookConfigItem {
  id: string;
  evento: string;
  url: string;
  activo: boolean;
  ultimoEstado: string;
  createdAt: string;
  secret?: string;
}

interface WebhookLogItem {
  id: string;
  configId: string;
  evento: string;
  url: string;
  statusCode: number | null;
  respuesta: string | null;
  duracionMs: number | null;
  intentos: number;
  error: string | null;
  createdAt: string;
}

interface WebhookFormProps {
  initial: WebhookConfigItem | null;
  onSave: (data: { evento: string; url: string; activo: boolean }) => Promise<void>;
  onCancel: () => void;
  onRegenerateSecret?: (id: string) => void;
  regenerating?: boolean;
}

function WebhookForm({ initial, onSave, onCancel, onRegenerateSecret, regenerating }: WebhookFormProps) {
  const [evento, setEvento] = useState(initial?.evento || '');
  const [url, setUrl] = useState(initial?.url || '');
  const [activo, setActivo] = useState(initial?.activo ?? true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evento || !url) return;
    setSaving(true);
    try {
      await onSave({ evento, url, activo });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Evento</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={evento}
          onChange={(e) => setEvento(e.target.value)}
          required
        >
          <option value="" disabled>Seleccioní un evento</option>
          {EVENTOS.map((ev) => (
            <option key={ev.value} value={ev.value}>
              {ev.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>URL del endpoint</Label>
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://ejemplo.com/webhook"
          required
        />
      </div>
      <div className="flex items-center justify-between">
        <Label>Activo</Label>
        <Switch checked={activo} onCheckedChange={setActivo} />
      </div>
      {initial && onRegenerateSecret && (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRegenerateSecret(initial.id)}
            disabled={regenerating}
          >
            {regenerating ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Copy className="h-4 w-4 mr-1" />
            )}
            Regenerar secreto
          </Button>
          <p className="text-xs text-muted-foreground">
            Al regenerar el secreto, los webhooks activos dejarí de funcionar hasta que actualices el receptor.
          </p>
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!evento || !url || saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
          {initial ? 'Guardar cambios' : 'Crear webhook'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function WebhooksTab() {
  const [configs, setConfigs] = useState<WebhookConfigItem[]>([]);
  const [logs, setLogs] = useState<Record<string, WebhookLogItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<WebhookConfigItem | null>(null);
  const [showSecret, setShowSecret] = useState<string | null>(null);
  const [deletingConfig, setDeletingConfig] = useState<WebhookConfigItem | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const cargarConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/webhooks/configs');
      if (!res.ok) throw new Error('Error al cargar webhooks');
      const json = await res.json();
      setConfigs(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarLogs = useCallback(async (configId: string) => {
    try {
      const res = await fetch(`/api/webhooks/logs?configId=${configId}&limit=20`);
      if (!res.ok) return;
      const json = await res.json();
      setLogs((prev) => ({ ...prev, [configId]: json.data || [] }));
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    cargarConfigs();
  }, [cargarConfigs]);

  useEffect(() => {
    if (configs.length > 0) {
      configs.forEach((c) => cargarLogs(c.id));
    }
  }, [configs, cargarLogs]);

  const handleCreate = async (data: { evento: string; url: string; activo: boolean }) => {
    try {
      const res = await fetch('/api/webhooks/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al crear');
      }
      const json = await res.json();
      setShowCreateModal(false);
      await cargarConfigs();
      setShowSecret(json.data.secret);
      toast({ title: 'Webhook creado' });
    } catch (err) {
      toast({
        title: 'Error al crear webhook',
        description: err instanceof Error ? err.message : '',
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async (id: string, data: { url?: string; evento?: string; activo?: boolean }) => {
    try {
      const res = await fetch(`/api/webhooks/configs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al actualizar');
      }
      setShowCreateModal(false);
      setEditingConfig(null);
      await cargarConfigs();
      toast({ title: 'Webhook actualizado' });
    } catch (err) {
      toast({
        title: 'Error al actualizar',
        description: err instanceof Error ? err.message : '',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/webhooks/configs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setDeletingConfig(null);
      await cargarConfigs();
      toast({ title: 'Webhook eliminado' });
    } catch (err) {
      toast({
        title: 'Error al eliminar',
        description: err instanceof Error ? err.message : '',
        variant: 'destructive',
      });
    }
  };

  const handleTest = async (config: WebhookConfigItem) => {
    setTestingId(config.id);
    try {
      const res = await fetch(`/api/webhooks/configs/${config.id}/test`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al probar');
      }
      const json = await res.json();
      toast({
        title: json.data?.ok ? 'Webhook funcional' : 'Webhook falló',
        description: json.data?.statusCode
          ? `HTTP ${json.data.statusCode}`
          : json.data?.error || 'Sin respuesta',
        variant: json.data?.ok ? 'default' : 'destructive',
      });
    } catch (err) {
      toast({
        title: 'Error al probar',
        description: err instanceof Error ? err.message : '',
        variant: 'destructive',
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleRegenerateSecret = async (id: string) => {
    setRegeneratingId(id);
    try {
      const res = await fetch(`/api/webhooks/configs/${id}/regenerate-secret`, { method: 'POST' });
      if (!res.ok) throw new Error('Error al regenerar');
      const json = await res.json();
      setShowSecret(json.data.secret);
      toast({ title: 'Secreto regenerado', description: 'Guardalo en un lugar seguro' });
    } catch (err) {
      toast({
        title: 'Error al regenerar',
        description: err instanceof Error ? err.message : '',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Webhooks Salientes</h3>
          <p className="text-sm text-muted-foreground">
            Configurí endpoints que reciban notificaciones de eventos del sistema
          </p>
        </div>
        <Button onClick={() => { setEditingConfig(null); setShowCreateModal(true); }}>
          <Plus className="h-4 w-4 mr-1" />
          Agregar Webhook
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 skeleton rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" className="mt-2" onClick={cargarConfigs}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : configs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-muted-foreground">No hay webhooks configurados</p>
            <p className="text-sm text-muted-foreground">
              Configurí endpoints para recibir notificaciones de eventos del sistema
            </p>
            <Button onClick={() => { setEditingConfig(null); setShowCreateModal(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {configs.map((config) => (
            <Card key={config.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {EVENTOS.find((e) => e.value === config.evento)?.label || config.evento}
                      </Badge>
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          config.ultimoEstado === 'ok'
                            ? 'bg-green-500'
                            : config.ultimoEstado === 'error'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                        title={`Estado: ${config.ultimoEstado}`}
                      />
                      <span className="text-xs text-muted-foreground">
                        {config.ultimoEstado === 'ok'
                          ? 'Funcionando'
                          : config.ultimoEstado === 'error'
                            ? 'Error'
                            : config.activo
                              ? 'Pendiente'
                              : 'Inactivo'}
                      </span>
                    </div>
                    <p className="text-sm font-mono text-muted-foreground truncate max-w-md">
                      {config.url}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={config.activo}
                      onCheckedChange={(v) => handleUpdate(config.id, { activo: v })}
                      title={config.activo ? 'Desactivar' : 'Activar'}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Probar webhook"
                      onClick={() => handleTest(config)}
                      disabled={testingId === config.id}
                    >
                      {testingId === config.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar"
                      onClick={() => {
                        setEditingConfig(config);
                        setShowCreateModal(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Eliminar"
                      onClick={() => setDeletingConfig(config)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {logs[config.id] && logs[config.id].length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Últimas entregas
                    </p>
                    <div className="space-y-1">
                      {logs[config.id].slice(0, 5).map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center gap-2 text-xs text-muted-foreground"
                        >
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full ${
                              log.statusCode && log.statusCode >= 200 && log.statusCode < 300
                                ? 'bg-green-500'
                                : 'bg-red-500'
                            }`}
                          />
                          <span>HTTP {log.statusCode || '—'}</span>
                          <span>{log.duracionMs}ms</span>
                          <span>{log.intentos} intento(s)</span>
                          <span className="text-[10px]">
                            {new Date(log.createdAt).toLocaleString('es-CL')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingConfig ? 'Editar Webhook' : 'Nuevo Webhook'}</DialogTitle>
            <DialogDescription>
              {editingConfig
                ? 'Modificí la configuración del webhook'
                : 'Configurí un endpoint para recibir notificaciones de eventos'}
            </DialogDescription>
          </DialogHeader>
          <WebhookForm
            initial={editingConfig}
            onSave={async (data) => {
              if (editingConfig) {
                await handleUpdate(editingConfig.id, data);
              } else {
                await handleCreate(data);
              }
            }}
            onCancel={() => {
              setShowCreateModal(false);
              setEditingConfig(null);
            }}
            onRegenerateSecret={handleRegenerateSecret}
            regenerating={regeneratingId === editingConfig?.id}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!showSecret}
        onOpenChange={(open) => {
          if (!open) setShowSecret(null);
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Secreto del Webhook</DialogTitle>
            <DialogDescription>
              Este secreto se muestra una sola vez. Guardalo en un lugar seguro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-md font-mono text-sm break-all select-all">
              {showSecret}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(showSecret || '');
                  toast({ title: 'Secreto copiado' });
                }}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copiar
              </Button>
            </div>
            <p className="text-sm text-destructive font-medium">
              Guardá este secreto en un lugar seguro. No podrás verlo nuevamente.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingConfig}
        onOpenChange={(open) => {
          if (!open) setDeletingConfig(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarí la configuración y no se enviarí más notificaciones a esta URL.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingConfig && handleDelete(deletingConfig.id)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
