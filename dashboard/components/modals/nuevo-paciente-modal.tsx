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
  }) => void;
}

export function NuevoPacienteModal({ open, onOpenChange, onSubmit }: NuevoPacienteModalProps) {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [sistemaSalud, setSistemaSalud] = useState('particular');
  const [isapreNombre, setIsapreNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

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
        telefono,
        email,
        obraSocial: isapreValue || sistemaSalud || 'Particular',
        sistemaSalud,
        isapreNombre: isapreValue,
      });
      setLoading(false);
      onOpenChange(false);
      setNombre('');
      setApellido('');
      setTelefono('');
      setEmail('');
      setSistemaSalud('particular');
      setIsapreNombre('');
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
