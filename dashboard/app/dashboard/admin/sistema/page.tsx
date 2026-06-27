import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AdminSistemaClient } from './admin-sistema-client';

export const dynamic = 'force-dynamic';

export default async function AdminSistemaPage() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') redirect('/dashboard');

  return <AdminSistemaClient />;
}
