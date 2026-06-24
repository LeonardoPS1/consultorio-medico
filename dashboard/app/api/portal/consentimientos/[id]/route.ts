/**
 * GET /api/portal/consentimientos/[id] — Ver consentimiento (HTML firmable)
 * Protegido: requiere cookie portal_session
 */
import { NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal-auth';
import { db } from '@/lib/db';
import { consentimientos, pacientes, medicos } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const [row] = await db
    .select({
      id: consentimientos.id,
      tipo: consentimientos.tipo,
      titulo: consentimientos.titulo,
      descripcion: consentimientos.descripcion,
      fechaFirma: consentimientos.fechaFirma,
      ipFirma: consentimientos.ipFirma,
      nombrePaciente: consentimientos.nombrePaciente,
      rutPaciente: consentimientos.rutPaciente,
      documentoPdf: consentimientos.documentoPdf,
      createdAt: consentimientos.createdAt,
      pacienteNombre: pacientes.nombre,
      pacienteApellido: pacientes.apellido,
      medicoNombre: medicos.nombre,
    })
    .from(consentimientos)
    .leftJoin(pacientes, eq(consentimientos.pacienteId, pacientes.id))
    .leftJoin(medicos, eq(consentimientos.medicoId, medicos.id))
    .where(
      and(
        eq(consentimientos.id, params.id),
        eq(consentimientos.pacienteId, session.pacienteId),
        sql`${consentimientos.deletedAt} IS NULL`,
      ),
    )
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  return NextResponse.json(row);
}
