'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { canAccess } from '@/lib/features';
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
  ArrowRightLeft,
  Loader2,
  Search,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Stethoscope,
  Activity,
  Calendar,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────

type DerivacionEstado = 'pendiente' | 'aceptada' | 'rechazada' | 'completada';
type Gravedad = 'normal' | 'prioritaria' | 'urgente';

interface Derivacion {
  id: string;
  pacienteId: string;
  medicoOrigenId: string;
  medicoDestinoId: string | null;
  especialidad: string;
  motivo: string;
  diagnostico: string | null;
  cie10Codigo: string | null;
  gravedad: Gravedad;
  estado: DerivacionEstado;
  notasOrigen: string | null;
  notasDestino: string | null;
  fechaRespuesta: string | null;
  createdAt: string;
  pacienteNombre: string;
  pacienteTelefono: string | null;
  medicoOrigenNombre: string;
  medicoDestinoNombre: string | null;
}

interface MedicoOption {
  id: string;
  nombre: string;
  especialidad: string;
}

// ─── Helpers ────────────────────────────────────────────────

const estadoColores: Record<DerivacionEstado, string> = {
  pendiente: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  aceptada: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  rechazada: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
  completada: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
};

const estadoLabels: Record<DerivacionEstado, string> = {
  pendiente: 'Pendiente',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  completada: 'Completada',
};

const gravedadIconos: Record<Gravedad, typeof AlertTriangle> = {
  normal: Info,
  prioritaria: AlertCircle,
  urgente: AlertTriangle,
};

const gravedadColores: Record<Gravedad, string> = {
  normal: 'text-blue-500',
  prioritaria: 'text-amber-500',
  urgente: 'text-red-500',
};

const FiltroEstado = ['todas', 'pendiente', 'aceptada', 'rechazada', 'completada'] as const;

// ─── Componente Principal ──────────────────────────────────

export default function DerivacionesPage() {
  const { data: session } = useSession();
  const userPlan = session?.user?.plan ?? 'free';
  const canView = canAccess(userPlan, 'derivaciones');

  const [data, setData] = useState<Derivacion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todas');
  const [stats, setStats] = useState<{
    total: number;
    porEstado: Record<string, number>;
    porGravedad: Record<string, number>;
  } | null>(null);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [medicos, setMedicos] = useState<MedicoOption[]>([]);

  // Detail modal
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Derivacion | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [form, setForm] = useState({
    pacienteId: '',
    medicoOrigenId: '',
    medicoDestinoId: 'ninguno',
    especialidad: '',
    motivo: '',
    diagnostico: '',
    cie10Codigo: '',
    gravedad: 'normal' as Gravedad,
    notasOrigen: '',
  });

  // ── Cargar datos ──────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroEstado !== 'todas') params.set('estado', filtroEstado);
      if (search) params.set('search', search);
      params.set('limit', '50');

      const [res, statsRes] = await Promise.all([
        fetch(`/api/derivaciones?${params}`),
        fetch('/api/derivaciones?stats=true'),
      ]);

      if (res.ok) {
        const json = await res.json();
        setData(json.data ?? []);
        setTotal(json.total ?? 0);
      }
      if (statsRes.ok) {
        const json = await statsRes.json();
        setStats(json);
      }
    } catch (err) {
      console.error('[Derivaciones] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Cargar médicos ─────────────────────────────────────
  useEffect(() => {
    if (createOpen && medicos.length === 0) {
      fetch('/api/derivaciones?medicos=true')
        .then((r) => r.json())
        .then((json) => setMedicos(json.data ?? []))
        .catch(() => {});
    }
  }, [createOpen, medicos.length]);

  // ── Crear derivación ───────────────────────────────────
  const handleCreate = async () => {
    if (!form.pacienteId || !form.medicoOrigenId || !form.especialidad || !form.motivo) {
      toast({
        title: 'Campos requeridos',
        description: 'Completá Paciente, Médico origen, Especialidad y Motivo',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      // Convert empty string to null for medicoDestinoId
      const payload = {
        ...form,
        medicoDestinoId: form.medicoDestinoId === 'ninguno' ? null : form.medicoDestinoId,
      };
      const res = await fetch('/api/derivaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Error al crear');
      toast({
        title: 'Derivación creada',
        description: 'La derivación fue registrada correctamente',
      });
      setCreateOpen(false);
      setForm({
        pacienteId: '',
        medicoOrigenId: '',
        medicoDestinoId: 'ninguno',
        especialidad: '',
        motivo: '',
        diagnostico: '',
        cie10Codigo: '',
        gravedad: 'normal',
        notasOrigen: '',
      });
      fetchData();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo crear la derivación',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Ver detalle ─────────────────────────────────────────
  const openDetail = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/derivaciones/${id}`);
      if (res.ok) {
        const json = await res.json();
        setDetail(json.data ?? json);
      }
    } catch {
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Cambiar estado ──────────────────────────────────────
  const cambiarEstado = async (
    id: string,
    nuevoEstado: DerivacionEstado,
    notasDestino?: string,
  ) => {
    try {
      const body: Record<string, any> = { estado: nuevoEstado };
      if (notasDestino) body.notasDestino = notasDestino;
      const res = await fetch(`/api/derivaciones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast({
        title: `Derivación ${estadoLabels[nuevoEstado].toLowerCase()}`,
        description: 'Estado actualizado correctamente',
      });
      fetchData();
      if (selectedId === id) openDetail(id);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive',
      });
    }
  };

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="text-center p-8">
          <CardContent>
            <ArrowRightLeft className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Plan no disponible</h2>
            <p className="text-muted-foreground">
              Actualizá tu plan para acceder al sistema de derivaciones.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Derivaciones"
          description="Gestioná interconsultas y derivaciones entre especialistas"
        />
        <Button onClick={() => setCreateOpen(true)} className="mt-1 shrink-0">
          <ArrowRightLeft className="h-4 w-4 mr-2" />
          Nueva Derivación
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <motion.div
          className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6"
          initial="hidden"
          animate="visible"
        >
          <StatCard
            title="Totales"
            value={String(stats.total)}
            icon={ArrowRightLeft}
            color="text-blue-500"
          />
          <StatCard
            title="Pendientes"
            value={String(stats.porEstado?.pendiente ?? 0)}
            icon={Clock}
            color="text-amber-500"
          />
          <StatCard
            title="Aceptadas"
            value={String(stats.porEstado?.aceptada ?? 0)}
            icon={CheckCircle2}
            color="text-emerald-500"
          />
          <StatCard
            title="Completadas"
            value={String(stats.porEstado?.completada ?? 0)}
            icon={Activity}
            color="text-blue-500"
          />
          <StatCard
            title="Urgentes"
            value={String(stats.porGravedad?.urgente ?? 0)}
            icon={AlertTriangle}
            color="text-red-500"
          />
          <StatCard
            title="Prioritarias"
            value={String(stats.porGravedad?.prioritaria ?? 0)}
            icon={AlertCircle}
            color="text-amber-500"
          />
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por especialidad, motivo..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {FiltroEstado.map((est) => (
              <SelectItem key={est} value={est}>
                {est === 'todas' ? 'Todas' : estadoLabels[est as DerivacionEstado]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <ArrowRightLeft className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-1">Sin derivaciones</p>
            <p className="text-sm text-muted-foreground">
              No hay derivaciones registradas en este período
            </p>
            <Button variant="outline" className="mt-4" onClick={() => setCreateOpen(true)}>
              Crear primera derivación
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((der) => (
            <motion.div
              key={der.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 p-4 rounded-lg border border-border/60 bg-card hover:bg-accent/30 transition-colors cursor-pointer"
              onClick={() => openDetail(der.id)}
            >
              {/* Gravedad icon */}
              <div className={`${gravedadColores[der.gravedad]} shrink-0`}>
                {React.createElement(gravedadIconos[der.gravedad], { className: 'h-5 w-5' })}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium truncate">{der.pacienteNombre}</span>
                  <Badge className={estadoColores[der.estado]}>{estadoLabels[der.estado]}</Badge>
                  {der.gravedad === 'urgente' && (
                    <Badge variant="destructive" className="text-[10px]">
                      URGENTE
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Stethoscope className="h-3.5 w-3.5" />
                    {der.especialidad}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {der.medicoOrigenNombre}
                    {der.medicoDestinoNombre && <> → {der.medicoDestinoNombre}</>}
                  </span>
                  <span className="text-xs">
                    {new Date(der.createdAt).toLocaleDateString('es-CL')}
                  </span>
                </div>
              </div>

              {/* Acciones rápidas */}
              <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                {der.estado === 'pendiente' && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-emerald-600"
                      onClick={() => cambiarEstado(der.id, 'aceptada')}
                    >
                      Aceptar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-red-600"
                      onClick={() => cambiarEstado(der.id, 'rechazada')}
                    >
                      Rechazar
                    </Button>
                  </>
                )}
                {der.estado === 'aceptada' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-blue-600"
                    onClick={() => cambiarEstado(der.id, 'completada')}
                  >
                    Completar
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Crear */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Derivación</DialogTitle>
            <DialogDescription>Derivar paciente a otro especialista o médico</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <PacienteSearchCombobox
                  value={form.pacienteId}
                  onChange={(pacienteId) => setForm((f) => ({ ...f, pacienteId }))}
                  placeholder="Buscar paciente por nombre, RUT o teléfono..."
                  label="Paciente *"
                  size="sm"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Médico origen *</Label>
                <Select
                  value={form.medicoOrigenId}
                  onValueChange={(v) => setForm((f) => ({ ...f, medicoOrigenId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar médico" />
                  </SelectTrigger>
                  <SelectContent>
                    {medicos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nombre} — {m.especialidad}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Especialidad destino *</Label>
                <Input
                  placeholder="Ej: Cardiología, Traumatología"
                  value={form.especialidad}
                  onChange={(e) => setForm((f) => ({ ...f, especialidad: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Médico destino</Label>
                <Select
                  value={form.medicoDestinoId}
                  onValueChange={(v) => setForm((f) => ({ ...f, medicoDestinoId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ninguno">Sin asignar</SelectItem>
                    {medicos
                      .filter((m) => m.id !== form.medicoOrigenId)
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nombre} — {m.especialidad}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Textarea
                placeholder="Motivo de la derivación"
                value={form.motivo}
                onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Diagnóstico</Label>
                <Input
                  placeholder="Diagnóstico actual"
                  value={form.diagnostico}
                  onChange={(e) => setForm((f) => ({ ...f, diagnostico: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Código CIE-10</Label>
                <Input
                  placeholder="Ej: I10"
                  value={form.cie10Codigo}
                  onChange={(e) => setForm((f) => ({ ...f, cie10Codigo: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Gravedad</Label>
              <Select
                value={form.gravedad}
                onValueChange={(v: Gravedad) => setForm((f) => ({ ...f, gravedad: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="prioritaria">Prioritaria</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notas del origen</Label>
              <Textarea
                placeholder="Comentarios adicionales, estudios previos..."
                value={form.notasOrigen}
                onChange={(e) => setForm((f) => ({ ...f, notasOrigen: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Derivación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detalle */}
      <Dialog
        open={!!selectedId}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Derivación</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-3 py-4">
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
              <div className="h-20 bg-muted rounded animate-pulse" />
            </div>
          ) : detail ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={estadoColores[detail.estado]}>
                  {estadoLabels[detail.estado]}
                </Badge>
                <div className="flex items-center gap-1 text-sm">
                  {React.createElement(gravedadIconos[detail.gravedad], {
                    className: `h-4 w-4 ${gravedadColores[detail.gravedad]}`,
                  })}
                  <span className="capitalize">{detail.gravedad}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Paciente</p>
                  <p className="font-medium">{detail.pacienteNombre}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Creada</p>
                  <p>{new Date(detail.createdAt).toLocaleDateString('es-CL')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Médico origen</p>
                  <p>{detail.medicoOrigenNombre}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Médico destino</p>
                  <p>{detail.medicoDestinoNombre || 'Sin asignar'}</p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Especialidad</p>
                <p className="font-medium">{detail.especialidad}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Motivo</p>
                <p className="text-sm whitespace-pre-wrap">{detail.motivo}</p>
              </div>

              {detail.diagnostico && (
                <div>
                  <p className="text-muted-foreground text-xs">Diagnóstico</p>
                  <p className="text-sm">{detail.diagnostico}</p>
                </div>
              )}

              {detail.cie10Codigo && (
                <div>
                  <p className="text-muted-foreground text-xs">CIE-10</p>
                  <p className="text-sm font-mono">{detail.cie10Codigo}</p>
                </div>
              )}

              {detail.notasOrigen && (
                <div>
                  <p className="text-muted-foreground text-xs">Notas del origen</p>
                  <p className="text-sm whitespace-pre-wrap">{detail.notasOrigen}</p>
                </div>
              )}

              {detail.fechaRespuesta && (
                <div>
                  <p className="text-muted-foreground text-xs">Fecha de respuesta</p>
                  <p>{new Date(detail.fechaRespuesta).toLocaleDateString('es-CL')}</p>
                </div>
              )}

              {detail.estado === 'pendiente' && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => cambiarEstado(detail.id, 'aceptada')}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                    Aceptar
                  </Button>
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => cambiarEstado(detail.id, 'rechazada')}
                  >
                    <XCircle className="h-4 w-4 mr-2 text-red-500" />
                    Rechazar
                  </Button>
                </div>
              )}
              {detail.estado === 'aceptada' && (
                <div className="pt-2 border-t">
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => cambiarEstado(detail.id, 'completada')}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2 text-blue-500" />
                    Marcar como completada
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── StatCard ──────────────────────────────────────────────

import React from 'react';

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
      <Card>
        <CardContent className="p-3 flex items-center gap-3">
          <div className={`${color} bg-background`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{title}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
