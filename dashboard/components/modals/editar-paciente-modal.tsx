'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/select';
import { SISTEMAS_SALUD, ISAPRES_CHILENAS } from '@/lib/isapres';

interface Region {
  id: string;
  nombre: string;
  numeroRomano: string | null;
}

interface Comuna {
  id: string;
  nombre: string;
}

interface PacienteData {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string | null;
  dni: string | null;
  fechaNacimiento: string | null;
  direccion: string | null;
  obraSocial: string | null;
  sistemaSalud: string | null;
  isapreNombre: string | null;
  regionId: string | null;
  comunaId: string | null;
}

interface EditarPacienteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paciente: PacienteData;
  onSaved: (updated: PacienteData) => void;
}

function formatTelefonoChile(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('9')) return `+569${digits}`;
  if (digits.startsWith('569') && digits.length === 12) return `+${digits}`;
  return value;
}

export function EditarPacienteModal({ open, onOpenChange, paciente, onSaved }: EditarPacienteModalProps) {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [dni, setDni] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [direccion, setDireccion] = useState('');
  const [sistemaSalud, setSistemaSalud] = useState('particular');
  const [isapreNombre, setIsapreNombre] = useState('');
  const [regionId, setRegionId] = useState('');
  const [comunaId, setComunaId] = useState('');
  const [loading, setLoading] = useState(false);

  // Regiones/comunas
  const [regiones, setRegiones] = useState<Region[]>([]);
  const [comunas, setComunas] = useState<Comuna[]>([]);
  const [loadingComunas, setLoadingComunas] = useState(false);

  // Inicializar valores cuando se abre el modal o cambia el paciente
  useEffect(() => {
    if (open && paciente) {
      setNombre(paciente.nombre || '');
      setApellido(paciente.apellido || '');
      setTelefono(paciente.telefono || '');
      setEmail(paciente.email || '');
      setDni(paciente.dni || '');
      setFechaNacimiento(paciente.fechaNacimiento ? paciente.fechaNacimiento.split('T')[0] : '');
      setDireccion(paciente.direccion || '');
      setSistemaSalud(paciente.sistemaSalud || 'particular');
      setIsapreNombre(paciente.isapreNombre || '');
      setRegionId(paciente.regionId || '');
      setComunaId(paciente.comunaId || '');
    }
  }, [open, paciente]);

  // Cargar regiones al abrir el modal
  useEffect(() => {
    if (open) {
      fetch('/api/regiones')
        .then(r => r.json())
        .then(data => setRegiones(data.data || []))
        .catch(() => {});
    }
  }, [open]);

  // Cargar comunas al cambiar región
  useEffect(() => {
    if (!regionId) { setComunas([]); return; }
    setLoadingComunas(true);
    fetch(`/api/comunas?region_id=${regionId}`)
      .then(r => r.json())
      .then(data => setComunas(data.data || []))
      .catch(() => {})
      .finally(() => setLoadingComunas(false));
  }, [regionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !apellido.trim() || !telefono.trim()) return;

    setLoading(true);
    try {
      const isapreValue = sistemaSalud === 'isapre' ? isapreNombre : null;
      const body: Record<string, unknown> = {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: formatTelefonoChile(telefono),
        email: email.trim() || null,
        dni: dni.trim() || null,
        fechaNacimiento: fechaNacimiento || null,
        direccion: direccion.trim() || null,
        sistemaSalud,
        isapreNombre: isapreValue,
        obraSocial: isapreValue || sistemaSalud || 'Particular',
        regionId: regionId || null,
        comunaId: comunaId || null,
      };

      const res = await fetch(`/api/pacientes/${paciente.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar');
      }

      const updated = await res.json();
      onSaved(updated.data || updated);
      onOpenChange(false);
    } catch (err) {
      console.error('Error al editar paciente:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Paciente</DialogTitle>
          <DialogDescription>
            Modificá los datos del paciente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nombre">Nombre *</Label>
              <Input
                id="edit-nombre"
                placeholder="Nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-apellido">Apellido *</Label>
              <Input
                id="edit-apellido"
                placeholder="Apellido"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-telefono">Teléfono *</Label>
            <Input
              id="edit-telefono"
              placeholder="+569XXXXXXXX"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              placeholder="paciente@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-dni">RUT / DNI</Label>
              <Input
                id="edit-dni"
                placeholder="12345678-9"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-fecha-nacimiento">Fecha de Nacimiento</Label>
              <Input
                id="edit-fecha-nacimiento"
                type="date"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-direccion">Dirección</Label>
            <Input
              id="edit-direccion"
              placeholder="Calle, número, comuna"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Sistema de Salud</Label>
            <Select value={sistemaSalud} onValueChange={(val) => { setSistemaSalud(val); setIsapreNombre(''); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SISTEMAS_SALUD.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {sistemaSalud === 'isapre' && (
            <div className="space-y-2">
              <Label>Isapre</Label>
              <Select value={isapreNombre} onValueChange={setIsapreNombre}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná una Isapre" />
                </SelectTrigger>
                <SelectContent>
                  {ISAPRES_CHILENAS.map((i) => (
                    <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Región */}
          <div className="space-y-2">
            <Label>Región</Label>
            <Select value={regionId} onValueChange={(val) => { setRegionId(val); setComunaId(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná una región" />
              </SelectTrigger>
              <SelectContent>
                {regiones.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.numeroRomano ? `${r.numeroRomano} - ` : ''}{r.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Comuna */}
          <div className="space-y-2">
            <Label>Comuna</Label>
            <Select
              value={comunaId}
              onValueChange={setComunaId}
              disabled={!regionId || loadingComunas}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingComunas ? 'Cargando...' : 'Seleccioná una comuna'} />
              </SelectTrigger>
              <SelectContent>
                {comunas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !nombre.trim() || !apellido.trim() || !telefono.trim()}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
