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

export default async function AgendarPage() {
  const session = await getPortalSession();
  if (!session) redirect('/portal');

  const medicos = await medicosDisponiblesPortal();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agendar turno</h1>
        <p className="text-muted-foreground">Seleccioná el médico, el día y el horario para tu consulta.</p>
      </div>
      <BookingWizard medicos={medicos} />
    </div>
  );
}
