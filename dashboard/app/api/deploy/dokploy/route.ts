import { NextRequest, NextResponse } from 'next/server';
import { safeWarn } from '@/lib/logger';
import { captureError } from '@/lib/glitchtip';
import { timingSafeEqual } from 'crypto';

const DOKPLOY_API_KEY = process.env.DOKPLOY_API_KEY;
const DOKPLOY_INTERNAL_URL = process.env.DOKPLOY_INTERNAL_URL || 'http://dokploy:3000';

function verifyApiKey(request: NextRequest): boolean {
  const provided = request.headers.get('x-api-key');
  if (!provided || !DOKPLOY_API_KEY) return false;
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(DOKPLOY_API_KEY);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!verifyApiKey(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { applicationId } = body;

    if (!applicationId || typeof applicationId !== 'string') {
      return NextResponse.json({ error: 'applicationId es requerido' }, { status: 400 });
    }

    const resp = await fetch(`${DOKPLOY_INTERNAL_URL}/api/application.deploy`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'x-api-key': DOKPLOY_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ applicationId }),
      signal: AbortSignal.timeout(120_000),
    });

    const text = await resp.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return NextResponse.json({ ok: resp.ok, status: resp.status, data });
  } catch (err) {
    safeWarn('[deploy/dokploy] Error:', err);
    captureError(err, { tags: { endpoint: 'deploy-dokploy' } });
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
