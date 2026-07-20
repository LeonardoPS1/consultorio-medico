import { NextRequest, NextResponse } from 'next/server';
import { apiHandler, success } from '@/lib/api-handler';
import { requireAuth, verifyPacienteAccess } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { consentimientoLog, pacientes, usuarios, auditoriaAccesos } from '@/drizzle/schema';
import { and, eq, desc, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (request: NextRequest) => {
  await requireAuth();

  const { searchParams } = new URL(request.url);
  const pagina = Math.max(1, parseInt(searchParams.get('pagina') || '1', 10));
  const limite = Math.min(100, Math.max(1, parseInt(searchParams.get('limite') || '50', 10)));
  const tipo = searchParams.get('tipo') || undefined;
  const estado = searchParams.get('estado') || undefined;
  const pacienteId = searchParams.get('pacienteId') || undefined;

  const filtros = [];
  if (tipo) filtros.push(eq(consentimientoLog.tipo, tipo));
  if (pacienteId) filtros.push(eq(consentimientoLog.pacienteId, pacienteId));
  
  const offset = (pagina - 1) * limite;

  const [totalRow, solicitudes] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int` }).from(consentimientoLog).where(and(...filtros)),
    db
      .select({
        id: consentimientoLog.id,
        pacienteId: consentimientoLog.pacienteId,
        tipo: consentimientoLog.tipo,
        accion: consentimientoLog.accion,
        aceptado: consentimientoLog.aceptado,
        ip: consentimientoLog.ip,
        userAgent: consentimientoLog.userAgent,
        createdAt: consentimientoLog.createdAt,
        pacienteNombre: pacientes.nombre,
        pacienteApellido: pacientes.apellido,
      })
      .from(consentimientoLog)
      .leftJoin(pacientes, eq(consentimientoLog.pacienteId, pacientes.id))
      .where(and(...filtros))
      .orderBy(desc(consentimientoLog.createdAt))
      .limit(limite)
      .offset(offset),
  ]);

  const total = totalRow[0]?.total ?? 0;
  const totalPaginas = Math.ceil(total / limite);

  return success({
    solicitudes,
    paginacion: {
      pagina,
      limite,
      total,
      totalPaginas,
      hayMas: pagina < totalPaginas,
    },
  });
});

export const POST = apiHandler(async (request: NextRequest) => {
  await requireAuth();

  const body = await request.json();
  const { pacienteId, tipo, accion, motivo } = body;

  if (!pacienteId || !tipo || !accion) {
    return NextResponse.json({ error: 'pacienteId, tipo y accion son requeridos' }, { status: 400 });
  }

  const session = await requireAuth();
  const sessionMedicoId = session.user?.medicoId;
  const sessionRol = session.user?.role;
  await verifyPacienteAccess(pacienteId, sessionMedicoId, sessionRol);

  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
  const userAgent = request.headers.get('user-agent') || undefined;

  // Registrar en consentimiento_log
  const [consent] = await db
    .insert(consentimientoLog)
    .values({
      pacienteId,
      tipo,
      accion,
      aceptado: accion === 'grant' || accion === 'accept',
      ip,
      userAgent,
    })
    .returning();

  // Registrar en auditoria_accesos
  try {
    const [paciente] = await db
      .select({ nombre: pacientes.nombre, apellido: pacientes.apellido })
      .from(pacientes)
      .where(eq(pacientes.id, pacienteId))
      .limit(1);

    await db.insert(auditoriaAccesos).values({
      accion: `ARCO_${tipo.toUpperCase()}_${accion.toUpperCase()}`,
      entidad: 'pacientes',
      entidadId: pacienteId,
      detalle: `Solicitud ARCO ${tipo} - ${accion}${motivo ? `: ${motivo}` : ''} para ${paciente?.nombre} ${paciente?.apellido}`,
      ip,
      userAgent,
    });
  } catch {
    // No bloquear si falla la auditoría
  }

  return success(consent, 201);
});