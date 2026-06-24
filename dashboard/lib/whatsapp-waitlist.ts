/**
 * WhatsApp — Notificaciones para Lista de Espera y Ofertas de Turno.
 *
 * - Notificar al paciente cuando recibe una oferta de turno
 * - Notificar al médico cuando se reasigna un turno
 */

import { db } from '@/lib/db';
import { safeLog, safeWarn, safeError } from '@/lib/logger';
import { turnos, pacientes, medicos, ofertasTurno, listaEspera } from '@/drizzle/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { waitlistService } from '@/lib/services/waitlist';

// ─── Helpers ──────────────────────────────────────────────

async function enviarWhatsApp(telefono: string, mensaje: string): Promise<boolean> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      safeWarn('[WhatsApp-Waitlist] ⚠️ Falta config Twilio');
      return false;
    }

    const numeroLimpio = telefono.startsWith('whatsapp:') ? telefono : `whatsapp:${telefono}`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const formData = new URLSearchParams({
      From: fromNumber,
      To: numeroLimpio,
      Body: mensaje,
    });

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      safeError(`[WhatsApp-Waitlist] Error Twilio: ${res.status} ${body}`);
      return false;
    }

    return true;
  } catch (error) {
    safeError(
      '[WhatsApp-Waitlist] Error al enviar WhatsApp:',
      error instanceof Error ? { message: error.message } : error,
    );
    return false;
  }
}

// ─── Notificaciones ──────────────────────────────────────

/**
 * Notifica al paciente que tiene un turno disponible (de una cancelación).
 * Se envía cuando se crea una oferta automáticamente.
 */
export async function notificarOfertaTurno(
  ofertaId: string,
  turnoId: string,
  listaEsperaId: string,
): Promise<void> {
  try {
    // Obtener datos del turno
    const [turno] = await db
      .select({
        fechaHora: turnos.fechaHora,
        duracionMinutos: turnos.duracionMinutos,
      })
      .from(turnos)
      .where(and(eq(turnos.id, turnoId), sql`${turnos.deletedAt} IS NULL`))
      .limit(1);
    if (!turno) return;

    // Obtener datos del paciente desde la lista de espera
    const [inscripcion] = await db
      .select({
        pacienteId: listaEspera.pacienteId,
        medicoId: listaEspera.medicoId,
      })
      .from(listaEspera)
      .where(eq(listaEspera.id, listaEsperaId))
      .limit(1);
    if (!inscripcion) return;

    const [paciente] = await db
      .select({
        nombre: pacientes.nombre,
        telefono: pacientes.telefono,
        consentimientoWhatsapp: pacientes.consentimientoWhatsapp,
      })
      .from(pacientes)
      .where(and(eq(pacientes.id, inscripcion.pacienteId), sql`${pacientes.deletedAt} IS NULL`))
      .limit(1);
    if (!paciente || !paciente.telefono || !paciente.consentimientoWhatsapp) return;

    const [medico] = await db
      .select({ nombre: medicos.nombre })
      .from(medicos)
      .where(and(eq(medicos.id, inscripcion.medicoId), sql`${medicos.deletedAt} IS NULL`))
      .limit(1);
    if (!medico) return;

    // Formatear fecha y hora
    const fecha = turno.fechaHora instanceof Date ? turno.fechaHora : new Date(turno.fechaHora);
    const fechaStr = fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
    const horaStr = fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    const mensaje =
      `🎯 ¡Hola ${paciente.nombre}! Un turno se ha liberado para tu médico ${medico.nombre}:\n\n` +
      `📅 ${fechaStr} a las ${horaStr} hs\n\n` +
      `⏳ Tenés 15 minutos para aceptarlo.\n\n` +
      `👉 Respondé "ACEPTAR" para confirmar el turno.\n` +
      `👉 Respondé "RECHAZAR" si no te sirve.\n\n` +
      `Si no respondés, se lo ofreceremos a otro paciente.`;

    const enviado = await enviarWhatsApp(paciente.telefono, mensaje);

    // Actualizar estado de notificación
    if (enviado) {
      await db
        .update(ofertasTurno)
        .set({ notificada: true, notificadaAt: new Date() })
        .where(eq(ofertasTurno.id, ofertaId));
    }
  } catch (error) {
    safeError(
      '[WhatsApp-Waitlist] Error notificarOfertaTurno:',
      error instanceof Error ? { message: error.message } : error,
    );
  }
}

/**
 * Notifica al médico que un turno cancelado fue reasignado a otro paciente.
 */
export async function notificarMedicoReasignacion(turnoId: string): Promise<void> {
  try {
    const [turno] = await db
      .select({
        fechaHora: turnos.fechaHora,
        medicoId: turnos.medicoId,
        pacienteId: turnos.pacienteId,
      })
      .from(turnos)
      .where(and(eq(turnos.id, turnoId), sql`${turnos.deletedAt} IS NULL`))
      .limit(1);
    if (!turno) return;

    const [medico] = await db
      .select({ nombre: medicos.nombre, whatsapp: medicos.whatsapp })
      .from(medicos)
      .where(and(eq(medicos.id, turno.medicoId), sql`${medicos.deletedAt} IS NULL`))
      .limit(1);
    if (!medico || !medico.whatsapp) return;

    const [paciente] = await db
      .select({ nombre: pacientes.nombre, apellido: pacientes.apellido })
      .from(pacientes)
      .where(and(eq(pacientes.id, turno.pacienteId), sql`${pacientes.deletedAt} IS NULL`))
      .limit(1);
    if (!paciente) return;

    const fecha = turno.fechaHora instanceof Date ? turno.fechaHora : new Date(turno.fechaHora);
    const fechaStr = fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
    const horaStr = fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    const mensaje =
      `🔄 Dr. ${medico.nombre}, un turno cancelado fue reasignado:\n\n` +
      `👤 Nuevo paciente: ${paciente.nombre} ${paciente.apellido}\n` +
      `📅 ${fechaStr} a las ${horaStr} hs\n\n` +
      `El paciente ya fue notificado.`;

    await enviarWhatsApp(medico.whatsapp, mensaje);
  } catch (error) {
    safeError(
      '[WhatsApp-Waitlist] Error notificarMedicoReasignacion:',
      error instanceof Error ? { message: error.message } : error,
    );
  }
}

/**
 * Notifica al paciente que su oferta fue aceptada y el turno está confirmado.
 */
export async function notificarConfirmacionReasignacion(
  turnoId: string,
  pacienteId: string,
): Promise<void> {
  try {
    const [turno] = await db
      .select({ fechaHora: turnos.fechaHora })
      .from(turnos)
      .where(and(eq(turnos.id, turnoId), sql`${turnos.deletedAt} IS NULL`))
      .limit(1);
    if (!turno) return;

    const [paciente] = await db
      .select({ nombre: pacientes.nombre, telefono: pacientes.telefono })
      .from(pacientes)
      .where(and(eq(pacientes.id, pacienteId), sql`${pacientes.deletedAt} IS NULL`))
      .limit(1);
    if (!paciente || !paciente.telefono) return;

    const fecha = turno.fechaHora instanceof Date ? turno.fechaHora : new Date(turno.fechaHora);
    const fechaStr = fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
    const horaStr = fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    const mensaje =
      `✅ ¡Turno confirmado ${paciente.nombre}!\n\n` +
      `📅 ${fechaStr} a las ${horaStr} hs\n\n` +
      `Te esperamos. Gracias por confirmar.`;

    await enviarWhatsApp(paciente.telefono, mensaje);
  } catch (error) {
    safeError(
      '[WhatsApp-Waitlist] Error notificarConfirmacionReasignacion:',
      error instanceof Error ? { message: error.message } : error,
    );
  }
}

/**
 * Detecta si un mensaje entrante es respuesta a una oferta de turno
 * (ACEPTAR / RECHAZAR) y la procesa.
 *
 * @returns true si el mensaje fue procesado como respuesta de waitlist
 */
export async function handleWaitlistResponse(
  pacienteId: string,
  body: string,
  telefono: string,
): Promise<boolean> {
  const texto = body.trim().toUpperCase();

  // Detectar ACEPTAR o RECHAZAR
  const esAceptar =
    texto === 'ACEPTAR' || texto === 'SI' || texto === 'OK' || texto === 'CONFIRMAR';
  const esRechazar = texto === 'RECHAZAR' || texto === 'NO' || texto === 'RECHAZO';

  if (!esAceptar && !esRechazar) return false;

  try {
    // Buscar oferta pendiente más reciente para este paciente
    const [oferta] = await db
      .select({
        id: ofertasTurno.id,
        estado: ofertasTurno.estado,
        expiracion: ofertasTurno.expiracion,
        turnoId: ofertasTurno.turnoId,
        listaEsperaId: ofertasTurno.listaEsperaId,
      })
      .from(ofertasTurno)
      .leftJoin(listaEspera, eq(ofertasTurno.listaEsperaId, listaEspera.id))
      .where(and(eq(listaEspera.pacienteId, pacienteId), eq(ofertasTurno.estado, 'pendiente')))
      .orderBy(desc(ofertasTurno.fechaOferta))
      .limit(1);

    if (!oferta) {
      safeLog(`[WhatsApp-Waitlist] No hay oferta pendiente para paciente ${pacienteId}`);
      await enviarWhatsApp(
        telefono,
        'No encontré una oferta de turno pendiente para ti. Si necesitas ayuda, escribí "HOLA" para hablar con un asistente.',
      );
      return true;
    }

    if (new Date() > new Date(oferta.expiracion)) {
      await enviarWhatsApp(
        telefono,
        '⏰ La oferta de turno ya expiró. Si se libera otro turno, te vamos a notificar.',
      );
      return true;
    }

    if (esAceptar) {
      await waitlistService.aceptar(oferta.id);
      await notificarConfirmacionReasignacion(oferta.turnoId, pacienteId);
      await notificarMedicoReasignacion(oferta.turnoId);
    } else {
      await waitlistService.rechazar(oferta.id);
      await enviarWhatsApp(
        telefono,
        'Entendido, rechazamos la oferta. Si se libera otro turno, te avisaremos.',
      );
    }

    return true;
  } catch (error) {
    safeError(
      '[WhatsApp-Waitlist] Error handleWaitlistResponse:',
      error instanceof Error ? { message: error.message } : error,
    );
    return false;
  }
}
