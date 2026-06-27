'use client';

import { usePatientPanel } from '@/lib/hooks/use-patient-panel';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { PatientSearch } from './patient-search';
import { PatientSummary } from './patient-summary';

export function PatientPanel() {
  const { isOpen, close, data } = usePatientPanel();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent
        side="right"
        className="w-[85vw] sm:w-[420px] sm:max-w-[420px] p-0 flex flex-col gap-0"
      >
        <SheetHeader className="px-4 pt-4 pb-2 space-y-0">
          <SheetTitle className="text-sm font-semibold">
            {data?.patient ? `${data.patient.nombre} ${data.patient.apellido}` : 'Pacientes'}
          </SheetTitle>
          <SheetDescription className="text-[11px] text-muted-foreground">
            {data?.patient
              ? 'Resumen clínico rápido'
              : 'Busca un paciente por nombre, RUT o teléfono'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 flex flex-col overflow-hidden px-4 pb-4">
          {data?.patient ? <PatientSummary /> : <PatientSearch />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
