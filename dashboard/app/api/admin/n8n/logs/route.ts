import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getWorkflowLogs } from '@/lib/services/n8n-monitor';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const workflowId = searchParams.get('workflowId') || undefined;
  const nivel = searchParams.get('nivel') || undefined;
  const desde = searchParams.get('desde') || undefined;
  const hasta = searchParams.get('hasta') || undefined;

  const result = await getWorkflowLogs({
    limit: Math.min(limit, 500),
    offset,
    workflowId,
    nivel,
    desde,
    hasta,
  });

  return NextResponse.json(result);
}
