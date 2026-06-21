/**
 * Portal Agendar Turno — Booking desde el portal del paciente
 *
 * Server component: verifica sesión y pasa los médicos
 * disponibles al wizard client-side.
 */

import { getPortalSession } from '@/lib/portal-auth';
import { redirect } from 'next/navigation';
import { medicosDisponiblesPortal } from '@/lib/services/portal-booking';
import { BookingWizard } from '@/components/portal/booking-wizard';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { reschedule?: string };
}

export default async function AgendarPage({ searchParams }: Props) {
  const session = await getPortalSession();
  if (!session) redirect('/portal');

  const medicos = await medicosDisponiblesPortal();
  const rescheduleTurnoId = searchParams.reschedule;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {rescheduleTurnoId ? 'Reagendar turno' : 'Agendar turno'}
        </h1>
        <p className="text-muted-foreground">
          {rescheduleTurnoId
            ? 'Elegí un nuevo horario para tu consulta. El turno anterior será cancelado automáticamente.'
            : 'Seleccioná el médico, el día y el horario para tu consulta.'}
        </p>
      </div>
      <BookingWizard medicos={medicos} rescheduleTurnoId={rescheduleTurnoId} />
    </div>
  );
}
