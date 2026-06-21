/**
 * GET /api/portal/consentimientos — Lista consentimientos del paciente
 * Protegido: requiere cookie portal_session
 */
import { NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { db } from '@/lib/db';
import { consentimientos, medicos } from '@/drizzle/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

export async function GET() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const list = await db
    .select({
      id: consentimientos.id,
      tipo: consentimientos.tipo,
      titulo: consentimientos.titulo,
      descripcion: consentimientos.descripcion,
      fechaFirma: consentimientos.fechaFirma,
      documentoPdf: consentimientos.documentoPdf,
      createdAt: consentimientos.createdAt,
      medicoNombre: medicos.nombre,
    })
    .from(consentimientos)
    .leftJoin(medicos, eq(consentimientos.medicoId, medicos.id))
    .where(
      and(
        eq(consentimientos.pacienteId, session.pacienteId),
        sql`${consentimientos.deletedAt} IS NULL`,
      ),
    )
    .orderBy(desc(consentimientos.createdAt));

  return NextResponse.json(list);
}
