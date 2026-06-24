import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { preferenciasNotificaciones } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { notificacionesService } from '@/lib/services/notificaciones';
import { apiHandler, success, created, ok, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { createNotificacionSchema } from '@/lib/validations';

// ─── GET /api/notificaciones ────────────────────────────────
// Query params: ?tipo=turno&soloNoLeidas=true&limit=20&offset=0
// También funciona sin params para obtener preferencias (backward compat)
export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const userId = session.user.id as string;

  const { searchParams } = new URL(request.url);

  // Si hay ?preferencias=true, devolver solo preferencias (backward compat)
  if (searchParams.get('preferencias') === 'true' || !searchParams.toString()) {
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
      });
    }
    return success(prefs[0]);
  }

  // Listar notificaciones del usuario
  const tipo = searchParams.get('tipo') || undefined;
  const soloNoLeidas = searchParams.get('soloNoLeidas') === 'true';
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
  const offset = Number(searchParams.get('offset')) || 0;

  const result = await notificacionesService.list(userId, {
    limit,
    offset,
    tipo,
    soloNoLeidas,
  });

  return NextResponse.json(result);
});

// ─── PUT /api/notificaciones ────────────────────────────────
// Actualizar preferencias de notificaciones
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
  } = body;

  const existing = await db
    .select()
    .from(preferenciasNotificaciones)
    .where(eq(preferenciasNotificaciones.usuarioId, userId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(preferenciasNotificaciones)
      .set({
        urgenciasWhatsapp: urgenciasWhatsapp ?? true,
        resumenDiarioEmail: resumenDiarioEmail ?? true,
        alertasAusentismo: alertasAusentismo ?? true,
        nuevosPacientes: nuevosPacientes ?? false,
        whatsappPersonal: whatsappPersonal ?? '',
        updatedAt: new Date(),
      })
      .where(eq(preferenciasNotificaciones.usuarioId, userId));
  } else {
    await db.insert(preferenciasNotificaciones).values({
      usuarioId: userId,
      urgenciasWhatsapp: urgenciasWhatsapp ?? true,
      resumenDiarioEmail: resumenDiarioEmail ?? true,
      alertasAusentismo: alertasAusentismo ?? true,
      nuevosPacientes: nuevosPacientes ?? false,
      whatsappPersonal: whatsappPersonal ?? '',
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
