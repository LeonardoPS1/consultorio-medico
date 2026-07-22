import { NextRequest } from 'next/server';
import { webhooksService } from '@/lib/services/webhooks';
import { apiHandler, ok } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';

// POST /api/webhooks/configs/[id]/test
export const POST = apiHandler(
  async (_request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
    const { id } = await paramsPromise;
    await requireAuth();
    const config = await webhooksService.getById(id);
    const payload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      message: 'Ping de prueba desde el dashboard',
    };
    const result = await webhooksService.entregar(config.evento, payload, config);
    return ok({
      data: {
        ok: result.statusCode >= 200 && result.statusCode < 300,
        statusCode: result.statusCode,
        duracionMs: result.duracionMs,
        error: result.error || null,
      },
    });
  },
);
