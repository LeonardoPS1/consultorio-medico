'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { canAccess } from '@/lib/features';
import { useSession } from 'next-auth/react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { PacienteSearchCombobox } from '@/components/pacientes/paciente-search-combobox';
import {
  Ban,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
  Clock,
} from 'lucide-react';

interface BlacklistEntry {
  id: string;
  pacienteId: string;
  motivo: string;
  activo: boolean;
  bloqueadoHasta: string | null;
  creadoPor: string | null;
  createdAt: string;
  pacienteNombre: string;
  pacienteTelefono: string | null;
  creadoPorNombre: string;
}

interface BlacklistStats {
  total: number;
  activos: { activos: number; inactivos: number };
}

const FiltroEstado = ['todos', 'activos', 'inactivos'] as const;

interface Props {
  initialData: BlacklistEntry[];
  initialTotal: number;
  initialStats: BlacklistStats | null;
}

export function BlacklistClient({ initialData, initialTotal, initialStats }: Props) {
  const { data: session } = useSession();
  const userPlan = session?.user?.plan ?? 'free';
  const canView = canAccess(userPlan, 'blacklist');

  const [data, setData] = useState<BlacklistEntry[]>(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [stats, setStats] = useState<BlacklistStats | null>(initialStats);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    pacienteId: '',
    motivo: '',
    bloqueadoHasta: '',
    activo: 'true',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado === 'activos') params.set('activo', 'true');
      else if (filtroEstado === 'inactivos') params.set('activo', 'false');
      if (search) params.set('search', search);
      params.set('limit', '50');

      const [listRes, statsRes] = await Promise.all([
        fetch(`/api/blacklist?${params.toString()}`),
        fetch('/api/blacklist?stats=true'),
      ]);

      if (listRes.ok) {
        const json = await listRes.json();
        setData(json.data || []);
        setTotal(json.total || 0);
      }
      if (statsRes.ok) {
        const json = await statsRes.json();
        setStats(json);
      }
    } catch (err) {
      console.error('Error fetching blacklist:', err);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, search]);

  useEffect(() => {
    if (search || filtroEstado !== 'todos') fetchData();
  }, [fetchData, search, filtroEstado]);

  const handleCreate = async () => {
    if (!form.pacienteId || !form.motivo) {
      toast({
        title: 'Campos incompletos',
        description: 'Paciente y motivo son obligatorios',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: form.pacienteId,
          motivo: form.motivo,
          activo: form.activo === 'true',
          bloqueadoHasta: form.bloqueadoHasta || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al crear');
      }
      toast({ title: 'Creado', description: 'Paciente bloqueado correctamente' });
      setCreateOpen(false);
      setForm({ pacienteId: '', motivo: '', bloqueadoHasta: '', activo: 'true' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivo = async (entry: BlacklistEntry) => {
    try {
      const res = await fetch(`/api/blacklist/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !entry.activo }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      toast({
        title: entry.activo ? 'Desbloqueado' : 'Bloqueado',
        description: `Paciente ${entry.activo ? 'desbloqueado' : 'bloqueado'} correctamente`,
      });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/blacklist/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast({ title: 'Eliminado', description: 'Entrada eliminada correctamente' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No tenés acceso a esta sección</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lista Negra"
        description="Pacientes bloqueados por inasistencia o incumplimiento"
        icon={<Ban className="h-6 w-6" />}
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total bloqueos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{stats.activos?.activos || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Inactivos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{stats.activos?.inactivos || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por motivo o paciente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {FiltroEstado.map((f) => (
              <SelectItem key={f} value={f}>
                {f === 'todos' ? 'Todos' : f === 'activos' ? 'Activos' : 'Inactivos'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Ban className="h-4 w-4 mr-2" /> Bloquear paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Bloquear paciente</DialogTitle>
              <DialogDescription>
                Registrá un paciente en la lista negra por inasistencia o incumplimiento
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <PacienteSearchCombobox
                  value={form.pacienteId}
                  onChange={(pacienteId) => setForm((f) => ({ ...f, pacienteId }))}
                  placeholder="Buscar paciente por nombre, RUT o teléfono..."
                  label="Paciente"
                  size="sm"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo</Label>
                <Textarea
                  id="motivo"
                  value={form.motivo}
                  onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                  placeholder="Ej: Inasistencia recurrente sin aviso"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bloqueadoHasta">Bloqueo temporal hasta (opcional)</Label>
                <Input
                  id="bloqueadoHasta"
                  type="datetime-local"
                  value={form.bloqueadoHasta}
                  onChange={(e) => setForm({ ...form, bloqueadoHasta: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Bloqueo activo</Label>
                <Select value={form.activo} onValueChange={(v) => setForm({ ...form, activo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Sí</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Bloquear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No hay pacientes bloqueados</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div initial="hidden" animate="visible" className="space-y-2">
          {data.map((entry) => (
            <Card key={entry.id} className="hoverable:hover:bg-muted/30 transition-colors">
              <CardContent className="p-4 flex items-start gap-3 flex-wrap">
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                    entry.activo ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                  }`}
                >
                  {entry.activo ? (
                    <ShieldAlert className="h-5 w-5" />
                  ) : (
                    <ShieldCheck className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{entry.pacienteNombre}</p>
                  <p className="text-xs text-muted-foreground">{entry.pacienteTelefono}</p>
                  <p className="text-sm mt-1">{entry.motivo}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge variant={entry.activo ? 'destructive' : 'secondary'}>
                      {entry.activo ? 'Bloqueado' : 'Desbloqueado'}
                    </Badge>
                    {entry.bloqueadoHasta && (
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        Hasta {new Date(entry.bloqueadoHasta).toLocaleDateString('es-CL')}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant={entry.activo ? 'outline' : 'default'}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => handleToggleActivo(entry)}
                  >
                    {entry.activo ? 'Desbloquear' : 'Bloquear'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(entry.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}
    </div>
  );
}
