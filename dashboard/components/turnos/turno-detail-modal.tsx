'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';

// ─── Types ────────────────────────────────────────────────

interface TurnoData {
  id: string;
  hora: string;
  paciente: string;
  tipo: string;
  medico: string;
  medicoId: string;
  pacienteId: string;
  estado: string;
  fecha: string;
}

interface TurnoDetailModalProps {
  editTurno: TurnoData | null;
  onOpenChange: (open: boolean) => void;
  onSaveEdit: (id: string, fecha: string, hora: string) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────

export function TurnoDetailModal({ editTurno, onOpenChange, onSaveEdit }: TurnoDetailModalProps) {
  const [saving, setSaving] = useState(false);

  return (
    <Dialog
      open={!!editTurno}
      onOpenChange={(o) => {
        if (!o) onOpenChange(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Turno</DialogTitle>
          <DialogDescription>Modificá los datos del turno</DialogDescription>
        </DialogHeader>
        {editTurno && (
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Paciente</Label>
              <Input id="edit-paciente" defaultValue={editTurno.paciente} disabled />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Fecha</Label>
                <Input id="edit-fecha" type="date" defaultValue={editTurno.fecha} />
              </div>
              <div className="space-y-1">
                <Label>Hora</Label>
                <Input id="edit-hora" type="time" defaultValue={editTurno.hora} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select defaultValue={editTurno.estado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="confirmada">Confirmada</SelectItem>
                  <SelectItem value="en_consulta">En consulta</SelectItem>
                  <SelectItem value="en_atencion">En atención</SelectItem>
                  <SelectItem value="atendido">Atendido</SelectItem>
                  <SelectItem value="completada">Completada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                  <SelectItem value="no_asistio">No asistió</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={saving}
            onClick={async () => {
              if (!editTurno) return;
              setSaving(true);
              const fechaEl = document.getElementById('edit-fecha') as HTMLInputElement;
              const horaEl = document.getElementById('edit-hora') as HTMLInputElement;
              const fecha = fechaEl?.value;
              const hora = horaEl?.value;
              try {
                await onSaveEdit(editTurno.id, fecha || editTurno.fecha, hora || editTurno.hora);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Cancel Turno Dialog ─────────────────────────────────

interface CancelTurnoDialogProps {
  showCancelDialog: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirmCancel: (id: string, motivo: string) => Promise<void>;
}

export function CancelTurnoDialog({
  showCancelDialog,
  onOpenChange,
  onConfirmCancel,
}: CancelTurnoDialogProps) {
  const [canceling, setCanceling] = useState(false);

  return (
    <Dialog
      open={!!showCancelDialog}
      onOpenChange={(o) => {
        if (!o) onOpenChange(false);
      }}
    >
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Cancelar Turno</DialogTitle>
          <DialogDescription>¿Estás seguro de que querés cancelar este turno?</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Motivo de cancelación</Label>
          <Input id="motivoCancelacion" placeholder="Ej: El paciente solicitó cancelación" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Volver
          </Button>
          <Button
            variant="destructive"
            disabled={canceling}
            onClick={async () => {
              if (showCancelDialog) {
                setCanceling(true);
                const motivo =
                  (document.getElementById('motivoCancelacion') as HTMLInputElement)?.value || '';
                try {
                  await onConfirmCancel(showCancelDialog, motivo);
                } finally {
                  setCanceling(false);
                }
              }
            }}
          >
            {canceling ? 'Cancelando...' : 'Confirmar cancelación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
