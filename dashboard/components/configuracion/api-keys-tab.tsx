'use client';

/**
 * API Keys Tab — Gestión de claves para la API pública
 *
 * Permite crear, listar y revocar API keys para integraciones externas.
 * Solo visible para planes Professional+.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  Plus,
  Key,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Clock,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { API_SCOPES } from '@/lib/public-api-types';

interface ApiKeyItem {
  id: string;
  nombre: string;
  keyPrefix: string;
  scopes: string[];
  activa: boolean;
  ultimoUso: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface NewKeyResult {
  id: string;
  fullKey: string;
  nombre: string;
  scopes: string[];
}

export default function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdKey, setCreatedKey] = useState<NewKeyResult | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  // Cargar keys
  const loadKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/api-keys');
      const data = await res.json();
      if (data.apiKeys) setKeys(data.apiKeys);
    } catch {
      toast({ title: 'Error al cargar API keys', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  // Formatear fecha relativa
  const relativeTime = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Ahora';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    return `Hace ${Math.floor(diff / 86400)} d`;
  };

  // Copiar al portapapeles
  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copiado al portapapeles' });
    } catch {
      toast({ title: 'No se pudo copiar', variant: 'destructive' });
    }
  };

  // Revocar key — elimina de la lista inmediatamente
  const revokeKey = async (id: string) => {
    if (!confirm('¿Revocar esta API key? Dejará de funcionar inmediatamente.')) return;
    try {
      await fetch(`/api/api-keys?id=${id}`, { method: 'DELETE' });
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast({ title: 'API key revocada y eliminada' });
    } catch {
      toast({ title: 'Error al revocar', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {loading
              ? 'Cargando...'
              : `${keys.length} key${keys.length !== 1 ? 's' : ''} configurada${keys.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nueva API Key
        </Button>
      </div>

      {/* Info card */}
      <Card className="border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/10">
        <CardContent className="p-4 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-blue-800 dark:text-blue-300">
              API pública para integraciones
            </p>
            <p className="text-blue-700/80 dark:text-blue-400/80">
              Las API keys permiten que sistemas externos (apps, sitios web, otros consultorios) se
              conecten a tu consultorio de forma segura. Cada key tiene scopes que limitan qué puede
              hacer.
            </p>
            <p className="text-blue-700/80 dark:text-blue-400/80">
              URL base:{' '}
              <code className="bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded text-xs">
                https://med.aicorebots.com/api/v1
              </code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Keys list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
          ))}
        </div>
      ) : keys.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-40">
            <div className="text-center">
              <Key className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Sin API keys</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Creá tu primera key para habilitar integraciones
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <Card key={key.id} className={!key.activa ? 'opacity-50' : ''}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{key.nombre}</p>
                      {!key.activa && (
                        <Badge variant="destructive" className="text-[10px]">
                          Revocada
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">{key.keyPrefix}...</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Último uso: {relativeTime(key.ultimoUso)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {key.scopes.map((scope) => (
                        <Badge key={scope} variant="outline" className="text-[10px] py-0 h-4">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => revokeKey(key.id)}
                      disabled={!key.activa}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateApiKeyModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreated={(result) => {
          setCreatedKey(result);
          setShowCreateModal(false);
          loadKeys();
        }}
      />

      {/* Result Modal (shows the full key once) */}
      <Dialog open={!!createdKey} onOpenChange={() => setCreatedKey(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-amber-600" />
              API Key Creada
            </DialogTitle>
            <DialogDescription>
              Copiá esta key ahora. <strong>No se mostrará nuevamente.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{createdKey?.nombre}</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={createdKey?.fullKey || ''}
                  readOnly
                  className="font-mono text-sm"
                  type={revealedKeys.has(createdKey?.id || '') ? 'text' : 'password'}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => {
                    if (createdKey) {
                      setRevealedKeys((prev) => {
                        const next = new Set(prev);
                        next.has(createdKey.id)
                          ? next.delete(createdKey.id)
                          : next.add(createdKey.id);
                        return next;
                      });
                    }
                  }}
                >
                  {revealedKeys.has(createdKey?.id || '') ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => copyText(createdKey?.fullKey || '')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {createdKey?.scopes.map((s) => (
                <Badge key={s} variant="secondary" className="text-[10px]">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedKey(null)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Modal para crear API key
// ============================================================

function CreateApiKeyModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (result: NewKeyResult) => void;
}) {
  const [nombre, setNombre] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(
    new Set([API_SCOPES.TURNOS_READ, API_SCOPES.MEDICOS_READ, API_SCOPES.HORARIOS_READ]),
  );
  const [creating, setCreating] = useState(false);

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      next.has(scope) ? next.delete(scope) : next.add(scope);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!nombre.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), scopes: Array.from(selectedScopes) }),
      });
      const data = await res.json();
      if (data.fullKey) {
        onCreated(data);
        setNombre('');
        setSelectedScopes(new Set([API_SCOPES.TURNOS_READ]));
      } else {
        toast({ title: data.error || 'Error al crear', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error de conexión', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nueva API Key</DialogTitle>
          <DialogDescription>
            Creá una clave para que sistemas externos accedan a la API
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: App de turnos, Sistema de facturación"
            />
          </div>
          <div className="space-y-2">
            <Label>Scopes (permisos)</Label>
            <p className="text-xs text-muted-foreground">Seleccioná qué puede hacer esta key</p>
            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto">
              {Object.values(API_SCOPES).map((scope) => (
                <label
                  key={scope}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedScopes.has(scope)}
                    onChange={() => toggleScope(scope)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{scope}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={!nombre.trim() || creating}>
            {creating ? 'Creando...' : 'Crear API Key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
