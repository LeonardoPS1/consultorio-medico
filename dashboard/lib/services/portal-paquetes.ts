/**
 * Paquetes de turnos y suscripciones para el portal del paciente.
 */

import { db } from '@/lib/db';
import { paquetesPortal, suscripcionesPaciente, turnos, pacientes } from '@/drizzle/schema';
import { eq, and, sql, gte } from 'drizzle-orm';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { safeLog, safeError } from '@/lib/logger';

// ─── Cliente MP ─────────────────────────────────────────────────
function getMPClient(): MercadoPagoConfig | null {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return null;
  return new MercadoPagoConfig({ accessToken: token });
}

// ─── Tipos ──────────────────────────────────────────────────────
export interface PaqueteConSuscripcion {
  paquete: typeof paquetesPortal.$inferSelect;
  suscripcionActiva: typeof suscripcionesPaciente.$inferSelect | null;
}

// ─── Listar paquetes activos ────────────────────────────────────
export async function listarPaquetesActivos(): Promise<(typeof paquetesPortal.$inferSelect)[]> {
  return db.select().from(paquetesPortal).where(eq(paquetesPortal.activo, true));
}

// ─── Obtener suscripciones activas del paciente ─────────────────
export async function getSuscripcionesPaciente(pacienteId: string) {
  return db
    .select()
    .from(suscripcionesPaciente)
    .where(
      and(
        eq(suscripcionesPaciente.pacienteId, pacienteId),
        eq(suscripcionesPaciente.activa, true),
        sql`${suscripcionesPaciente.turnosRestantes} > 0`,
      ),
    );
}

// ─── Crear preferencia de pago para paquete ─────────────────────
export async function comprarPaquete(pacienteId: string, paqueteId: string) {
  const [paquete] = await db
    .select()
    .from(paquetesPortal)
    .where(and(eq(paquetesPortal.id, paqueteId), eq(paquetesPortal.activo, true)))
    .limit(1);

  if (!paquete) throw new Error('Paquete no encontrado');

  const [paciente] = await db
    .select({ nombre: pacientes.nombre, email: pacientes.email })
    .from(pacientes)
    .where(eq(pacientes.id, pacienteId))
    .limit(1);

  if (!paciente) throw new Error('Paciente no encontrado');

  // 1. Crear suscripción pendiente
  const [suscripcion] = await db
    .insert(suscripcionesPaciente)
    .values({
      pacienteId,
      paqueteId,
      turnosRestantes: paquete.cantidadTurnos,
      turnosTotales: paquete.cantidadTurnos,
      activa: false,
      pagado: false,
      metadata: { paqueteNombre: paquete.nombre, paquetePrecio: paquete.precio },
    })
    .returning();

  // 2. Crear preferencia MP con external_reference = "paquete:{suscripcionId}"
  const client = getMPClient();
  if (!client) throw new Error('MercadoPago no configurado');

  const isDev = process.env.NODE_ENV === 'development';
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (isDev ? 'http://localhost:3000' : 'https://med.aicorebots.com');
  const currency = process.env.MERCADOPAGO_CURRENCY || 'CLP';

  const preference = new Preference(client);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = {
    items: [
      {
        id: paquete.id,
        title: paquete.nombre,
        description: paquete.descripcion || `${paquete.cantidadTurnos} consultas médicas`,
        quantity: 1,
        currency_id: currency,
        unit_price: paquete.precio,
      },
    ],
    payer: {
      ...(paciente.email ? { email: paciente.email } : {}),
      name: paciente.nombre,
    },
    external_reference: `paquete:${suscripcion.id}`,
    auto_return: 'approved',
    back_urls: {
      success: `${baseUrl}/portal/paquetes`,
      failure: `${baseUrl}/portal/paquetes?pago=fallido`,
      pending: `${baseUrl}/portal/paquetes?pago=pendiente`,
    },
    notification_url: `${baseUrl}/api/pagos/webhook`,
  };

  const result = await preference.create({ body });
  if (!result.id) throw new Error('MercadoPago no devolvió un ID de preferencia');

  // 3. Guardar preference ID en la suscripción
  await db
    .update(suscripcionesPaciente)
    .set({
      metadata: {
        ...((suscripcion.metadata as Record<string, unknown>) || {}),
        preferenceId: result.id,
      },
    })
    .where(eq(suscripcionesPaciente.id, suscripcion.id));

  safeLog('[Paquetes] Preferencia MP creada:', {
    suscripcionId: suscripcion.id,
    preferenceId: result.id,
  });

  return {
    id: result.id,
    initPoint: result.init_point ?? '',
    sandboxInitPoint: result.sandbox_init_point ?? '',
  };
}

// ─── Activar suscripción después de pago exitoso ────────────────
export async function activarSuscripcion(
  paqueteId: string,
  pacienteId: string,
  mercadopagoPaymentId: string,
): Promise<boolean> {
  try {
    const [paquete] = await db
      .select()
      .from(paquetesPortal)
      .where(and(eq(paquetesPortal.id, paqueteId), eq(paquetesPortal.activo, true)))
      .limit(1);

    if (!paquete) {
      safeError('[Paquetes] Paquete no encontrado para activar:', { paqueteId });
      return false;
    }

    await db.insert(suscripcionesPaciente).values({
      pacienteId,
      paqueteId,
      turnosRestantes: paquete.cantidadTurnos,
      turnosTotales: paquete.cantidadTurnos,
      pagado: true,
      mercadopagoPaymentId,
      metadata: { paqueteNombre: paquete.nombre, paquetePrecio: paquete.precio },
    });

    safeLog('[Paquetes] Suscripción activada:', {
      pacienteId,
      paqueteId,
      turnos: paquete.cantidadTurnos,
    });
    return true;
  } catch (e) {
    safeError(
      '[Paquetes] Error activando suscripción:',
      e instanceof Error ? { message: e.message } : e,
    );
    return false;
  }
}

// ─── Consumir un turno de la suscripción ────────────────────────
export async function consumirTurnoSuscripcion(
  pacienteId: string,
  turnoId: string,
): Promise<boolean> {
  const [suscripcion] = await db
    .select()
    .from(suscripcionesPaciente)
    .where(
      and(
        eq(suscripcionesPaciente.pacienteId, pacienteId),
        eq(suscripcionesPaciente.activa, true),
        sql`${suscripcionesPaciente.turnosRestantes} > 0`,
      ),
    )
    .orderBy(suscripcionesPaciente.createdAt)
    .limit(1);

  if (!suscripcion) return false;

  await db
    .update(suscripcionesPaciente)
    .set({
      turnosRestantes: sql`${suscripcionesPaciente.turnosRestantes} - 1`,
      updatedAt: new Date(),
    })
    .where(eq(suscripcionesPaciente.id, suscripcion.id));

  // Marcar turno como pagado (viene del paquete)
  await db.update(turnos).set({ pagado: true, pagadoAt: new Date() }).where(eq(turnos.id, turnoId));

  // Si se acabaron los turnos, desactivar
  if (suscripcion.turnosRestantes <= 1) {
    await db
      .update(suscripcionesPaciente)
      .set({ activa: false, updatedAt: new Date() })
      .where(eq(suscripcionesPaciente.id, suscripcion.id));
  }

  safeLog('[Paquetes] Turno consumido de suscripción:', {
    suscripcionId: suscripcion.id,
    turnoId,
    restantes: suscripcion.turnosRestantes - 1,
  });

  return true;
}

// ─── Verificar si paciente puede usar paquete para un turno ─────
export async function tienePaqueteDisponible(pacienteId: string): Promise<boolean> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(suscripcionesPaciente)
    .where(
      and(
        eq(suscripcionesPaciente.pacienteId, pacienteId),
        eq(suscripcionesPaciente.activa, true),
        sql`${suscripcionesPaciente.turnosRestantes} > 0`,
      ),
    );

  return (row?.count ?? 0) > 0;
}
