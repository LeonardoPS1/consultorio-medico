import { eq, desc, and, inArray, or, gte, isNull } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { notasSoap, pacientes, recetas, resumenesPaciente } from '@/drizzle/schema';
import { generarResumenLongitudinal } from '@/lib/ai-clinical';
import { verifyPacienteAccess } from '@/lib/api-auth';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { safeError, safeLog } from '@/lib/logger';
import { getHoyISO, ESTADOS_ACTIVOS } from '@/lib/receta-utils';

const MAX_NOTAS = 5;

/**
 * Auth + acceso al paciente (mismo patrón que notas-soap)
 * @param request
 * @param pacienteId
 */
async function requireAuth(request: NextRequest, pacienteId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { session: null, error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
  }
  try {
    await verifyPacienteAccess(pacienteId, session.user?.medicoId, session.user?.role);
  } catch {
    return { session: null, error: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) };
  }
  return { session, error: null };
}

/**
 * GET /api/pacientes/[id]/resumen
 * Devuelve el resumen longitudinal cacheado (si existe).
 * @param request
 * @param root0
 * @param root0.params
 */
export async function GET(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  const { error } = await requireAuth(request, id);
  if (error) return error;

  try {
    const [cache] = await db
      .select({ contenido: resumenesPaciente.contenido, generadoEn: resumenesPaciente.generadoEn })
      .from(resumenesPaciente)
      .where(eq(resumenesPaciente.pacienteId, id))
      .limit(1);

    if (!cache) {
      return NextResponse.json({ contenido: null, generadoEn: null });
    }
    return NextResponse.json({ contenido: cache.contenido, generadoEn: cache.generadoEn });
  } catch (err) {
    safeError('[API] Error GET resumen:', err);
    return NextResponse.json({ error: 'Error al obtener el resumen' }, { status: 500 });
  }
}

/**
 * POST /api/pacientes/[id]/resumen
 * Genera (o regenera) el resumen longitudinal con IA y lo cachea.
 * Fail-open: si la IA falla responde 502 con mensaje claro, sin tocar el cache.
 * @param request
 * @param root0
 * @param root0.params
 */
export async function POST(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  const { session, error } = await requireAuth(request, id);
  if (error) return error;

  try {
    const [paciente] = await db
      .select({ alergias: pacientes.alergias, medicacionCronica: pacientes.medicacionCronica })
      .from(pacientes)
      .where(eq(pacientes.id, id))
      .limit(1);

    if (!paciente) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    const notas = await db
      .select({
        fecha: notasSoap.createdAt,
        assessment: notasSoap.assessment,
        cie10Codigo: notasSoap.cie10Codigo,
      })
      .from(notasSoap)
      .where(eq(notasSoap.pacienteId, id))
      .orderBy(desc(notasSoap.createdAt))
      .limit(MAX_NOTAS);

    const hoy = getHoyISO();
    const recetasVigentes = await db
      .select({ medicamento: recetas.medicamento })
      .from(recetas)
      .where(
        and(
          eq(recetas.pacienteId, id),
          inArray(recetas.estado, [...ESTADOS_ACTIVOS]),
          or(isNull(recetas.fechaFin), gte(recetas.fechaFin, hoy)),
        ),
      );

    const contenido = await generarResumenLongitudinal({
      notas: notas.map((n) => ({ fecha: n.fecha, assessment: n.assessment, cie10Codigo: n.cie10Codigo })),
      alergias: paciente.alergias,
      medicacionCronica: paciente.medicacionCronica,
      recetasVigentes: recetasVigentes.map((r) => r.medicamento),
    });

    if (!contenido) {
      return NextResponse.json(
        { error: 'No se pudo generar el resumen (asistente de IA no disponible). Intente nuevamente.' },
        { status: 502 },
      );
    }

    const generadoEn = new Date();
    await db
      .insert(resumenesPaciente)
      .values({ pacienteId: id, contenido, generadoEn })
      .onConflictDoUpdate({
        target: resumenesPaciente.pacienteId,
        set: { contenido, generadoEn },
      });

    safeLog(`[Resumen] Generado para paciente ${id} por ${session?.user?.email ?? '?'}`);
    return NextResponse.json({ contenido, generadoEn });
  } catch (err) {
    safeError('[API] Error POST resumen:', err);
    return NextResponse.json({ error: 'Error al generar el resumen' }, { status: 500 });
  }
}