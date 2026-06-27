import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAuditLogs } from '@/lib/audit-log';
import { AuditoriaClient } from './auditoria-client';

export const dynamic = 'force-dynamic';

export default async function AdminAuditoriaPage() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') redirect('/dashboard');

  const result = await getAuditLogs({ limit: 50, offset: 0 });

  return (
    <AuditoriaClient
      initialLogs={result.logs}
      initialTotal={result.total}
    />
  );
}
