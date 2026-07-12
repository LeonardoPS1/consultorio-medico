'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface NuevoPacienteConfirmDialogProps {
  open: boolean;
  nombre: string;
  apellido: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function NuevoPacienteConfirmDialog({
  open,
  nombre,
  apellido,
  onClose,
  onConfirm,
}: NuevoPacienteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Paciente no encontrado</DialogTitle>
          <DialogDescription>No se encontró un paciente con ese nombre.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <p className="text-sm">
            ¿Querés crear un nuevo paciente con los datos{' '}
            <strong>
              {nombre} {apellido}
            </strong>
            ?
          </p>
          <p className="text-xs text-muted-foreground">
            Se va a crear con teléfono placeholder (0000000000). Recordá completar sus datos
            después desde la ficha del paciente.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onConfirm}>
            Sí, crear paciente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
