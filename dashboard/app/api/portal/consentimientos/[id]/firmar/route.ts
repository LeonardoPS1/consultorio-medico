/**
 * POST /api/portal/consentimientos/[id]/firmar — Firma digitalmente un consentimiento
 * Protegido: requiere cookie portal_session
 * Lee ipFirma del header x-forwarded-for o la IP de la request
 */
import { NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { db } from '@/lib/db';
import { consentimientos } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function POST(req: Request, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Buscar consentimiento pendiente de firma
  const [existing] = await db
    .select({
      id: consentimientos.id,
      fechaFirma: consentimientos.fechaFirma,
      titulo: consentimientos.titulo,
    })
    .from(consentimientos)
    .where(
      and(
        eq(consentimientos.id, id),
        eq(consentimientos.pacienteId, session.pacienteId),
        sql`${consentimientos.deletedAt} IS NULL`,
      ),
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  if (existing.fechaFirma) {
    return NextResponse.json({ error: 'Ya fue firmado anteriormente' }, { status: 409 });
  }

  // Obtener IP del paciente
  const forwarded = req.headers.get('x-forwarded-for');
  const ipFirma = forwarded?.split(',')[0]?.trim() || 'desconocida';

  await db
    .update(consentimientos)
    .set({
      fechaFirma: new Date(),
      ipFirma,
      updatedAt: new Date(),
    })
    .where(eq(consentimientos.id, id));

  return NextResponse.json({
    success: true,
    mensaje: `"${existing.titulo}" firmado correctamente`,
  });
}
