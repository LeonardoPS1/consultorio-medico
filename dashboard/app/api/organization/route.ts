import { NextRequest } from 'next/server';
import { apiHandler, success, ok } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody, updateOrganizationSchema } from '@/lib/validations';
import { getOrganization, updateOrganization } from '@/lib/organization-store';

export const GET = apiHandler(async () => {
  await requireAuth();

  const org = getOrganization();
  return success(org);
});

export const POST = apiHandler(async (request: NextRequest) => {
  await requireAuth();

  const body = await parseBody(request, updateOrganizationSchema);
  const updated = updateOrganization(body);
  return ok({ data: updated, message: 'Configuración guardada' });
});
