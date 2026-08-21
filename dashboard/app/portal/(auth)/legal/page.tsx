/**
 * Portal Legal — Sección Legal y Cumplimiento del Portal del Paciente
 * Políticas de Privacidad, Aviso Legal y Términos y Condiciones adaptados al paciente
 * Conforme a Ley 19.628, Ley 21.719, Ley 20.584, Ley 19.496
 */

import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getPortalSession } from '@/lib/portal-auth';
import PortalLegalClient from './portal-legal-client';

export const metadata: Metadata = {
  title: 'Legal y Cumplimiento | Portal del Paciente',
  description:
    'Políticas de privacidad, aviso legal y términos de uso del portal del paciente AicoreMed. Cumplimiento Ley 19.628, 21.719, 20.584, 19.496.',
};

export const dynamic = 'force-dynamic';

/**
 *
 */
export default async function PortalLegalPage() {
  const session = await getPortalSession();
  if (!session) redirect('/portal');

  return <PortalLegalClient />;
}
