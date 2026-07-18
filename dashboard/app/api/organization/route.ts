import { NextRequest } from 'next/server';
import { apiHandler, success, ok } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody, updateOrganizationSchema } from '@/lib/validations';
import { getOrganization, updateOrganization } from '@/lib/organization-store';
import { getTenantBranding } from '@/lib/services/tenant';

export const GET = apiHandler(async (request: NextRequest) => {
  await requireAuth();

  const org = getOrganization();
  const tenantId = request.headers.get('x-tenant-id') || undefined;
  const branding = await getTenantBranding(tenantId);

  // Merge tenant branding into org response
  return success({
    ...org,
    nombre: org.nombre || branding.nombre,
    logoUrl: org.logoUrl || branding.logoUrl,
    colorPrimario: org.colorPrimario || branding.colores.primary,
    colorSecundario: org.colorSecundario || branding.colores.secondary,
  });
});

export const POST = apiHandler(async (request: NextRequest) => {
  await requireAuth();

  const body = await parseBody(request, updateOrganizationSchema);
  const updated = updateOrganization(body);
  return ok({ data: updated, message: 'Configuración guardada' });
});
