'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Store, Plus, Loader2, Pencil, MapPin, Phone, Mail, Check, X } from 'lucide-react';
import { PageHeader } from '@/components/page-header';

interface Sucursal {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
}

export default function AdminSucursalesPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [list, setList] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Sucursal | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  if (session?.user?.role !== 'admin') {
    redirect('/dashboard');
  }

  const load = () => {
    setLoading(true);
    fetch('/api/admin/sucursales')
      .then(r => r.json())
      .then(data => setList(Array.isArray(data) ? data : []))
      .catch(() => toast({ title: 'Error al cargar sucursales', variant: 'destructive' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (session?.user?.role === 'admin') load();
  }, [session]);

  const openNew = () => {
    setEditing(null);
    setNombre('');
    setDireccion('');
    setTelefono('');
    setEmail('');
    setShowModal(true);
  };

  const openEdit = (s: Sucursal) => {
    setEditing(s);
    setNombre(s.nombre);
    setDireccion(s.direccion || '');
    setTelefono(s.telefono || '');
    setEmail(s.email || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!nombre.trim()) {
      toast({ title: 'El nombre es requerido', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const url = editing
        ? '/api/admin/sucursales'
        : '/api/admin/sucursales';
      const method = editing ? 'PATCH' : 'POST';
      const body = editing
        ? { id: editing.id, nombre, direccion, telefono, email }
        : { nombre, direccion, telefono, email };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast({ title: editing ? 'Sucursal actualizada' : 'Sucursal creada' });
        setShowModal(false);
        load();
      } else {
        const err = await res.json();
        toast({ title: err.error || 'Error al guardar', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error de conexión', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (s: Sucursal) => {
    const res = await fetch('/api/admin/sucursales', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, activo: !s.activo }),
    });
    if (res.ok) {
      toast({ title: s.activo ? 'Sucursal desactivada' : 'Sucursal activada' });
      load();
    }
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <PageHeader title="Sucursales" description="Gestioná las sucursales del consultorio" />
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" />
          Nueva Sucursal
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Store className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No hay sucursales aún</p>
            <Button variant="outline" className="mt-4" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> Crear primera sucursal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map(s => (
            <Card key={s.id} className={!s.activo ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Store className="h-4 w-4 text-primary" />
                    {s.nombre}
                  </CardTitle>
                  <Badge variant={s.activo ? 'default' : 'secondary'}>
                    {s.activo ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {s.direccion && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>{s.direccion}</span>
                  </div>
                )}
                {s.telefono && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{s.telefono}</span>
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span>{s.email}</span>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleActivo(s)}>
                    {s.activo ? <X className="h-3.5 w-3.5 mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                    {s.activo ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Sucursal' : 'Nueva Sucursal'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Actualizá los datos de la sucursal' : 'Agregá una nueva sucursal o sede'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Sede Centro" />
            </div>
            <div className="space-y-1">
              <Label>Dirección</Label>
              <Textarea value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Dirección de la sucursal" rows={2} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Teléfono</Label>
                <Input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+56 9 1234 5678" />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="sucursal@consultorio.cl" type="email" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {editing ? 'Guardar cambios' : 'Crear sucursal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
