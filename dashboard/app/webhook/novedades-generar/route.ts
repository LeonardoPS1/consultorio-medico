import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 *
 * @param request
 */
export async function POST(request: NextRequest) {
  const n8nUrl = process.env.N8N_WEBHOOK_INBOUND_URL || 'http://172.18.0.1:5678';

  try {
    const body = (await request.json()) as unknown;

    const res = await fetch(`${n8nUrl}/webhook/novedades-generar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json().catch(() => null)) as unknown;

    return NextResponse.json(data ?? { success: true }, { status: res.status });
  } catch (err) {
    console.error('[webhook/novedades-generar] Error forwarding to n8n:', err);
    return NextResponse.json({ error: 'Error al forwardear webhook a n8n' }, { status: 502 });
  }
}
