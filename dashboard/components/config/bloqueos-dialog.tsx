'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, CalendarX, Calendar, Umbrella, Ban, Pencil } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface Bloqueo {
  id: string;
  titulo: string;
  fechaInicio: string;
  fechaFin: string;
  tipo: string;
  motivo: string | null;
  createdAt: string;
}

interface Props {
  medicoId: string;
  medicoNombre: string;
}

const TIPOS_BLOQUEO = [
  { value: 'vacaciones', label: 'Vacaciones', icon: Umbrella, color: 'text-amber-600' },
  { value: 'feriado', label: 'Feriado', icon: Calendar, color: 'text-blue-600' },
  { value: 'capacitacion', label: 'Capacitacion', icon: Ban, color: 'text-purple-600' },
  { value: 'bloqueo', label: 'Otro', icon: Ban, color: 'text-gray-600' },
];

function formatBloqueoFecha(isoInicio: string, isoFin: string): string {
  const inicio = new Date(isoInicio);
  const fin = new Date(isoFin);
  const esHorario =
    inicio.getUTCHours() !== 0 ||
    inicio.getUTCMinutes() !== 0 ||
    fin.getUTCHours() !== 0 ||
    fin.getUTCMinutes() !== 0 ||
    fin.getTime() - inicio.getTime() < 86400000;

  const fechaIni = inicio.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
  const fechaFinStr = fin.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });

  if (esHorario) {
    const horaIni = inicio.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const horaFin = fin.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    if (fechaIni === fechaFinStr) {
      // Mismo día, solo mostrar horario
      return `${fechaIni} · ${horaIni} a ${horaFin}`;
    }
    // Distintos días con hora
    return `${fechaIni} ${horaIni} → ${fechaFinStr} ${horaFin}`;
  }

  if (fechaIni === fechaFinStr) return fechaIni;
  return `${fechaIni} → ${fechaFinStr}`;
}

export function BloqueosDialog({
  medicoId,
  medicoNombre,
  open,
  onOpenChange,
}: Props & { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  // Form
  const [titulo, setTitulo] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [tipo, setTipo] = useState('vacaciones');
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [bloqueoHorario, setBloqueoHorario] = useState(false); // true = bloqueo por horas, false = día completo

  const fetchBloqueos = () => {
    setLoading(true);
    fetch(`/api/medicos/${medicoId}/bloqueos`)
      .then((r) => r.json())
      .then((d) => setBloqueos(d.data || []))
      .catch(() => toast({ title: 'Error al cargar bloqueos', variant: 'destructive' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) fetchBloqueos();
  }, [open, medicoId]);

  const handleCreate = async () => {
    if (!titulo.trim() || !fechaInicio || !fechaFin) return;
    setSaving(true);
    try {
      const inicio =
        bloqueoHorario && horaInicio ? `${fechaInicio}T${horaInicio}:00.000Z` : fechaInicio;
      const fin = bloqueoHorario && horaFin ? `${fechaFin}T${horaFin}:00.000Z` : fechaFin;
      const res = await fetch(`/api/medicos/${medicoId}/bloqueos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, fechaInicio: inicio, fechaFin: fin, tipo }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: err.error || 'Error', variant: 'destructive' });
        return;
      }
      toast({ title: 'Bloqueo creado' });
      setShowNew(false);
      setTitulo('');
      setFechaInicio('');
      setFechaFin('');
      setHoraInicio('');
      setHoraFin('');
      setBloqueoHorario(false);
      fetchBloqueos();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bloqueoId: string) => {
    try {
      await fetch(`/api/medicos/${medicoId}/bloqueos/${bloqueoId}`, { method: 'DELETE' });
      toast({ title: 'Bloqueo eliminado' });
      fetchBloqueos();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleUpdate = async (bloqueoId: string) => {
    if (!titulo.trim() || !fechaInicio || !fechaFin) return;
    setSaving(true);
    try {
      const inicio =
        bloqueoHorario && horaInicio ? `${fechaInicio}T${horaInicio}:00.000Z` : fechaInicio;
      const fin = bloqueoHorario && horaFin ? `${fechaFin}T${horaFin}:00.000Z` : fechaFin;
      const res = await fetch(`/api/medicos/${medicoId}/bloqueos/${bloqueoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, fechaInicio: inicio, fechaFin: fin, tipo }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: err.error || 'Error', variant: 'destructive' });
        return;
      }
      toast({ title: 'Bloqueo actualizado' });
      setEditId(null);
      setTitulo('');
      setFechaInicio('');
      setFechaFin('');
      setHoraInicio('');
      setHoraFin('');
      setBloqueoHorario(false);
      fetchBloqueos();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (b: Bloqueo) => {
    setEditId(b.id);
    setTitulo(b.titulo);
    // Detectar si es bloqueo horario (tiene hora != 00:00)
    const inicio = new Date(b.fechaInicio);
    const fin = new Date(b.fechaFin);
    const esHorario =
      inicio.getUTCHours() !== 0 ||
      inicio.getUTCMinutes() !== 0 ||
      fin.getUTCHours() !== 0 ||
      fin.getUTCMinutes() !== 0 ||
      fin.getTime() - inicio.getTime() < 86400000; // menos de 24hs
    setBloqueoHorario(esHorario);
    setFechaInicio(b.fechaInicio.split('T')[0]);
    setFechaFin(b.fechaFin.split('T')[0]);
    if (esHorario) {
      setHoraInicio(inicio.toISOString().split('T')[1].substring(0, 5));
      setHoraFin(fin.toISOString().split('T')[1].substring(0, 5));
    } else {
      setHoraInicio('');
      setHoraFin('');
    }
    setTipo(b.tipo);
    setShowNew(false);
  };

  const getTipoInfo = (t: string) => TIPOS_BLOQUEO.find((x) => x.value === t) || TIPOS_BLOQUEO[3];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarX className="h-5 w-5" />
            Bloqueos de agenda — {medicoNombre}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nuevo bloqueo */}
          {showNew ? (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium">Nuevo bloqueo</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Tipo</Label>
                    <Select value={tipo} onValueChange={setTipo}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_BLOQUEO.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Titulo</Label>
                    <Input
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Vacaciones de invierno"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Desde</Label>
                    <Input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Hasta</Label>
                    <Input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                    />
                  </div>
                </div>

                {/* Toggle horario específico */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="bloqueo-horario"
                    checked={bloqueoHorario}
                    onChange={(e) => setBloqueoHorario(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="bloqueo-horario" className="text-xs cursor-pointer">
                    Bloquear solo un horario específico
                  </Label>
                </div>

                {bloqueoHorario && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Hora inicio</Label>
                      <Input
                        type="time"
                        value={horaInicio}
                        onChange={(e) => setHoraInicio(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Hora fin</Label>
                      <Input
                        type="time"
                        value={horaFin}
                        onChange={(e) => setHoraFin(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowNew(false)}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={saving || !titulo.trim() || !fechaInicio || !fechaFin}
                  >
                    {saving ? 'Guardando...' : 'Crear bloqueo'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4 mr-1" /> Agregar bloqueo
            </Button>
          )}

          {/* Lista de bloqueos */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 skeleton rounded-lg" />
              ))}
            </div>
          ) : bloqueos.length === 0 ? (
            <div className="text-center py-8">
              <CalendarX className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Sin bloqueos registrados</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Agregá vacaciones, feriados o días no laborables
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {bloqueos.map((b) => {
                const info = getTipoInfo(b.tipo);
                const Icon = info.icon;
                const activo = new Date(b.fechaFin) >= new Date();
                const isEditing = editId === b.id;

                if (isEditing) {
                  return (
                    <Card key={b.id} className="border-primary/30 bg-primary/5">
                      <CardContent className="p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Tipo</Label>
                            <Select value={tipo} onValueChange={setTipo}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIPOS_BLOQUEO.map((t) => (
                                  <SelectItem key={t.value} value={t.value}>
                                    {t.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Titulo</Label>
                            <Input
                              className="h-8 text-xs"
                              value={titulo}
                              onChange={(e) => setTitulo(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Desde</Label>
                            <Input
                              className="h-8 text-xs"
                              type="date"
                              value={fechaInicio}
                              onChange={(e) => setFechaInicio(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Hasta</Label>
                            <Input
                              className="h-8 text-xs"
                              type="date"
                              value={fechaFin}
                              onChange={(e) => setFechaFin(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="edit-horario"
                            checked={bloqueoHorario}
                            onChange={(e) => setBloqueoHorario(e.target.checked)}
                            className="h-3 w-3"
                          />
                          <Label htmlFor="edit-horario" className="text-[10px] cursor-pointer">
                            Horario especifico
                          </Label>
                        </div>
                        {bloqueoHorario && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px]">Hora inicio</Label>
                              <Input
                                className="h-7 text-xs"
                                type="time"
                                value={horaInicio}
                                onChange={(e) => setHoraInicio(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px]">Hora fin</Label>
                              <Input
                                className="h-7 text-xs"
                                type="time"
                                value={horaFin}
                                onChange={(e) => setHoraFin(e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setEditId(null)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleUpdate(b.id)}
                            disabled={saving}
                          >
                            Guardar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                return (
                  <div
                    key={b.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${activo ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800' : 'bg-muted/30 opacity-60'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${info.color}`} />
                      <div>
                        <p className="text-sm font-medium">{b.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBloqueoFecha(b.fechaInicio, b.fechaFin)}
                          {!activo && (
                            <span className="ml-2 text-muted-foreground/50">(finalizado)</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={activo ? 'default' : 'secondary'}
                        className={`text-xs ${activo ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : ''}`}
                      >
                        {info.label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startEdit(b)}
                        title="Editar bloqueo"
                        aria-label="Editar bloqueo"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Eliminar bloqueo"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(b.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
