import { eq, desc, and, inArray, or, gte, isNull } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { notasSoap, pacientes, recetas, resumenesPaciente } from '@/drizzle/schema';
import { generarResumenLongitudinal } from '@/lib/ai-clinical';
import { verifyPacienteAccess } from '@/lib/api-auth';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { canAccess } from '@/lib/features';
import { safeError, safeLog } from '@/lib/logger';
import { getHoyISO, ESTADOS_ACTIVOS } from '@/lib/receta-utils';

const MAX_NOTAS = 5;

/**
 * Auth + acceso al paciente (mismo patrón que notas-soap)
 * @param {NextRequest} request - La solicitud HTTP entrante.
 * @param {string} pacienteId - ID del paciente.
 * @returns {Promise<{ session: Session | null; error: NextResponse | null }>} Sesión y error de auth, o null.
 */
async function requireAuth(
  request: NextRequest,
  pacienteId: string,
): Promise<{ session: Session | null; error: NextResponse | null }> {
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
 * @param {NextRequest} request - La solicitud HTTP entrante.
 * @param {object} root0 - Contexto de la ruta.
 * @param {Promise<{ id: string }>} root0.params - Promesa con los parámetros dinámicos de la ruta.
 * @returns {Promise<NextResponse>} El resumen cacheado o un error.
 */
export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await paramsPromise;
  const { session, error } = await requireAuth(request, id);
  if (error) return error;

  const plan = (session?.user as { plan?: string } | undefined)?.plan;
  if (!canAccess(plan, 'resumen-longitudinal')) {
    return NextResponse.json({ contenido: null, generadoEn: null });
  }

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
 * @param {NextRequest} request - La solicitud HTTP entrante.
 * @param {object} root0 - Contexto de la ruta.
 * @param {Promise<{ id: string }>} root0.params - Promesa con los parámetros dinámicos de la ruta.
 * @returns {Promise<NextResponse>} El resumen generado o un error.
 */
export async function POST(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await paramsPromise;
  const { session, error } = await requireAuth(request, id);
  if (error) return error;

  const plan = (session?.user as { plan?: string } | undefined)?.plan;
  if (!canAccess(plan, 'resumen-longitudinal')) {
    return NextResponse.json(
      { error: 'El resumen longitudinal requiere el plan Starter o superior. Actualizá tu plan para usarlo.' },
      { status: 403 },
    );
  }

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