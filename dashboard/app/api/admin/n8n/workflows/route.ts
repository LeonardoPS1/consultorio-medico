import { NextResponse } from 'next/server';
import { getEffectiveSession } from '@/lib/auth-effective';
import { fetchWorkflows } from '@/lib/services/n8n-monitor';

export const dynamic = 'force-dynamic';

/**
 * Obtiene la lista de workflows de n8n.
 * @returns {Promise<NextResponse>} La respuesta JSON con los workflows.
 */
export async function GET(): Promise<NextResponse> {
  const session = await getEffectiveSession();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const workflows = await fetchWorkflows();
    return NextResponse.json({ data: workflows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al conectar con n8n';
    return NextResponse.json({ error: message, data: [] }, { status: 503 });
  }
}
