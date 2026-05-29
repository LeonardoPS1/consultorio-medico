import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { fetchExecutions } from '@/lib/services/n8n-monitor';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const workflowId = searchParams.get('workflowId') || undefined;

  const executions = await fetchExecutions(limit, workflowId);
  return NextResponse.json({ data: executions });
}
