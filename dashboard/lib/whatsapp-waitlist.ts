/**
 * WhatsApp — Notificaciones para Lista de Espera y Ofertas de Turno.
 *
 * - Notificar al paciente cuando recibe una oferta de turno
 * - Notificar al médico cuando se reasigna un turno
 */

import { db } from '@/lib/db';
import { safeLog, safeError } from '@/lib/logger';
import { sendWhatsApp } from '@/lib/whatsapp';
import { turnos, pacientes, medicos, ofertasTurno, listaEspera } from '@/drizzle/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { waitlistService } from '@/lib/services/waitlist';

// ─── Helpers ──────────────────────────────────────────────

/**
 * Envía un mensaje WhatsApp usando el canal activo (Chatwoot/Evolution
 * primero, Twilio como fallback). Si se conoce el id numérico de la
 * conversación Chatwoot, se fuerza ese canal para que la respuesta al
 * paciente viaje por el mismo canal por el que llegó.
 */
async function enviarWhatsApp(
  telefono: string,
  mensaje: string,
  conversationId?: number,
): Promise<boolean> {
  try {
    return await sendWhatsApp({ to: telefono, body: mensaje, conversationId });
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
 * Notifica al paciente que tiene un turno disponible (de una cancelación o
 * franja libre). Se envía cuando se crea una oferta automáticamente.
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
      `🎯 Te ofrecemos un turno disponible con el Dr. ${medico.nombre}:\n\n` +
      `📅 ${fechaStr}\n` +
      `⏰ ${horaStr}\n\n` +
      `⏳ Tenés 15 minutos para responder.\n\n` +
      `👉 Respondé "ACEPTAR" para confirmar.\n` +
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

    const mensaje = `🔄 Dr. ${medico.nombre}, un turno cancelado fue reasignado correctamente.`;

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
  conversationId?: number,
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

    const mensaje = `✅ Turno confirmado — ${fechaStr} a las ${horaStr}. Te esperamos.`;

    await enviarWhatsApp(paciente.telefono, mensaje, conversationId);
  } catch (error) {
    safeError(
      '[WhatsApp-Waitlist] Error notificarConfirmacionReasignacion:',
      error instanceof Error ? { message: error.message } : error,
    );
  }
}

/**
 * Notifica al paciente desplazado que su turno fue reasignado a otro paciente
 * de la lista de espera.
 *
 * @param turno Turno confirmado ya reasignado ({pacienteId, fechaHora, medicoId}).
 * @param pacienteAnteriorId ID del paciente que perdió el turno.
 * @returns true si el mensaje pudo enviarse por WhatsApp.
 */
export async function notificarPacienteReasignado(
  turno: { pacienteId: string; fechaHora: Date; medicoId: string },
  pacienteAnteriorId: string,
): Promise<boolean> {
  try {
    const [pacienteAnterior] = await db
      .select({ nombre: pacientes.nombre, telefono: pacientes.telefono })
      .from(pacientes)
      .where(and(eq(pacientes.id, pacienteAnteriorId), sql`${pacientes.deletedAt} IS NULL`))
      .limit(1);
    if (!pacienteAnterior || !pacienteAnterior.telefono) return false;

    const [medico] = await db
      .select({ nombre: medicos.nombre })
      .from(medicos)
      .where(and(eq(medicos.id, turno.medicoId), sql`${medicos.deletedAt} IS NULL`))
      .limit(1);
    if (!medico) return false;

    const fecha = turno.fechaHora instanceof Date ? turno.fechaHora : new Date(turno.fechaHora);
    const fechaStr = fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
    const horaStr = fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    const mensaje =
      `📢 Estimado ${pacienteAnterior.nombre}, tu turno con el Dr. ${medico.nombre} el ${fechaStr} a las ${horaStr} fue reasignado a otro paciente. Si necesitás otro horario, podemos agendarlo en la lista de espera.`;

    return await enviarWhatsApp(pacienteAnterior.telefono, mensaje);
  } catch (error) {
    safeError(
      '[WhatsApp-Waitlist] Error notificarPacienteReasignado:',
      error instanceof Error ? { message: error.message } : error,
    );
    return false;
  }
}

/**
 * Detecta si un mensaje entrante es respuesta a una oferta de turno
 * (ACEPTAR / RECHAZAR) y la procesa.
 *
 * @param pacienteId ID del paciente que responde
 * @param body       Texto del mensaje recibido
 * @param telefono   Teléfono del paciente
 * @param conversationId ID numérico de la conversación Chatwoot (opcional).
 *                       Si viene, las confirmaciones se envían por ese mismo
 *                       canal (Chatwoot/Evolution) en vez de elegir canal según
 *                       el flag global. Si no viene, se usa el canal activo.
 * @returns true si el mensaje fue procesado como respuesta de waitlist
 */
export async function handleWaitlistResponse(
  pacienteId: string,
  body: string,
  telefono: string,
  conversationId?: number,
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
      let saludo = 'No encontré un turno ofrecido pendiente para vos.';
      try {
        const [paciente] = await db
          .select({ nombre: pacientes.nombre })
          .from(pacientes)
          .where(and(eq(pacientes.id, pacienteId), sql`${pacientes.deletedAt} IS NULL`))
          .limit(1);
        if (paciente?.nombre) saludo = `Hola ${paciente.nombre}, ${saludo}`;
      } catch {
        // Si el fetch del nombre falla, usamos el mensaje sin nombre.
      }
      await enviarWhatsApp(telefono, saludo, conversationId);
      return true;
    }

    if (new Date() > new Date(oferta.expiracion)) {
      await enviarWhatsApp(telefono, 'Ese turno ofrecido ya expiró.', conversationId);
      return true;
    }

    if (esAceptar) {
      await waitlistService.aceptar(oferta.id);
      await notificarConfirmacionReasignacion(oferta.turnoId, pacienteId, conversationId);
      await notificarMedicoReasignacion(oferta.turnoId);
    } else {
      await waitlistService.rechazar(oferta.id);
      await enviarWhatsApp(
        telefono,
        'Entendido, rechazamos la oferta. Si se libera otro turno, te avisaremos.',
        conversationId,
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
