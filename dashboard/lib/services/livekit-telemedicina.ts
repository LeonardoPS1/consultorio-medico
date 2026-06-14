/**
 * LiveKit Telemedicina Service
 *
 * Orquesta la creación de salas de videollamada, generación de tokens
 * y envío de notificaciones WhatsApp para consultas virtuales.
 *
 * Flujo:
 *   1. Se crea un turno con tipoConsulta === 'virtual'
 *   2. Este service genera el room name + tokens
 *   3. Guarda el link en turnos.linkVideollamada
 *   4. Envía WhatsApp al paciente con el link
 */

import { db } from '@/lib/db';
import { safeError, safeLog } from '@/lib/logger';
import { turnos, pacientes, medicos } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import {
  getRoomName,
  generateMedicoToken,
  generatePacienteToken,
  getSalaLink,
  LIVEKIT_URL,
  LIVEKIT_API_KEY,
} from '@/lib/livekit';

// ─── Tipos ─────────────────────────────────────────────────

export interface SalaResult {
  roomName: string;
  tokenMedico: string;
  tokenPaciente: string;
  linkPaciente: string;
  linkMedico: string;
}

// ─── Service ───────────────────────────────────────────────

export const telemedicinaService = {
  /**
   * Configura una sala de videollamada para un turno virtual.
   *
   * 1. Genera room name basado en turnoId
   * 2. Genera tokens para médico y paciente
   * 3. Guarda linkVideollamada en el turno
   * 4. Envía WhatsApp al paciente
   *
   * @returns SalaResult o null si falla (no bloquea el flujo principal)
   */
  async configurarSala(turnoId: string, fechaHoraOverride?: Date): Promise<SalaResult | null> {
    try {
      // Validar que LiveKit esté configurado
      if (!LIVEKIT_API_KEY) {
        safeLog('[LiveKit] ⚠️ LiveKit no configurado, saltando creación de sala');
        return null;
      }

      const roomName = getRoomName(turnoId);

      // Obtener datos del turno + paciente + médico
      const [turno] = await db
        .select({
          pacienteId: turnos.pacienteId,
          medicoId: turnos.medicoId,
          fechaHora: turnos.fechaHora,
        })
        .from(turnos)
        .where(
          and(eq(turnos.id, turnoId), sql`${turnos.deletedAt} IS NULL`)
        )
        .limit(1);

      if (!turno) {
        safeError(`[LiveKit] Turno ${turnoId} no encontrado`);
        return null;
      }

      const [paciente] = await db
        .select({
          nombre: pacientes.nombre,
          apellido: pacientes.apellido,
          telefono: pacientes.telefono,
        })
        .from(pacientes)
        .where(
          and(
            eq(pacientes.id, turno.pacienteId),
            sql`${pacientes.deletedAt} IS NULL`
          )
        )
        .limit(1);

      const [medico] = await db
        .select({ nombre: medicos.nombre })
        .from(medicos)
        .where(
          and(
            eq(medicos.id, turno.medicoId),
            sql`${medicos.deletedAt} IS NULL`
          )
        )
        .limit(1);

      const nombrePaciente = paciente
        ? `${paciente.nombre} ${paciente.apellido}`.trim()
        : 'Paciente';
      const nombreMedico = medico?.nombre || 'Médico';

      // Generar tokens
      const tokenMedico = await generateMedicoToken(roomName, nombreMedico);
      const tokenPaciente = await generatePacienteToken(roomName, nombrePaciente);

      // Generar links
      const linkPaciente = getSalaLink(turnoId, tokenPaciente);
      const linkMedico = `/videollamada/${turnoId}`;

      // Guardar link videollamada en el turno
      await db
        .update(turnos)
        .set({
          linkVideollamada: linkPaciente,
          updatedAt: new Date(),
        })
        .where(eq(turnos.id, turnoId));

      // Usar fechaHora del parámetro (si se pasó) o de la DB
      const fechaHoraSource = fechaHoraOverride || turno.fechaHora;
      const fecha = fechaHoraSource
        ? new Intl.DateTimeFormat('es-CL', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'America/Santiago',
          }).format(new Date(fechaHoraSource))
        : '';
      const hora = fechaHoraSource
        ? new Intl.DateTimeFormat('es-CL', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Santiago',
          }).format(new Date(fechaHoraSource))
        : '';

      // Enviar WhatsApp al paciente
      if (paciente?.telefono) {
        this.enviarNotificacionWhatsApp({
          telefono: paciente.telefono,
          fecha,
          hora,
          medicoNombre: nombreMedico,
          linkVideollamada: linkPaciente,
        }).catch(() => {});
      }

      safeLog(`[LiveKit] Sala ${roomName} configurada para turno ${turnoId}`);

      return {
        roomName,
        tokenMedico,
        tokenPaciente,
        linkPaciente,
        linkMedico,
      };
    } catch (error) {
      safeError(
        `[LiveKit] Error configurando sala para turno ${turnoId}:`,
        error instanceof Error ? { message: error.message } : error
      );
      return null;
    }
  },

  /**
   * Envía WhatsApp al paciente con el link de videollamada.
   */
  async enviarNotificacionWhatsApp(params: {
    telefono: string;
    fecha: string;
    hora: string;
    medicoNombre: string;
    linkVideollamada: string;
  }): Promise<boolean> {
    try {
      const { telefono, fecha, hora, medicoNombre, linkVideollamada } = params;

      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

      if (!accountSid || !authToken || !fromNumber) {
        safeError('[LiveKit] ⚠️ Twilio no configurado');
        return false;
      }

      const mensaje = [
        '🔗 *Tu consulta virtual fue agendada*',
        '',
        `📅 ${fecha} a las ${hora}`,
        `👨‍⚕️ Dr/a. ${medicoNombre}`,
        '',
        'Hacé clic para conectarte cuando llegue la hora:',
        linkVideollamada,
        '',
        '*Importante:* Solo necesitás navegador web.',
        'No requiere descargar ninguna aplicación.',
        '',
        '🗓 Ingresá 5 minutos antes del horario agendado.',
      ].join('\n');

      const numeroLimpio = telefono.startsWith('whatsapp:')
        ? telefono
        : `whatsapp:${telefono}`;

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
        }
      );

      if (!res.ok) {
        const body = await res.text();
        safeError(`[LiveKit] Error Twilio: ${res.status} ${body}`);
        return false;
      }

      safeLog(`[LiveKit] WhatsApp enviado a ${telefono}`);
      return true;
    } catch (error) {
      safeError(
        '[LiveKit] Error enviando WhatsApp:',
        error instanceof Error ? { message: error.message } : error
      );
      return false;
    }
  },
};
