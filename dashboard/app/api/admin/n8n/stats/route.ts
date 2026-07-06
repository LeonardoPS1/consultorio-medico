import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getN8nStats } from '@/lib/services/n8n-monitor';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const stats = await getN8nStats();
  return NextResponse.json({ data: stats });
}
