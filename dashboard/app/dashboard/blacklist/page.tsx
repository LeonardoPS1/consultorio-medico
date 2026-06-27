import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { blacklistService } from '@/lib/services/blacklist';
import { canAccess } from '@/lib/features';
import { BlacklistClient } from './blacklist-client';

export const dynamic = 'force-dynamic';

export default async function BlacklistPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const plan = session.user?.plan ?? 'free';
  if (!canAccess(plan, 'blacklist')) redirect('/dashboard');

  const [result, rawStats] = await Promise.all([
    blacklistService.list({ limit: 50 }),
    blacklistService.getStats(),
  ]);

  const toDateString = (v: string | Date | null | undefined): string | null => {
    if (!v) return null;
    return typeof v === 'string' ? v : v.toISOString();
  };

  const initialData = result.data.map((entry) => ({
    ...entry,
    bloqueadoHasta: toDateString(entry.bloqueadoHasta),
    createdAt: toDateString(entry.createdAt) ?? '',
  }));

  const initialStats = rawStats
    ? {
        total: rawStats.total,
        activos: {
          activos: rawStats.activos.activos ?? 0,
          inactivos: rawStats.activos.inactivos ?? 0,
        },
      }
    : null;

  return (
    <BlacklistClient
      initialData={initialData}
      initialTotal={result.total}
      initialStats={initialStats}
    />
  );
}
