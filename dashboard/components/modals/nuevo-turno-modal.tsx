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
import { Loader2 } from 'lucide-react';

interface MedicoOption {
  id: string;
  nombre: string;
}

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
  const [medicoId, setMedicoId] = useState('');
  const [medicoNombre, setMedicoNombre] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState('09:00');
  const [loading, setLoading] = useState(false);
  const [medicos, setMedicos] = useState<MedicoOption[]>([]);
  const [loadingMedicos, setLoadingMedicos] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Cargar médicos desde la API
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingMedicos(true);
    fetch('/api/medicos')
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const lista: MedicoOption[] = json.data || [];
        setMedicos(lista);
        if (lista.length > 0) {
          setMedicoId(lista[0].id);
          setMedicoNombre(lista[0].nombre);
        }
      })
      .catch(() => {
        if (!cancelled) setMedicos([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingMedicos(false);
      });
    return () => { cancelled = true; };
  }, [open]);

  // Sincronizar pacienteName si cambia externamente
  useEffect(() => {
    if (pacienteName) setPaciente(pacienteName);
  }, [pacienteName]);

  // Resetear formulario al cerrar
  useEffect(() => {
    if (!open) {
      setLoading(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, [open]);

  const handleMedicoChange = (value: string) => {
    setMedicoId(value);
    const found = medicos.find((m) => m.id === value);
    setMedicoNombre(found?.nombre || value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    timeoutRef.current = setTimeout(() => {
      onSubmit({
        pacienteId: propPacienteId,
        paciente,
        tipo,
        medicoId,
        medico: medicoNombre,
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
              {loadingMedicos ? (
                <div className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando médicos...
                </div>
              ) : medicos.length === 0 ? (
                <div className="flex h-10 w-full items-center rounded-md border border-dashed border-destructive/50 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  No hay médicos registrados
                </div>
              ) : (
                <Select value={medicoId} onValueChange={handleMedicoChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {medicos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
            <Button type="submit" disabled={loading || !paciente.trim() || loadingMedicos || medicos.length === 0}>
              {loading ? 'Creando...' : 'Crear Turno'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
