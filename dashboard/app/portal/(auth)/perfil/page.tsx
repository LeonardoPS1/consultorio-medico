/**
 * Portal Perfil — Editar datos del perfil del paciente
 */

import { getPortalSession } from '@/lib/portal-auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import PortalPerfilClient from './portal-perfil-client';

interface PacienteData {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  email?: string;
  rut?: string;
  obraSocial?: string;
  sistemaSalud?: string;
  isapreNombre?: string;
  regionId?: string;
  comunaId?: string;
  region?: string;
  comuna?: string;
  consentimientoWhatsapp?: boolean;
  consentimientoEmail?: boolean;
}

export default async function PortalPerfilPage() {
  const session = await getPortalSession();
  if (!session) redirect('/portal');

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('portal_session')?.value;

  let paciente: PacienteData = {};
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/portal/me`, {
      headers: { Cookie: `portal_session=${sessionCookie}` },
    });
    const data = await res.json();
    paciente = (data.paciente as PacienteData) || {};
  } catch (e) {
    console.error('Portal perfil fetch error:', e);
  }

  return <PortalPerfilClient paciente={paciente} />;
}
