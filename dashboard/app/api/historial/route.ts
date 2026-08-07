import { sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { historialMedico, historialTipoEnum, medicos } from '@/drizzle/schema';
import { requireAuth, verifyPacienteAccess } from '@/lib/api-auth';
import { apiHandler, success, fail } from '@/lib/api-handler';
import { db } from '@/lib/db';
import { listarHistorial } from '@/lib/services/historial';

export const dynamic = 'force-dynamic';

/** Tipos válidos del enum historial_tipo en PostgreSQL. */
const TIPOS_VALIDOS = historialTipoEnum.enumValues;

export const GET = apiHandler(async (request: NextRequest) => {
  await requireAuth();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const tipo = searchParams.get('tipo') || '';
  const origen = (searchParams.get('origen') || '') as '' | 'historial' | 'soap';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const pacienteId = searchParams.get('pacienteId') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));

  const res = await listarHistorial({ search, tipo, origen, from, to, pacienteId, page, limit });

  return success(res);
});

/**
 * POST /api/historial
 * Crea un registro clínico en historial_medico.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();

  const body = await request.json();

  const pacienteId = String(body.pacienteId ?? '');
  const tipo = String(body.tipo ?? '');
  const titulo = String(body.titulo ?? '').trim();
  const descripcion = body.descripcion ? String(body.descripcion) : null;
  const diagnosticoCodigo = body.diagnosticoCodigo ? String(body.diagnosticoCodigo) : null;
  const diagnosticoDescripcion = body.diagnosticoDescripcion
    ? String(body.diagnosticoDescripcion)
    : null;

  if (!pacienteId) fail('pacienteId es requerido');
  if (!tipo || !(TIPOS_VALIDOS as string[]).includes(tipo)) {
    fail(`tipo inválido. Válidos: ${TIPOS_VALIDOS.join(', ')}`);
  }
  if (!titulo) fail('titulo es requerido');

  await verifyPacienteAccess(pacienteId, session.user.medicoId, session.user.role);

  // Si no hay medicoId en sesión (admin sin médico asignado), se usa el primer médico activo
  let medicoId: string | null = session.user.medicoId ?? null;
  if (!medicoId) {
    const [primerMedico] = await db
      .select({ id: medicos.id })
      .from(medicos)
      .where(sql`${medicos.deletedAt} IS NULL`)
      .limit(1);
    if (primerMedico) medicoId = primerMedico.id;
  }

  const [row] = await db
    .insert(historialMedico)
    .values({
      pacienteId,
      medicoId,
      tipo: tipo as (typeof historialTipoEnum.enumValues)[number],
      titulo,
      descripcion,
      diagnosticoCodigo,
      diagnosticoDescripcion,
      visibleParaPaciente: body.visibleParaPaciente ?? true,
    })
    .returning();

  return success({ data: row }, 201);
});
