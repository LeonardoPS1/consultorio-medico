import { NextResponse } from 'next/server';
import { logWorkflowExecution } from '@/lib/services/n8n-monitor';
import { safeWarn } from '@/lib/logger';

const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

export async function POST(request: Request) {
  const secret = request.headers.get('x-webhook-secret');
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { workflowId, workflowName, executionId, nivel, mensaje, metadata } = body;

    if (!workflowId || !mensaje) {
      return NextResponse.json({ error: 'workflowId y mensaje son requeridos' }, { status: 400 });
    }

    const validNiveles = ['info', 'warn', 'error', 'debug'];
    const nivelFinal = validNiveles.includes(nivel) ? nivel : 'info';

    await logWorkflowExecution({
      workflowId,
      workflowName,
      executionId,
      nivel: nivelFinal,
      mensaje: `[n8n-alert] ${mensaje}`,
      metadata: {
        ...(metadata ?? {}),
        source: 'n8n-webhook',
        receivedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    safeWarn('[n8n-alert] Error procesando alerta:', err instanceof Error ? { message: err.message } : err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
