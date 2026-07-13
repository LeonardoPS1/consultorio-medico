import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { turnos, portalPagos } from '@/drizzle/schema';
import { eq, desc } from 'drizzle-orm';

// ─── Portal session helper ──────────────────────────────────
function getPortalSession(request: Request): { pacienteId: string } | null {
  const header = request.headers.get('x-portal-session');
  if (!header) return null;
  try {
    return JSON.parse(header);
  } catch {
    return null;
  }
}

// ─── GET /api/portal/pagos/[turnoId] — Estado del pago ──────
export async function GET(_request: Request, { params: paramsPromise }: { params: Promise<{ turnoId: string }> }) {
  const { turnoId } = await paramsPromise;
  const session = getPortalSession(_request);
  if (!session?.pacienteId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Verificar que el turno existe y pertenece al paciente
  const [turno] = await db
    .select({ pacienteId: turnos.pacienteId, pagado: turnos.pagado, precio: turnos.precio })
    .from(turnos)
    .where(eq(turnos.id, turnoId))
    .limit(1);

  if (!turno) {
    return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
  }

  if (turno.pacienteId !== session.pacienteId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  // Obtener el último pago registrado para este turno
  const [pago] = await db
    .select({
      id: portalPagos.id,
      estado: portalPagos.estado,
      monto: portalPagos.monto,
      moneda: portalPagos.moneda,
      mercadopagoPreferenceId: portalPagos.mercadopagoPreferenceId,
      mercadopagoPaymentId: portalPagos.mercadopagoPaymentId,
      pagadoAt: portalPagos.pagadoAt,
      createdAt: portalPagos.createdAt,
    })
    .from(portalPagos)
    .where(eq(portalPagos.turnoId, turnoId))
    .orderBy(desc(portalPagos.createdAt))
    .limit(1);

  return NextResponse.json({
    turnoPagado: turno.pagado,
    pago: pago || null,
  });
}
