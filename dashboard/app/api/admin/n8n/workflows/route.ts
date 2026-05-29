import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { fetchWorkflows } from '@/lib/services/n8n-monitor';

export const revalidate = 30;

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const workflows = await fetchWorkflows();
  return NextResponse.json({ data: workflows });
}
