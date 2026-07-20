'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

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
  riskScore?: number | null;
  riskNivel?: 'bajo' | 'medio' | 'alto' | null;
}

function RiskCard({ riskNivel, riskScore }: { riskNivel: 'bajo' | 'medio' | 'alto' | null | undefined; riskScore?: number | null }) {
  if (!riskNivel) {
    return (
      <div className="p-3 bg-muted/50 rounded-lg border">
        <p className="text-sm text-muted-foreground">Score de riesgo no calculado</p>
      </div>
    );
  }

  const config = {
    alto: { icon: AlertTriangle, label: 'Alto riesgo de inasistencia', color: 'destructive', bg: 'bg-destructive/10', border: 'border-destructive/20', desc: 'Se enviará recordatorio extra a las 48h' },
    medio: { icon: HelpCircle, label: 'Riesgo medio de inasistencia', color: 'secondary', bg: 'bg-secondary/10', border: 'border-secondary/20', desc: 'Recordatorios estándar (24h y 1h)' },
    bajo: { icon: ShieldCheck, label: 'Bajo riesgo de inasistencia', color: 'default', bg: 'bg-green-100 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', desc: 'Recordatorios estándar (24h y 1h)' },
  }[riskNivel];

  const Icon = config.icon;

  return (
    <div className={`p-3 rounded-lg border ${config.bg} ${config.border}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 text-${config.color}`} />
        <span className="font-medium text-sm">{config.label}</span>
        {riskScore !== undefined && riskScore !== null && (
          <Badge variant="outline" className="text-xs ml-auto">
            Score: {riskScore}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1">{config.desc}</p>
    </div>
  );
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
              <RiskCard riskNivel={editTurno.riskNivel} riskScore={editTurno.riskScore} />
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
