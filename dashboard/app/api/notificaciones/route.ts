import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { preferenciasNotificaciones } from '@/drizzle/schema';
import { requireAuth } from '@/lib/api-auth';
import { apiHandler, success, created, ok, fail } from '@/lib/api-handler';
import { db } from '@/lib/db';
import { notificacionesService } from '@/lib/services/notificaciones';
import { createNotificacionSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

const DEFAULT_SILENCIAR = { turno: false, mensaje: false, receta: false, urgencia: false, sistema: false };

interface NotificacionesPutBody {
  urgenciasWhatsapp?: unknown;
  resumenDiarioEmail?: unknown;
  alertasAusentismo?: unknown;
  nuevosPacientes?: unknown;
  whatsappPersonal?: unknown;
  silenciarPorTipo?: {
    turno?: boolean;
    mensaje?: boolean;
    receta?: boolean;
    urgencia?: boolean;
    sistema?: boolean;
  };
}

// ─── GET /api/notificaciones ────────────────────────────────
// Query params: ?tipo=turno&soloNoLeidas=true&limit=20&offset=0&conteoPorTipo=true
// También funciona sin params para obtener preferencias (backward compat)
export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const userId = session.user.id as string;

  const { searchParams } = new URL(request.url);

  // Si hay ?preferencias=true, devolver solo preferencias (backward compat)
  if (searchParams.get('preferencias') === 'true') {
    const prefs = await db
      .select()
      .from(preferenciasNotificaciones)
      .where(eq(preferenciasNotificaciones.usuarioId, userId))
      .limit(1);

    if (prefs.length === 0) {
      return success({
        urgenciasWhatsapp: true,
        resumenDiarioEmail: true,
        alertasAusentismo: true,
        nuevosPacientes: false,
        whatsappPersonal: '',
        silenciarPorTipo: DEFAULT_SILENCIAR,
      });
    }
    return success(prefs[0]);
  }

  // Listar notificaciones del usuario
  const tipo = searchParams.get('tipo') || undefined;
  const soloNoLeidas = searchParams.get('soloNoLeidas') === 'true';
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
  const offset = Number(searchParams.get('offset')) || 0;
  const includeConteoPorTipo = searchParams.get('conteoPorTipo') === 'true';

  const result = await notificacionesService.list(userId, {
    limit,
    offset,
    tipo,
    soloNoLeidas,
  });

  // Agregar conteo por tipo si se solicita
  if (includeConteoPorTipo) {
    const conteoPorTipo = await notificacionesService.getConteoPorTipo(userId);
    (result as Record<string, unknown>).conteoPorTipo = conteoPorTipo;
  }

  return NextResponse.json(result);
});

// ─── PUT /api/notificaciones ────────────────────────────────
// Actualizar preferencias de notificaciones (incluye silenciarPorTipo)
export const PUT = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const userId = session.user.id as string;

  const body = (await request.json()) as NotificacionesPutBody;
  const {
    urgenciasWhatsapp,
    resumenDiarioEmail,
    alertasAusentismo,
    nuevosPacientes,
    whatsappPersonal,
    silenciarPorTipo,
  } = body;

  const updateData: Record<string, unknown> = {
    urgenciasWhatsapp: urgenciasWhatsapp ?? true,
    resumenDiarioEmail: resumenDiarioEmail ?? true,
    alertasAusentismo: alertasAusentismo ?? true,
    nuevosPacientes: nuevosPacientes ?? false,
    whatsappPersonal: whatsappPersonal ?? '',
    updatedAt: new Date(),
  };

  if (silenciarPorTipo !== undefined) {
    updateData.silenciarPorTipo = {
      turno: Boolean(silenciarPorTipo.turno),
      mensaje: Boolean(silenciarPorTipo.mensaje),
      receta: Boolean(silenciarPorTipo.receta),
      urgencia: Boolean(silenciarPorTipo.urgencia),
      sistema: Boolean(silenciarPorTipo.sistema),
    };
  }

  const existing = await db
    .select()
    .from(preferenciasNotificaciones)
    .where(eq(preferenciasNotificaciones.usuarioId, userId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(preferenciasNotificaciones)
      .set(updateData)
      .where(eq(preferenciasNotificaciones.usuarioId, userId));

    // Retornar preferencias actualizadas para que el refetch tenga datos correctos
    const updated = await db
      .select()
      .from(preferenciasNotificaciones)
      .where(eq(preferenciasNotificaciones.usuarioId, userId))
      .limit(1);

    return ok({ ok: true, data: updated[0] ?? null });
  } else {
    await db.insert(preferenciasNotificaciones).values({
      usuarioId: userId,
      ...(updateData as Record<string, unknown>),
    });

    const inserted = await db
      .select()
      .from(preferenciasNotificaciones)
      .where(eq(preferenciasNotificaciones.usuarioId, userId))
      .limit(1);

    return ok({ ok: true, data: inserted[0] ?? null });
  }
});

// ─── POST /api/notificaciones ───────────────────────────────
// Acciones masivas: { action: 'leidas' } → marca todas como leídas
// También: { action: 'create', ... } → crear notificación (admin)
export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const userId = session.user.id as string;

  const body = (await request.json()) as { action?: string };
  const { action } = body;

  if (action === 'leidas') {
    await notificacionesService.marcarTodasLeidas(userId);
    return ok({ success: true });
  }

  if (action === 'create') {
    const parsed = createNotificacionSchema.parse(body);
    const nueva = await notificacionesService.create({
      ...parsed,
      usuarioId: userId,
    });
    return created(nueva);
  }

  fail('Acción no válida');
});
