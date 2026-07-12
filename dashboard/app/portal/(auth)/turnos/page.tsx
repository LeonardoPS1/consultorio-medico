/**
 * Portal Turnos — Lista de turnos del paciente
 * Server component con fetch a la API protegida.
 */

import { getPortalSession } from '@/lib/portal-auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import PortalTurnosClient from './portal-turnos-client';

interface Turno {
  id: string;
  fechaHora: string;
  hora: string;
  estado: string;
  motivo?: string;
  tipoConsulta: string;
  duracionMinutos: number;
  linkVideollamada?: string;
  medicoNombre: string;
  medicoEspecialidad: string;
  pagado: boolean;
}

export default async function PortalTurnosPage() {
  const session = await getPortalSession();
  if (!session) redirect('/portal');

  // Fetch turnos via API interna
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('portal_session')?.value;

  let turnos: Turno[] = [];
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/portal/turnos`, {
      headers: { Cookie: `portal_session=${sessionCookie}` },
    });
    const data = await res.json();
    turnos = (data.turnos as Turno[]) || [];
  } catch (e) {
    console.error('Portal turnos fetch error:', e);
  }

  return <PortalTurnosClient turnos={turnos} />;
}
