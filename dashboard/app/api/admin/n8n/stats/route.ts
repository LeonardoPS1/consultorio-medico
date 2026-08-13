import { NextResponse } from 'next/server';
import { getEffectiveSession } from '@/lib/auth-effective';
import { getN8nStats } from '@/lib/services/n8n-monitor';

export const dynamic = 'force-dynamic';

/**
 * Obtiene las estadísticas generales del panel de n8n.
 * @returns {Promise<NextResponse>} La respuesta JSON con las estadísticas.
 */
export async function GET(): Promise<NextResponse> {
  const session = await getEffectiveSession();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const stats = await getN8nStats();
  return NextResponse.json({ data: stats });
}
