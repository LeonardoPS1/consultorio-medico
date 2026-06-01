/**
 * Encuestas — Servicio de encuestas post-consulta.
 *
 * - Envía WhatsApp de encuesta al paciente cuando un turno pasa a atendido
 * - Almacena respuestas en historial_medico (tipo = 'encuesta')
 * - Consulta estadísticas desde DB real
 */

import { db } from '@/lib/db';
import { safeLog, safeWarn, safeError } from '@/lib/logger';
import { turnos, pacientes, medicos, historialMedico } from '@/drizzle/schema';
import { eq, and, sql, count, avg, desc, gte, lt } from 'drizzle-orm';

// ─── Tipos ─────────────────────────────────────────────────

export interface EncuestaResponse {
  id: string;
  pacienteId: string;
  pacienteNombre: string;
  pacienteApellido: string;
  turnoId?: string;
  puntaje: number;
  comentario: string;
  fecha: string;
}

export interface EncuestaStats {
  totalEncuestas: number;
  puntajePromedio: number;
  distribucion: Record<number, number>;
  ultimasSemana: number;
  tendencia: 'subiendo' | 'estable' | 'bajando';
  respuestasRecientes: EncuestaResponse[];
}

// ─── ENVIAR: WhatsApp de encuesta post-consulta ────────────

/**
 * Envía un WhatsApp al paciente preguntando cómo calificaría su atención.
 * Fire-and-forget: no bloquea la respuesta.
 */
export async function sendSurveyWhatsApp(turnoId: string): Promise<void> {
  try {
    // Obtener datos del turno + paciente + médico
    const [row] = await db
      .select({
        telefono: pacientes.telefono,
        pacienteNombre: pacientes.nombre,
        pacienteApellido: pacientes.apellido,
        medicoNombre: medicos.nombre,
        hora: sql<string>`TO_CHAR(${turnos.fechaHora}, 'HH24:MI')`,
        fecha: sql<string>`TO_CHAR(${turnos.fechaHora}, 'DD/MM')`,
      })
      .from(turnos)
      .leftJoin(pacientes, eq(turnos.pacienteId, pacientes.id))
      .leftJoin(medicos, eq(turnos.medicoId, medicos.id))
      .where(and(eq(turnos.id, turnoId), sql`${turnos.deletedAt} IS NULL`))
      .limit(1);

    if (!row) {
      safeWarn(`[Encuestas] Turno ${turnoId} no encontrado — no se envía encuesta`);
      return;
    }

    const telefono = row.telefono;
    if (!telefono) {
      safeWarn(`[Encuestas] Paciente del turno ${turnoId} sin teléfono`);
      return;
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      safeWarn('[Encuestas] ⚠️ Falta config Twilio (TWILIO_ACCOUNT_SID, AUTH_TOKEN, WHATSAPP_NUMBER)');
      return;
    }

    const numeroLimpio = telefono.startsWith('whatsapp:') ? telefono : `whatsapp:${telefono}`;
    const pacienteNombre = `${row.pacienteNombre} ${row.pacienteApellido}`.trim();

    const mensaje = `👋 Hola ${row.pacienteNombre}! Gracias por tu visita del ${row.fecha} a las ${row.hora} con ${row.medicoNombre}.\n\n¿Cómo calificarías tu atención del 1 al 5?\n\nRespondé solo con un número (1 = Muy malo, 5 = Excelente).`;

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const formData = new URLSearchParams({
      From: fromNumber,
      To: numeroLimpio,
      Body: mensaje,
    });

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      safeLog(`[Encuestas] ✅ Encuesta enviada a ${pacienteNombre} (${telefono}) por turno ${turnoId}`);
    } else {
      const errBody = await res.text();
      safeWarn(`[Encuestas] ⚠️ Error Twilio al enviar encuesta: ${res.status} — ${errBody}`);
    }
  } catch (e) {
    safeWarn('[Encuestas] ⚠️ Error al enviar encuesta:', { error: (e as Error).message });
  }
}

// ─── ALMACENAR: Guardar respuesta de encuesta ──────────────

/**
 * Almacena una respuesta de encuesta en historial_medico.
 * Se llama tanto desde el endpoint POST como desde el webhook de Twilio
 * cuando detecta una respuesta numérica.
 */
export async function storeSurveyResponse(data: {
  pacienteId: string;
  turnoId?: string;
  puntaje: number;
  comentario?: string;
}): Promise<boolean> {
  try {
    await db.insert(historialMedico).values({
      pacienteId: data.pacienteId,
      turnoId: data.turnoId || null,
      tipo: 'encuesta',
      titulo: `Encuesta de satisfacción - ${data.puntaje}/5`,
      descripcion: data.comentario || 'Sin comentarios',
      visibleParaPaciente: false,
    });
    safeLog(`[Encuestas] ✅ Respuesta guardada: paciente ${data.pacienteId}, puntaje ${data.puntaje}`);
    return true;
  } catch (e) {
    safeError('[Encuestas] Error al guardar respuesta:', e instanceof Error ? { message: e.message } : e);
    return false;
  }
}

// ─── DETECTAR: ¿Es una respuesta de encuesta? ──────────────

/**
 * Detecta si un mensaje de WhatsApp es una respuesta de encuesta
 * (un número del 1 al 5, opcionalmente con texto adicional).
 *
 * Returns: { esEncuesta: true, puntaje: 1-5 } o { esEncuesta: false }
 */
export function detectSurveyResponse(body: string): { esEncuesta: boolean; puntaje?: number } {
  const trimmed = body.trim();

  // Caso 1: solo un número (1-5)
  if (/^[1-5]$/.test(trimmed)) {
    return { esEncuesta: true, puntaje: parseInt(trimmed, 10) };
  }

  // Caso 2: número seguido de texto (ej: "5 excelente atención")
  // La \b evita falsos positivos como "10" (detectado como puntaje 1)
  const match = trimmed.match(/^([1-5])\b\s*[.,]?\s*(.+)$/);
  if (match) {
    return { esEncuesta: true, puntaje: parseInt(match[1], 10) };
  }

  // Caso 3: texto que empieza con "un" o "una" y un número (ej: "un 4", "una 5")
  // \s+ requiere al menos un espacio entre el artículo y el número
  const matchConArticulo = trimmed.match(/^(?:un|una)\s+([1-5])\s*$/i);
  if (matchConArticulo) {
    return { esEncuesta: true, puntaje: parseInt(matchConArticulo[1], 10) };
  }

  return { esEncuesta: false };
}

// ─── ESTADÍSTICAS: Obtener stats desde DB real ─────────────

export async function getSurveyStats(): Promise<EncuestaStats> {
  // Obtener todas las encuestas de historial_medico
  const rows = await db
    .select({
      id: historialMedico.id,
      pacienteId: historialMedico.pacienteId,
      pacienteNombre: pacientes.nombre,
      pacienteApellido: pacientes.apellido,
      turnoId: historialMedico.turnoId,
      titulo: historialMedico.titulo,
      descripcion: historialMedico.descripcion,
      createdAt: historialMedico.createdAt,
    })
    .from(historialMedico)
    .leftJoin(pacientes, eq(historialMedico.pacienteId, pacientes.id))
    .where(eq(historialMedico.tipo, 'encuesta'))
    .orderBy(desc(historialMedico.createdAt))
    .limit(200);

  const totalEncuestas = rows.length;

  // Extraer puntaje del título ("Encuesta de satisfacción - 4/5" → 4)
  const respuestas = rows.map((r) => {
    const match = r.titulo?.match(/(\d+)\/5/);
    const puntaje = match ? parseInt(match[1], 10) : 0;
    return {
      id: r.id,
      pacienteId: r.pacienteId,
      pacienteNombre: r.pacienteNombre || '',
      pacienteApellido: r.pacienteApellido || '',
      turnoId: r.turnoId || undefined,
      puntaje,
      comentario: r.descripcion || '',
      fecha: r.createdAt.toISOString(),
    };
  });

  const puntajes = respuestas.filter((r) => r.puntaje > 0).map((r) => r.puntaje);
  const puntajePromedio = puntajes.length > 0
    ? Math.round((puntajes.reduce((a, b) => a + b, 0) / puntajes.length) * 10) / 10
    : 0;

  // Distribución de puntajes
  const distribucion: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const p of puntajes) {
    distribucion[p] = (distribucion[p] || 0) + 1;
  }

  // Última semana
  const hace7dias = new Date(Date.now() - 7 * 86400000).toISOString();
  const ultimasSemana = puntajes.filter((_, i) => {
    return new Date(respuestas[i].fecha) >= new Date(hace7dias);
  }).length;

  // Tendencia: comparar última semana con semana anterior
  const hace14dias = new Date(Date.now() - 14 * 86400000).toISOString();
  const semanaAnterior = respuestas.filter(
    (r) => new Date(r.fecha) >= new Date(hace14dias) && new Date(r.fecha) < new Date(hace7dias)
  ).length;

  let tendencia: 'subiendo' | 'estable' | 'bajando' = 'estable';
  if (ultimasSemana > semanaAnterior * 1.2) tendencia = 'subiendo';
  else if (ultimasSemana < semanaAnterior * 0.8) tendencia = 'bajando';

  return {
    totalEncuestas,
    puntajePromedio,
    distribucion,
    ultimasSemana,
    tendencia,
    respuestasRecientes: respuestas.slice(0, 20),
  };
}
