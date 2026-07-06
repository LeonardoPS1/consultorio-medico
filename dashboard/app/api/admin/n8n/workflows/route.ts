import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { fetchWorkflows } from '@/lib/services/n8n-monitor';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
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
