import { and, eq, or } from 'drizzle-orm';
import { pacientes } from '@/drizzle/core';
import { documentosMedicos } from '@/drizzle/medical';
import { sucursales, tenants } from '@/drizzle/tenant';
import { db } from '@/lib/db';

/** Tenant placeholder used for rows created before tenant scoping was enforced. */
const TENANT_PLACEHOLDER = '00000000-0000-0000-0000-000000000000';

export interface UploadAccessContext {
  /** Tenant of the authenticated dashboard user. */
  tenantId?: string | null;
  /** Patient id of the authenticated portal session. */
  pacienteId?: string | null;
}

/**
 * Builds the public URL for a file stored in the uploads directory.
 * @param filename File name without directories.
 * @returns {string} URL as returned by POST /api/upload.
 */
export function uploadUrlFor(filename: string): string {
  return `/api/uploads/${filename}`;
}

/**
 * Determines whether the caller is allowed to read a file from the uploads directory.
 *
 * Access is granted only when the file is referenced by a record the caller can see:
 * - Portal session: a `documentos_medicos` row owned by the authenticated patient.
 * - Dashboard session: a `documentos_medicos` row inside the caller's tenant, or the
 *   tenant's own branding asset (`tenants.logo_url`).
 *
 * Files without an owning record are denied (404 at the route level) so guessing a
 * file name never grants access.
 * @param filename File name as received in the route slug.
 * @param context Authenticated caller context.
 * @returns {Promise<boolean>} True when the caller may read the file.
 */
export async function puedeAccederArchivo(
  filename: string,
  context: UploadAccessContext,
): Promise<boolean> {
  if (!filename) return false;

  const url = uploadUrlFor(filename);

  // Portal: only files that belong to one of the patient's own documents.
  if (context.pacienteId) {
    const [propio] = await db
      .select({ id: documentosMedicos.id })
      .from(documentosMedicos)
      .where(
        and(
          eq(documentosMedicos.archivoUrl, url),
          eq(documentosMedicos.pacienteId, context.pacienteId),
        ),
      )
      .limit(1);

    return Boolean(propio);
  }

  const tenantId = context.tenantId;
  if (!tenantId || tenantId === TENANT_PLACEHOLDER) return false;

  // Dashboard: documents of the tenant. Legacy rows created before tenant scoping
  // carry the placeholder tenant, so we also accept them when the patient resolves
  // to the caller's tenant through its sucursal.
  const [documento] = await db
    .select({ id: documentosMedicos.id })
    .from(documentosMedicos)
    .leftJoin(pacientes, eq(documentosMedicos.pacienteId, pacientes.id))
    .leftJoin(sucursales, eq(pacientes.sucursalId, sucursales.id))
    .where(
      and(
        eq(documentosMedicos.archivoUrl, url),
        or(
          eq(documentosMedicos.tenantId, tenantId),
          and(
            eq(documentosMedicos.tenantId, TENANT_PLACEHOLDER),
            eq(sucursales.tenantId, tenantId),
          ),
        ),
      ),
    )
    .limit(1);

  if (documento) return true;

  // Branding asset of the caller's own tenant (logo / avatar uploaded from settings).
  const [branding] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(and(eq(tenants.id, tenantId), eq(tenants.logoUrl, url)))
    .limit(1);

  return Boolean(branding);
}
