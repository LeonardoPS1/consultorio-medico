import { NextResponse } from 'next/server';
import { getEffectiveSession } from '@/lib/auth-effective';
import { getN8nStats } from '@/lib/services/n8n-monitor';

export const dynamic = 'force-dynamic';

/**
 *
 */
export async function GET() {
  const session = await getEffectiveSession();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const stats = await getN8nStats();
  return NextResponse.json({ data: stats });
}
