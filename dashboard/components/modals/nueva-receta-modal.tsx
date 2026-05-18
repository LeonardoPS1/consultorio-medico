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
import { Textarea } from '@/components/ui/textarea';

interface NuevaRecetaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: {
    paciente: string;
    medicamento: string;
    dosis: string;
    duracion: string;
    indicaciones: string;
  }) => void;
}

export function NuevaRecetaModal({ open, onOpenChange, onSubmit }: NuevaRecetaModalProps) {
  const [paciente, setPaciente] = useState('');
  const [medicamento, setMedicamento] = useState('');
  const [dosis, setDosis] = useState('');
  const [duracion, setDuracion] = useState('');
  const [indicaciones, setIndicaciones] = useState('');
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
      onSubmit?.({ paciente, medicamento, dosis, duracion, indicaciones });
      setLoading(false);
      onOpenChange(false);
      setPaciente('');
      setMedicamento('');
      setDosis('');
      setDuracion('');
      setIndicaciones('');
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Nueva Receta</DialogTitle>
          <DialogDescription>
            Prescribí un nuevo medicamento para un paciente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paciente">Paciente *</Label>
            <Input
              id="paciente"
              placeholder="Nombre del paciente"
              value={paciente}
              onChange={(e) => setPaciente(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="medicamento">Medicamento *</Label>
            <Input
              id="medicamento"
              placeholder="Ej: Amoxicilina 500mg"
              value={medicamento}
              onChange={(e) => setMedicamento(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dosis">Dosis *</Label>
              <Input
                id="dosis"
                placeholder="Ej: 1 comprimido c/8hs"
                value={dosis}
                onChange={(e) => setDosis(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duracion">Duración</Label>
              <Input
                id="duracion"
                placeholder="Ej: 7 días"
                value={duracion}
                onChange={(e) => setDuracion(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="indicaciones">Indicaciones adicionales</Label>
            <Textarea
              id="indicaciones"
              placeholder="Instrucciones especiales para el paciente..."
              value={indicaciones}
              onChange={(e) => setIndicaciones(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !paciente.trim() || !medicamento.trim() || !dosis.trim()}>
              {loading ? 'Creando...' : 'Crear Receta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
