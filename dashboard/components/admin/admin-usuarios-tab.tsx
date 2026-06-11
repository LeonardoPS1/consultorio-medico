'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, UserPlus, Edit, Loader2, ChevronDown, Sparkles } from 'lucide-react';
import { FEATURE_PLAN, getFeatureRequiredPlan } from '@/lib/features';

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  activo: boolean;
  plan: string;
  ultimoAcceso: string | null;
  activo2fa: boolean;
  createdAt: string;
}

import { PAID_PLANS } from '@/lib/planes';
const PLANES = ['free', ...PAID_PLANS] as const;
const ROLES = ['medico', 'admin', 'secretaria'] as const;

function PlanBadge({ plan }: { plan: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    free: 'secondary',
    starter: 'outline',
    professional: 'default',
    premium: 'destructive',
    enterprise: 'destructive',
  };
  return <Badge variant={variants[plan] || 'secondary'}>{plan}</Badge>;
}

function RolBadge({ rol }: { rol: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    admin: 'destructive',
    medico: 'default',
    secretaria: 'secondary',
  };
  const labels: Record<string, string> = {
    admin: 'Admin',
    medico: 'Médico',
    secretaria: 'Secretaria',
  };
  return <Badge variant={variants[rol] || 'secondary'}>{labels[rol] || rol}</Badge>;
}

export default function AdminUsuariosTab() {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal crear
  const [showCreate, setShowCreate] = useState(false);
  const [createNombre, setCreateNombre] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createPlan, setCreatePlan] = useState<string>('free');
  const [createRol, setCreateRol] = useState<string>('medico');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Modal editar
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [editPlan, setEditPlan] = useState('');
  const [editRol, setEditRol] = useState('');
  const [editActivo, setEditActivo] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Feature overrides per-user
  const [editOverrides, setEditOverrides] = useState<Set<string>>(new Set());
  const [editOverridesLoading, setEditOverridesLoading] = useState(false);
  const [editOverridesOpen, setEditOverridesOpen] = useState(false);

  const fetchOverrides = useCallback(async (userId: string) => {
    setEditOverridesLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/feature-overrides`);
      if (res.ok) {
        const data = await res.json();
        setEditOverrides(new Set(data.featureIds || []));
      }
    } catch { /* ignore */ }
    finally { setEditOverridesLoading(false); }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Error al cargar usuarios');
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ─── Crear usuario ───────────────────────────────────────

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: createNombre,
          email: createEmail,
          password: createPassword,
          plan: createPlan,
          rol: createRol,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || 'Error al crear usuario');
        setCreateLoading(false);
        return;
      }

      setShowCreate(false);
      setCreateNombre('');
      setCreateEmail('');
      setCreatePassword('');
      setCreatePlan('free');
      setCreateRol('medico');
      await fetchUsers();
    } catch {
      setCreateError('Error de conexión');
    } finally {
      setCreateLoading(false);
    }
  };

  // ─── Abrir modal de edición ──────────────────────────────

  const openEdit = (user: Usuario) => {
    setEditingUser(user);
    setEditPlan(user.plan);
    setEditRol(user.rol);
    setEditActivo(user.activo);
    setEditError('');
    setEditOverridesOpen(false);
    fetchOverrides(user.id);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setEditLoading(true);
    setEditError('');

    try {
      // 1. Guardar datos básicos del usuario
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: editPlan,
          rol: editRol,
          activo: editActivo,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'Error al actualizar');
        setEditLoading(false);
        return;
      }

      // 2. Guardar feature overrides
      const overridesRes = await fetch(`/api/admin/users/${editingUser.id}/feature-overrides`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureIds: Array.from(editOverrides) }),
      });

      if (!overridesRes.ok) {
        const errData = await overridesRes.json().catch(() => ({}));
        setEditError(errData.error || 'Error al guardar overrides de features');
        setEditLoading(false);
        return;
      }

      setEditingUser(null);
      await fetchUsers();
    } catch {
      setEditError('Error de conexión');
    } finally {
      setEditLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-4">
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Usuarios del sistema</h3>
          <p className="text-sm text-muted-foreground">
            {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''} en tu consultorio
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Crear usuario
        </Button>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rol</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Activo</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Último acceso</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No hay usuarios registrados. Creá el primero.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{u.nombre}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3"><RolBadge rol={u.rol} /></td>
                  <td className="px-4 py-3"><PlanBadge plan={u.plan} /></td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs ${u.activo ? 'text-green-600' : 'text-destructive'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${u.activo ? 'bg-green-500' : 'bg-destructive'}`} />
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                    {u.ultimoAcceso
                      ? new Date(u.ultimoAcceso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Modal Crear Usuario ─────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear usuario</DialogTitle>
            <DialogDescription>
              El nuevo usuario pertenecerá a tu mismo consultorio.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="c-nombre">Nombre</Label>
              <Input
                id="c-nombre"
                value={createNombre}
                onChange={(e) => setCreateNombre(e.target.value)}
                placeholder="Dr. Juan Pérez"
                required
                minLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-email">Email</Label>
              <Input
                id="c-email"
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="juan@consultorio.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-password">Contraseña</Label>
              <Input
                id="c-password"
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="c-plan">Plan</Label>
                <Select value={createPlan} onValueChange={setCreatePlan}>
                  <SelectTrigger id="c-plan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLANES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-rol">Rol</Label>
                <Select value={createRol} onValueChange={setCreateRol}>
                  <SelectTrigger id="c-rol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{r === 'medico' ? 'Médico' : r === 'admin' ? 'Admin' : 'Secretaria'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {createError && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createLoading}>
                {createLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear usuario
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Modal Editar Usuario ────────────────────────── */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>
              {editingUser?.nombre} &mdash; {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="e-plan">Plan</Label>
                <Select value={editPlan} onValueChange={setEditPlan}>
                  <SelectTrigger id="e-plan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLANES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-rol">Rol</Label>
                <Select value={editRol} onValueChange={setEditRol}>
                  <SelectTrigger id="e-rol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{r === 'medico' ? 'Médico' : r === 'admin' ? 'Admin' : 'Secretaria'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="e-activo" className="text-sm font-medium cursor-pointer">Usuario activo</Label>
                <p className="text-xs text-muted-foreground">
                  {editActivo ? 'Puede iniciar sesión normalmente' : 'No podrá acceder al sistema'}
                </p>
              </div>
              <Switch
                id="e-activo"
                checked={editActivo}
                onCheckedChange={setEditActivo}
              />
            </div>

            {/* ─── Feature Overrides ──────────────────────────── */}
            <div className="rounded-lg border border-primary/10">
              <button
                type="button"
                onClick={() => setEditOverridesOpen(!editOverridesOpen)}
                className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium hover:bg-muted/30 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Overrides de features
                  {editOverrides.size > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-semibold">
                      {editOverrides.size}
                    </span>
                  )}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${editOverridesOpen ? 'rotate-180' : ''}`} />
              </button>

              {editOverridesOpen && (
                <div className="px-3 pb-3 space-y-1 border-t border-primary/10 pt-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    Los overrides permiten habilitar features de planes superiores para este usuario,
                    sin necesidad de cambiar su plan de suscripción.
                  </p>
                  {editOverridesLoading ? (
                    <div className="flex items-center gap-2 py-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-xs text-muted-foreground">Cargando...</span>
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      {Object.entries(FEATURE_PLAN)
                        .sort(([, aPlan], [, bPlan]) => {
                          const order = ['free', 'starter', 'professional', 'premium', 'enterprise'];
                          return order.indexOf(aPlan) - order.indexOf(bPlan);
                        })
                        .map(([featureId, requiredPlan]) => {
                          const isOverridden = editOverrides.has(featureId);
                          return (
                            <div
                              key={featureId}
                              className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/30"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs truncate">{featureId}</span>
                                {isOverridden && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-amber-500/10 border-amber-500/30 text-amber-600">
                                    override
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">
                                  {requiredPlan}
                                </Badge>
                              </div>
                              <Switch
                                checked={isOverridden}
                                onCheckedChange={(c) => {
                                  setEditOverrides((prev) => {
                                    const next = new Set(prev);
                                    if (c) next.add(featureId);
                                    else next.delete(featureId);
                                    return next;
                                  });
                                }}
                                className="scale-75"
                              />
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {editError && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={editLoading}>
                {editLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar cambios
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
