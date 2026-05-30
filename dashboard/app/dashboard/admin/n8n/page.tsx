import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { canAccess } from '@/lib/features';
import { getN8nStats } from '@/lib/services/n8n-monitor';
import N8nClient from './n8n-client';
import { PageHeader } from '@/components/page-header';

export default async function N8nAdminPage() {
  const session = await auth();
  if (session?.user?.role !== 'admin') redirect('/dashboard');
  if (!canAccess(session?.user?.plan ?? 'free', 'integraciones')) redirect('/dashboard');

  const stats = await getN8nStats();

  return (
    <div className="space-y-6 animate-in">
      <PageHeader title="n8n Monitor" />
      <N8nClient initialStats={stats} />
    </div>
  );
}
