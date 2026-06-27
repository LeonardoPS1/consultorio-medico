import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { canAccess } from '@/lib/features';
import { ReportesClient } from './reportes-client';
import type { Periodo } from './types';
import type { ReporteApiResponse } from './types';

export const dynamic = 'force-dynamic';

async function fetchReportes(periodo: Periodo): Promise<ReporteApiResponse | null> {
  try {
    const res = await fetch(
      `http://localhost:3000/api/reportes?periodo=${periodo}&demo=true`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function ReportesPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const plan = session.user?.plan ?? 'free';
  const isAdvancedReports = canAccess(plan, 'reportes-avanzados');

  const initialData = await fetchReportes('mes');

  return (
    <ReportesClient
      initialData={initialData}
      isAdvancedReports={isAdvancedReports}
    />
  );
}
