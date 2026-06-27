'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
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
  FileSignature,
  Loader2,
  Search,
  FileText,
  User,
  Calendar,
  Shield,
  Download,
  Eye,
} from 'lucide-react';

interface ConsentimientoItem {
  id: string;
  pacienteId: string;
  tipo: string;
  titulo: string;
  fechaFirma: string | null;
  nombrePaciente: string;
  rutPaciente: string | null;
  ipFirma: string | null;
  documentoPdf: string | null;
  medicoId: string | null;
  createdAt: string;
  pacienteNombre: string;
  medicoNombre: string;
}

interface ConsentimientoStats {
  total: number;
  porTipo: Record<string, number>;
}

interface ConsentimientosClientProps {
  initialData: ConsentimientoItem[];
  initialTotal: number;
  initialStats: ConsentimientoStats | null;
  canView: boolean;
}

const TIPOS = ['general', 'cirugia', 'tratamiento', 'procedimiento', 'estetica', 'otros'] as const;

export function ConsentimientosClient({
  initialData,
  initialTotal,
  initialStats,
  canView,
}: ConsentimientosClientProps) {
  const [data, setData] = useState<ConsentimientoItem[]>(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [stats, setStats] = useState<ConsentimientoStats | null>(initialStats);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    pacienteId: '',
    tipo: 'general',
    titulo: '',
    descripcion: '',
    nombrePaciente: '',
    rutPaciente: '',
    ipFirma: '',
  });

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<ConsentimientoItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroTipo !== 'todos') params.set('tipo', filtroTipo);
      if (search) params.set('search', search);
      params.set('limit', '50');

      const [listRes, statsRes] = await Promise.all([
        fetch(`/api/consentimientos?${params.toString()}`),
        fetch('/api/consentimientos?stats=true'),
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
      console.error('Error fetching consentimientos:', err);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filtroTipo, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!form.pacienteId || !form.titulo || !form.nombrePaciente) {
      toast({
        title: 'Campos incompletos',
        description: 'Paciente, título y nombre son obligatorios',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/consentimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: form.pacienteId,
          tipo: form.tipo,
          titulo: form.titulo,
          descripcion: form.descripcion || null,
          nombrePaciente: form.nombrePaciente,
          rutPaciente: form.rutPaciente || null,
          ipFirma: form.ipFirma || null,
          fechaFirma: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al crear');
      }
      toast({ title: 'Creado', description: 'Consentimiento registrado correctamente' });
      setCreateOpen(false);
      setForm({
        pacienteId: '',
        tipo: 'general',
        titulo: '',
        descripcion: '',
        nombrePaciente: '',
        rutPaciente: '',
        ipFirma: '',
      });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleVerDetalle = async (id: string) => {
    try {
      const res = await fetch(`/api/consentimientos/${id}`);
      if (res.ok) {
        const json = await res.json();
        setDetailData(json.data);
        setDetailOpen(true);
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar el detalle',
        variant: 'destructive',
      });
    }
  };

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No tenés acceso a esta sección</p>
      </div>
    );
  }

  const tipoLabels: Record<string, string> = {
    general: 'General',
    cirugia: 'Cirugía',
    tratamiento: 'Tratamiento',
    procedimiento: 'Procedimiento',
    estetica: 'Estética',
    otros: 'Otros',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consentimientos Informados"
        description="Registro digital de consentimientos informados - Ley 20.584"
        icon={<FileSignature className="h-6 w-6" />}
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          {TIPOS.filter((t) => (stats.porTipo[t] || 0) > 0)
            .slice(0, 3)
            .map((tipo) => (
              <Card key={tipo}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {tipoLabels[tipo] || tipo}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.porTipo[tipo] || 0}</p>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por paciente o título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {TIPOS.map((t) => (
              <SelectItem key={t} value={t}>
                {tipoLabels[t] || t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <FileSignature className="h-4 w-4 mr-2" /> Nuevo consentimiento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Nuevo consentimiento informado</DialogTitle>
              <DialogDescription>
                Registrá un consentimiento informado digital con respaldo legal
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <PacienteSearchCombobox
                    value={form.pacienteId}
                    onChange={(pacienteId, pacienteNombre) => {
                      setForm((prev) => ({
                        ...prev,
                        pacienteId,
                        nombrePaciente: pacienteNombre ?? '',
                      }));
                    }}
                    placeholder="Buscar paciente por nombre, RUT o teléfono..."
                    label="Paciente *"
                    size="sm"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {tipoLabels[t] || t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="titulo">Título del consentimiento</Label>
                <Input
                  id="titulo"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ej: Consentimiento para cirugía de rodilla"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción / Detalle</Label>
                <Textarea
                  id="descripcion"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Detalle del procedimiento, riesgos, alternativas..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombrePaciente">Nombre del paciente</Label>
                  <Input
                    id="nombrePaciente"
                    value={form.nombrePaciente}
                    onChange={(e) => setForm({ ...form, nombrePaciente: e.target.value })}
                    placeholder="Como figura en el consentimiento"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rutPaciente">RUT del paciente</Label>
                  <Input
                    id="rutPaciente"
                    value={form.rutPaciente}
                    onChange={(e) => setForm({ ...form, rutPaciente: e.target.value })}
                    placeholder="12.345.678-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipFirma">IP de firma</Label>
                <Input
                  id="ipFirma"
                  value={form.ipFirma}
                  onChange={(e) => setForm({ ...form, ipFirma: e.target.value })}
                  placeholder="192.168.1.1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar consentimiento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Detalle del consentimiento</DialogTitle>
          </DialogHeader>
          {detailData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Paciente</p>
                  <p className="font-medium">{detailData.pacienteNombre}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">RUT</p>
                  <p className="font-medium">{detailData.rutPaciente || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tipo</p>
                  <Badge variant="outline">{tipoLabels[detailData.tipo] || detailData.tipo}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha de firma</p>
                  <p className="font-medium">
                    {detailData.fechaFirma
                      ? new Date(detailData.fechaFirma).toLocaleDateString('es-CL', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">IP de firma</p>
                  <p className="font-medium">{detailData.ipFirma || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Médico</p>
                  <p className="font-medium">{detailData.medicoNombre || '—'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Título</p>
                <p className="font-medium">{detailData.titulo}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nombre registrado</p>
                <p className="font-medium">{detailData.nombrePaciente}</p>
              </div>
              {detailData.documentoPdf && (
                <Button variant="outline" className="w-full" asChild>
                  <a href={detailData.documentoPdf} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" /> Descargar PDF
                  </a>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileSignature className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No hay consentimientos registrados</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div initial="hidden" animate="visible" className="space-y-2">
          {data.map((item) => (
            <Card
              key={item.id}
              className="hoverable:hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => handleVerDetalle(item.id)}
            >
              <CardContent className="p-4 flex items-start gap-3 flex-wrap">
                <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.pacienteNombre} · {item.nombrePaciente}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge variant="outline">{tipoLabels[item.tipo] || item.tipo}</Badge>
                    {item.fechaFirma && (
                      <Badge variant="secondary">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(item.fechaFirma).toLocaleDateString('es-CL')}
                      </Badge>
                    )}
                    {item.rutPaciente && (
                      <Badge variant="outline" className="text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        {item.rutPaciente}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVerDetalle(item.id);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}
    </div>
  );
}
