import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { canAccess } from '@/lib/features';
import { ComplianceClient } from './compliance-client';
import { getDemoComplianceData } from '@/lib/services/compliance';
import type { ComplianceData } from './types';

export const dynamic = 'force-dynamic';

async function fetchData(): Promise<ComplianceData | null> {
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

export default async function CompliancePage() {
  const session = await auth();
  if (!session) redirect('/login');

  const plan = session.user?.plan ?? 'free';
  if (!canAccess(plan, 'compliance')) {
    redirect('/dashboard');
  }

  const initialData = await fetchData();

  return <ComplianceClient initialData={initialData} />;
}
