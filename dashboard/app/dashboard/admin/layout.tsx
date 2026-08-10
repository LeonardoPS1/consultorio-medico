import { getEffectiveSession } from '@/lib/auth-effective';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getEffectiveSession();
  if (!session || session.user.role !== 'admin') redirect('/dashboard');

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}