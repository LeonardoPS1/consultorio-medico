import { NextRequest } from 'next/server';
import { consentimientoCompartirService } from '@/lib/services/consentimiento-compartir';
import { apiHandler, success, created, ok } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody } from '@/lib/validations';
import { createConsentimientoCompartirSchema } from '@/lib/validations';

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const { searchParams } = new URL(request.url);

  const pacienteId = searchParams.get('pacienteId') || undefined;
  const medicoOrigenId = searchParams.get('medicoOrigenId') || undefined;
  const estado = searchParams.get('estado') || undefined;
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
  const offset = Number(searchParams.get('offset')) || 0;

  const result = await consentimientoCompartirService.list({
    pacienteId,
    medicoOrigenId,
    estado,
    tenantId: session.user.tenantId,
    limit,
    offset,
  });

  return ok(result);
});

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const body = await parseBody(request, createConsentimientoCompartirSchema);

  const nuevo = await consentimientoCompartirService.create({
    ...body,
    fechaExpiracion: body.fechaExpiracion ? new Date(body.fechaExpiracion) : undefined,
    tenantId: session.user.tenantId,
  });

  return created(nuevo);
});
