import { NextRequest } from 'next/server';
import { consentimientoCompartirService } from '@/lib/services/consentimiento-compartir';
import { apiHandler, ok } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';

export const GET = apiHandler(
  async (_request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
    const { id } = await paramsPromise;
    await requireAuth();
    const data = await consentimientoCompartirService.getById(id);
    return ok({ data });
  },
);

export const PATCH = apiHandler(
  async (request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
    const { id } = await paramsPromise;
    const session = await requireAuth();
    const body = await request.json();

    let result;
    if (body.accion === 'firmar') {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';
      result = await consentimientoCompartirService.firmar(id, ip);
    } else if (body.accion === 'revocar') {
      result = await consentimientoCompartirService.revocar(id);
    } else {
      return ok({ error: 'Acción no válida. Use "firmar" o "revocar"' }, 400);
    }

    return ok({ data: result });
  },
);

export const DELETE = apiHandler(
  async (_request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
    const { id } = await paramsPromise;
    await requireAuth();
    const result = await consentimientoCompartirService.softDelete(id);
    return ok(result);
  },
);
