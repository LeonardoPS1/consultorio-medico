/**
 * Portal Recetas — Lista de recetas del paciente
 */

import { getPortalSession } from '@/lib/portal-auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import PortalRecetasClient from './portal-recetas-client';

interface Receta {
  id: string;
  estado: string;
  medicamento: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  indicaciones: string;
  fechaInicio: string;
  fechaFin: string;
  medicoNombre: string;
  medicoEspecialidad: string;
}

export default async function PortalRecetasPage() {
  const session = await getPortalSession();
  if (!session) redirect('/portal');

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('portal_session')?.value;

  let recetas: Receta[] = [];
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/portal/recetas`, {
      headers: { Cookie: `portal_session=${sessionCookie}` },
    });
    const data = await res.json();
    recetas = (data.recetas as Receta[]) || [];
  } catch (e) {
    console.error('Portal recetas fetch error:', e);
  }

  return <PortalRecetasClient recetas={recetas} />;
}
