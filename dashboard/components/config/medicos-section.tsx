'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Stethoscope, Pencil, X, CalendarX, Clock, ChevronDown, Store } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { BloqueosDialog } from '@/components/config/bloqueos-dialog';
import { Switch } from '@/components/ui/switch';

interface Medico {
  id: string;
  nombre: string;
  especialidad: string;
  email: string | null;
  telefono: string | null;
  whatsapp: string | null;
  matricula: string | null;
  duracionTurnoMinutos: number;
  activo: boolean;
}

interface Props {
  plan: string;
}

const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

const DEFAULT_HORARIOS: Record<string, { activo: boolean; inicio: string; fin: string }> = {
  Lunes: { activo: true, inicio: '09:00', fin: '18:00' },
  Martes: { activo: true, inicio: '09:00', fin: '18:00' },
  Miercoles: { activo: true, inicio: '09:00', fin: '18:00' },
  Jueves: { activo: true, inicio: '09:00', fin: '18:00' },
  Viernes: { activo: true, inicio: '09:00', fin: '18:00' },
  Sabado: { activo: true, inicio: '09:00', fin: '13:00' },
  Domingo: { activo: false, inicio: '09:00', fin: '18:00' },
};

export function MedicosSection({ plan }: Props) {
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editMedico, setEditMedico] = useState<Medico | null>(null);

  // Form state
  const [nombre, setNombre] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const [matricula, setMatricula] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [duracion, setDuracion] = useState(30);
  const [saving, setSaving] = useState(false);
  const [bloqueosMedicoId, setBloqueosMedicoId] = useState<string | null>(null);
  const [showHorarios, setShowHorarios] = useState(false);
  const [horarios, setHorarios] = useState<Record<string, { activo: boolean; inicio: string; fin: string }>>({ ...DEFAULT_HORARIOS });
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([]);
  const [sucursalId, setSucursalId] = useState('');

  useEffect(() => {
    fetch('/api/sucursales')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSucursales(data); })
      .catch(() => {});
  }, []);

  const fetchMedicos = () => {
    fetch('/api/medicos')
      .then(r => r.json())
      .then(d => setMedicos(d.data || []))
      .catch(() => toast({ title: 'Error al cargar médicos', variant: 'destructive' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMedicos(); }, []);

  const resetForm = () => {
    setNombre(''); setEspecialidad(''); setMatricula('');
    setWhatsapp(''); setEmail(''); setDuracion(30);
    setShowHorarios(false); setHorarios({ ...DEFAULT_HORARIOS });
    setSucursalId('');
  }; 

  const openEdit = (m: Medico & { horarios?: any; sucursal_id?: string }) => {
    setEditMedico(m);
    setNombre(m.nombre);
    setEspecialidad(m.especialidad);
    setMatricula(m.matricula || '');
    setWhatsapp(m.whatsapp || '');
    setEmail(m.email || '');
    setDuracion(m.duracionTurnoMinutos);
    setSucursalId((m as any).sucursal_id || '');
    // Cargar horarios si existen, sino defaults
    if (m.horarios && typeof m.horarios === 'object' && Object.keys(m.horarios).length > 0) {
      const merged = { ...DEFAULT_HORARIOS };
      for (const dia of DIAS) {
        if (m.horarios[dia]) {
          merged[dia] = { ...merged[dia], ...m.horarios[dia] };
        }
      }
      setHorarios(merged);
    } else {
      setHorarios({ ...DEFAULT_HORARIOS });
    }
    setShowHorarios(Object.keys(m.horarios || {}).length > 0);
  };

  const handleSave = async () => {
    if (!nombre.trim() || !especialidad.trim()) return;
    setSaving(true);
    try {
      const method = editMedico ? 'PATCH' : 'POST';
      const url = editMedico ? `/api/medicos/${editMedico.id}` : '/api/medicos';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, especialidad, matricula: matricula || null, whatsapp: whatsapp || null, email: email || null, duracionTurnoMinutos: duracion, horarios, sucursalId: sucursalId || null }),
      });
      if (!res.ok) throw new Error();
      toast({ title: editMedico ? 'Médico actualizado' : 'Médico creado' });
      setShowNew(false); setEditMedico(null); resetForm(); fetchMedicos();
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleToggleActivo = async (m: Medico) => {
    try {
      await fetch(`/api/medicos/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !m.activo }),
      });
      fetchMedicos();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              Médicos
            </CardTitle>
            <CardDescription>Profesionales que atienden en el consultorio</CardDescription>
          </div>
          <Button size="sm" onClick={() => { resetForm(); setShowNew(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Agregar médico
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="h-14 skeleton rounded-lg" />)}
            </div>
          ) : medicos.length === 0 ? (
            <div className="text-center py-8">
              <Stethoscope className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Sin médicos registrados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {medicos.map((m) => (
                <div key={m.id} className={`flex items-center justify-between p-3 rounded-lg ${m.activo ? 'bg-muted/30' : 'bg-muted/10 opacity-60'}`}>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                      {m.nombre.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{m.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.especialidad}
                        {m.matricula && ` · Mat. ${m.matricula}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{m.duracionTurnoMinutos}min</Badge>
                    <Badge variant={m.activo ? 'default' : 'secondary'} className="text-xs cursor-pointer" onClick={() => handleToggleActivo(m)}>
                      {m.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hoverable:hover:text-amber-700" title="Gestionar bloqueos" onClick={() => setBloqueosMedicoId(m.id)}>
                      <CalendarX className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal crear/editar médico */}
      <Dialog open={showNew || !!editMedico} onOpenChange={(o) => { if (!o) { setShowNew(false); setEditMedico(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editMedico ? 'Editar médico' : 'Nuevo médico'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nombre *</Label>
                <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Dr. García" />
              </div>
              <div className="space-y-1">
                <Label>Especialidad *</Label>
                <Input value={especialidad} onChange={e => setEspecialidad(e.target.value)} placeholder="Clínica Médica" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Matrícula</Label>
                <Input value={matricula} onChange={e => setMatricula(e.target.value)} placeholder="MN 12345" />
              </div>
              <div className="space-y-1">
                <Label>WhatsApp</Label>
                <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+54911..." />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="doctor@consultorio.com" />
            </div>
            <div className="space-y-1">
              <Label>Duracion turno (min)</Label>
              <Input type="number" value={duracion} onChange={e => setDuracion(Number(e.target.value))} min={10} max={120} />
            </div>
            {/* Sucursal */}
            {sucursales.length > 0 && (
              <div className="space-y-1">
                <Label>Sucursal</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={sucursalId}
                  onChange={e => setSucursalId(e.target.value)}
                >
                  <option value="">Sin sucursal</option>
                  {sucursales.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Horarios */}
            <div className="border rounded-lg">
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
                onClick={() => setShowHorarios(!showHorarios)}
              >
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Horarios de atencion
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showHorarios ? 'rotate-180' : ''}`} />
              </button>
              {showHorarios && (
                <div className="px-3 pb-3 space-y-1">
                  {DIAS.map((dia) => (
                    <div key={dia} className="flex items-center gap-2 py-0.5">
                      <Switch
                        checked={horarios[dia]?.activo ?? false}
                        onCheckedChange={(v) => setHorarios(prev => ({ ...prev, [dia]: { ...prev[dia], activo: v } }))}
                      />
                      <span className="text-xs w-20 shrink-0">{dia}</span>
                      <Input
                        type="time"
                        className="h-7 w-24 text-xs"
                        value={horarios[dia]?.inicio || '09:00'}
                        onChange={(e) => setHorarios(prev => ({ ...prev, [dia]: { ...prev[dia], inicio: e.target.value } }))}
                        disabled={!horarios[dia]?.activo}
                      />
                      <span className="text-xs text-muted-foreground">a</span>
                      <Input
                        type="time"
                        className="h-7 w-24 text-xs"
                        value={horarios[dia]?.fin || '18:00'}
                        onChange={(e) => setHorarios(prev => ({ ...prev, [dia]: { ...prev[dia], fin: e.target.value } }))}
                        disabled={!horarios[dia]?.activo}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNew(false); setEditMedico(null); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !nombre.trim() || !especialidad.trim()}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de bloqueos */}
      {bloqueosMedicoId && (
        <BloqueosDialog
          medicoId={bloqueosMedicoId}
          medicoNombre={medicos.find(m => m.id === bloqueosMedicoId)?.nombre || 'Médico'}
          open={!!bloqueosMedicoId}
          onOpenChange={(v) => { if (!v) setBloqueosMedicoId(null); }}
        />
      )}
    </>
  );
}
