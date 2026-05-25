/**
 * Portal Historial — Historial médico del paciente
 */

import { getPortalSession } from '@/lib/portal-auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import PortalHistorialClient from './portal-historial-client';

export default async function PortalHistorialPage() {
  const session = await getPortalSession();
  if (!session) redirect('/portal');

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('portal_session')?.value;

  let historial: Record<string, unknown>[] = [];
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/portal/historial`, {
      headers: { Cookie: `portal_session=${sessionCookie}` },
    });
    const data = await res.json();
    historial = data.historial || [];
  } catch (e) {
    console.error('Portal historial fetch error:', e);
  }

  return <PortalHistorialClient historial={historial as any} />;
}
