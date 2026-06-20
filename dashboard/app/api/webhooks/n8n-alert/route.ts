import { NextResponse } from 'next/server';
import { logWorkflowExecution } from '@/lib/services/n8n-monitor';
import { safeWarn } from '@/lib/logger';

const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

// Rate limiter en memoria para este webhook
const alertRateMap = new Map<string, { count: number; resetAt: number }>();
function checkAlertRate(ip: string): boolean {
  const now = Date.now();
  const entry = alertRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    alertRateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}
// Cleanup cada 5 min
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of Array.from(alertRateMap)) {
    if (now > v.resetAt) alertRateMap.delete(k);
  }
}, 5 * 60_000);

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkAlertRate(ip)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  }

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
