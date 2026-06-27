import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { preferenciasNotificaciones } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { notificacionesService } from '@/lib/services/notificaciones';
import { apiHandler, success, created, ok, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { createNotificacionSchema } from '@/lib/validations';

const DEFAULT_SILENCIAR = { turno: false, mensaje: false, receta: false, urgencia: false, sistema: false };

// ─── GET /api/notificaciones ────────────────────────────────
// Query params: ?tipo=turno&soloNoLeidas=true&limit=20&offset=0&conteoPorTipo=true
// También funciona sin params para obtener preferencias (backward compat)
export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const userId = session.user.id as string;

  const { searchParams } = new URL(request.url);

  // Si hay ?preferencias=true, devolver solo preferencias (backward compat)
  if (searchParams.get('preferencias') === 'true' || (!searchParams.toString() && !searchParams.get('conteoPorTipo'))) {
    let prefs = await db
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

  const body = await request.json();
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
  } else {
    await db.insert(preferenciasNotificaciones).values({
      usuarioId: userId,
      ...(updateData as Record<string, unknown>),
    });
  }

  return ok({ ok: true });
});

// ─── POST /api/notificaciones ───────────────────────────────
// Acciones masivas: { action: 'leidas' } → marca todas como leídas
// También: { action: 'create', ... } → crear notificación (admin)
export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const userId = session.user.id as string;

  const body = await request.json();
  const { action } = body;

  if (action === 'leidas') {
    await notificacionesService.marcarTodasLeidas(userId);
    return ok({ success: true });
  }

  if (action === 'create') {
    const parsed = createNotificacionSchema.parse(body);
    const { usuarioId: _uid, ...data } = parsed;
    const nueva = await notificacionesService.create({
      ...data,
      usuarioId: userId,
    });
    return created(nueva);
  }

  fail('Acción no válida');
});
