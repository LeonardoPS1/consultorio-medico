/**
 * Portal Agendar — Booking Wizard con selección de médico, horario y confirmación.
 * Server component: verifica sesión y carga médicos disponibles.
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
    <div>
      <BookingWizard medicos={medicos} />
    </div>
  );
}
