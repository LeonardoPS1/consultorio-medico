export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { addClient } from '@/lib/sse-events';
import { safeLog } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id') || '00000000-0000-0000-0000-000000000000';

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  const write = (data: string) => {
    writer.write(encoder.encode(data)).catch(() => {});
  };

  const close = () => {
    writer.close().catch(() => {});
  };

  const clientId = addClient(tenantId, write, close);

  request.signal.addEventListener('abort', () => {
    close();
    safeLog('[SSE] Conexión abortada:', { clientId });
  });

  write(`event: connected\ndata: {"clientId":"${clientId}"}\n\n`);

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
