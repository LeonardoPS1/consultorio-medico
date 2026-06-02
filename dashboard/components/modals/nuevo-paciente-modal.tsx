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

interface NuevoPacienteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: {
    nombre: string;
    apellido: string;
    telefono: string;
    email: string;
    obraSocial: string;
    sistemaSalud?: string;
    isapreNombre?: string;
    regionId?: string;
    comunaId?: string;
  }) => void;
}

/** Agrega prefijo +569 si el teléfono no lo tiene */
function formatTelefonoChile(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('9')) return `+569${digits}`;
  if (digits.startsWith('569') && digits.length === 12) return `+${digits}`;
  return value;
}

export function NuevoPacienteModal({ open, onOpenChange, onSubmit }: NuevoPacienteModalProps) {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [sistemaSalud, setSistemaSalud] = useState('particular');
  const [isapreNombre, setIsapreNombre] = useState('');
  const [regionId, setRegionId] = useState('');
  const [comunaId, setComunaId] = useState('');
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Regiones/comunas
  const [regiones, setRegiones] = useState<Region[]>([]);
  const [comunas, setComunas] = useState<Comuna[]>([]);
  const [loadingComunas, setLoadingComunas] = useState(false);

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

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    timeoutRef.current = setTimeout(() => {
      const isapreValue = sistemaSalud === 'isapre' ? isapreNombre : undefined;
      onSubmit?.({
        nombre,
        apellido,
        telefono: formatTelefonoChile(telefono),
        email,
        obraSocial: isapreValue || sistemaSalud || 'Particular',
        sistemaSalud,
        isapreNombre: isapreValue,
        regionId: regionId || undefined,
        comunaId: comunaId || undefined,
      });
      setLoading(false);
      onOpenChange(false);
      setNombre('');
      setApellido('');
      setTelefono('');
      setEmail('');
      setSistemaSalud('particular');
      setIsapreNombre('');
      setRegionId('');
      setComunaId('');
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nuevo Paciente</DialogTitle>
          <DialogDescription>
            Registra un nuevo paciente en el sistema
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                placeholder="Nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apellido">Apellido *</Label>
              <Input
                id="apellido"
                placeholder="Apellido"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono *</Label>
            <Input
              id="telefono"
              placeholder="+569XXXXXXXX"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="paciente@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
                  <SelectValue placeholder="Selecciona una Isapre" />
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
                <SelectValue placeholder="Selecciona una región" />
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
                <SelectValue placeholder={loadingComunas ? 'Cargando...' : 'Selecciona una comuna'} />
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
              {loading ? 'Registrando...' : 'Registrar Paciente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
