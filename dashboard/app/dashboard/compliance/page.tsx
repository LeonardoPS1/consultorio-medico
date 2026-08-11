import { redirect } from 'next/navigation';
import { getEffectiveSession } from '@/lib/auth-effective';
import { canAccess } from '@/lib/features';
import { ComplianceClient } from './compliance-client';
import type { ComplianceData, AccesoAuditoria, SolicitudARCO, Paginacion } from './types';

export const dynamic = 'force-dynamic';

async function fetchComplianceData(): Promise<ComplianceData | null> {
  try {
    const res = await fetch(
      'http://localhost:3000/api/compliance?periodo=mes&demo=true',
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchAuditoriaData(): Promise<{ accesos: AccesoAuditoria[]; paginacion: Paginacion } | null> {
  try {
    const res = await fetch('http://localhost:3000/api/auditoria-accesos?pagina=1&limite=50', {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchArcData(): Promise<{ solicitudes: SolicitudARCO[]; paginacion: Paginacion } | null> {
  try {
    const res = await fetch('http://localhost:3000/api/arco?pagina=1&limite=50', {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 *
 */
export default async function CompliancePage() {
  const session = await getEffectiveSession();
  if (!session) redirect('/login');

  const plan = session.user?.plan ?? 'free';
  if (!canAccess(plan, 'compliance')) {
    redirect('/dashboard');
  }

  const [initialData, auditoriaData, arcoData] = await Promise.all([
    fetchComplianceData(),
    fetchAuditoriaData(),
    fetchArcData(),
  ]);

  return (
    <ComplianceClient
      initialData={initialData}
      initialAuditoriaData={auditoriaData}
      initialArcData={arcoData}
    />
  );
}