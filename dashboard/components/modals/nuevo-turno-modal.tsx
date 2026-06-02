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

interface NuevoTurnoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    pacienteId?: string;
    paciente: string;
    tipo: string;
    medicoId: string;
    medico: string;
    hora: string;
    fecha: string;
  }) => void;
  pacienteId?: string;
  pacienteName?: string;
}

export function NuevoTurnoModal({ open, onOpenChange, onSubmit, pacienteId: propPacienteId, pacienteName }: NuevoTurnoModalProps) {
  const [paciente, setPaciente] = useState(pacienteName || '');
  const [tipo, setTipo] = useState('Consulta');
  const [medico, setMedico] = useState('Dr. García');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState('09:00');
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Sincronizar pacienteName si cambia externamente
  useEffect(() => {
    if (pacienteName) setPaciente(pacienteName);
  }, [pacienteName]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simular creación
    timeoutRef.current = setTimeout(() => {
      onSubmit({
        pacienteId: propPacienteId,
        paciente,
        tipo,
        medicoId: '',
        medico,
        hora,
        fecha,
      });
      setLoading(false);
      onOpenChange(false);
      // Reset
      if (!propPacienteId) setPaciente('');
      setTipo('Consulta');
      setHora('09:00');
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nuevo Turno</DialogTitle>
          <DialogDescription>
            Agendá un nuevo turno para un paciente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paciente">Paciente</Label>
            {pacienteName ? (
              <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm font-medium">
                {pacienteName}
              </div>
            ) : (
              <Input
                id="paciente"
                placeholder="Nombre del paciente"
                value={paciente}
                onChange={(e) => setPaciente(e.target.value)}
                required
                autoFocus
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de consulta</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Consulta">Consulta</SelectItem>
                  <SelectItem value="Control">Control</SelectItem>
                  <SelectItem value="Resultados">Resultados</SelectItem>
                  <SelectItem value="Especialista">Especialista</SelectItem>
                  <SelectItem value="Primera vez">Primera vez</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Médico</Label>
              <Select value={medico} onValueChange={setMedico}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dr. García">Dr. García</SelectItem>
                  <SelectItem value="Dra. López">Dra. López</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora">Hora</Label>
              <Input
                id="hora"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !paciente.trim()}>
              {loading ? 'Creando...' : 'Crear Turno'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
