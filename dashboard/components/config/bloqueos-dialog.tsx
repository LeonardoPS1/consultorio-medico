'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/select';
import { Plus, Trash2, CalendarX, Calendar, Umbrella, Ban } from 'lucide-react';
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function BloqueosDialog({ medicoId, medicoNombre, open, onOpenChange }: Props & { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  // Form
  const [titulo, setTitulo] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [tipo, setTipo] = useState('vacaciones');
  const [saving, setSaving] = useState(false);

  const fetchBloqueos = () => {
    setLoading(true);
    fetch(`/api/medicos/${medicoId}/bloqueos`)
      .then(r => r.json())
      .then(d => setBloqueos(d.data || []))
      .catch(() => toast({ title: 'Error al cargar bloqueos', variant: 'destructive' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (open) fetchBloqueos(); }, [open, medicoId]);

  const handleCreate = async () => {
    if (!titulo.trim() || !fechaInicio || !fechaFin) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/medicos/${medicoId}/bloqueos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, fechaInicio, fechaFin, tipo }),
      });
      if (!res.ok) { const err = await res.json(); toast({ title: err.error || 'Error', variant: 'destructive' }); return; }
      toast({ title: 'Bloqueo creado' });
      setShowNew(false); setTitulo(''); setFechaInicio(''); setFechaFin('');
      fetchBloqueos();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally { setSaving(false); }
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

  const getTipoInfo = (t: string) => TIPOS_BLOQUEO.find(x => x.value === t) || TIPOS_BLOQUEO[3];

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
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIPOS_BLOQUEO.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Titulo</Label>
                    <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Vacaciones de invierno" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Desde</Label>
                    <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Hasta</Label>
                    <Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowNew(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleCreate} disabled={saving || !titulo.trim() || !fechaInicio || !fechaFin}>
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
              {[1, 2].map(i => <div key={i} className="h-14 skeleton rounded-lg" />)}
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
                return (
                  <div key={b.id} className={`flex items-center justify-between p-3 rounded-lg ${activo ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800' : 'bg-muted/30 opacity-60'}`}>
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${info.color}`} />
                      <div>
                        <p className="text-sm font-medium">{b.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(b.fechaInicio)} → {formatDate(b.fechaFin)}
                          {!activo && <span className="ml-2 text-muted-foreground/50">(finalizado)</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={activo ? 'default' : 'secondary'} className={`text-xs ${activo ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : ''}`}>
                        {info.label}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(b.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
