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

// ─── Waitlist Reassign Dialog ─────────────────────────────

interface WaitlistReassignDialogProps {
  open: boolean;
  pacienteNombre: string;
  waitlistCandidates: any[];
  waitlistReassignLoading: boolean;
  onClose: () => void;
}

export function WaitlistReassignDialog({
  open,
  pacienteNombre,
  waitlistCandidates,
  waitlistReassignLoading,
  onClose,
}: WaitlistReassignDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Hay pacientes en lista de espera</DialogTitle>
          <DialogDescription>
            El turno quedó libre. ¿Querés asignarlo a un paciente en lista de espera?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <p className="text-sm">
            Paciente: <strong>{pacienteNombre}</strong> quedó libre.
          </p>
          {waitlistReassignLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground">Buscando candidatos...</span>
            </div>
          ) : waitlistCandidates.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Candidatos en lista de espera:</p>
              {waitlistCandidates.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={onClose}
                >
                  <div>
                    <p className="font-medium text-sm">
                      {c.paciente?.nombre} {c.paciente?.apellido}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      En lista desde: {new Date(c.fechaInscripcion).toLocaleDateString()}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    Asignar
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                No hay pacientes en lista de espera para este médico.
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Waitlist Proposal Dialog ─────────────────────────────

interface WaitlistProposalDialogProps {
  open: boolean;
  proposal: {
    pacienteNombre: string;
    medicoNombre: string;
    fecha: string;
    hora: string;
    reason: string;
  } | null;
  waitlistLoading: boolean;
  onClose: () => void;
  onAddToWaitlist: () => Promise<void>;
}

export function WaitlistProposalDialog({
  open,
  proposal,
  waitlistLoading,
  onClose,
  onAddToWaitlist,
}: WaitlistProposalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Sin disponibilidad</DialogTitle>
          <DialogDescription>{proposal?.reason}</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <p className="text-sm">
            No se puede crear el turno para <strong>{proposal?.pacienteNombre}</strong>{' '}
            con <strong>{proposal?.medicoNombre}</strong> el {proposal?.fecha} a
            las {proposal?.hora}.
          </p>
          <p className="text-sm text-muted-foreground">
            ¿Querés agregar al paciente a la lista de espera? Cuando haya un turno disponible,
            recibirá una oferta automática por WhatsApp.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={waitlistLoading}
            onClick={onAddToWaitlist}
          >
            {waitlistLoading ? 'Agregando...' : 'Sí, agregar a lista de espera'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
