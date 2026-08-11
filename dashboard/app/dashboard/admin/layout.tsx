import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import { getEffectiveSession } from '@/lib/auth-effective';

export const dynamic = 'force-dynamic';

/**
 *
 * @param root0
 * @param root0.children
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getEffectiveSession();
  if (!session || session.user.role !== 'admin') redirect('/dashboard');

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}