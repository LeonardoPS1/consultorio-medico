/**
 * Portal Booking — Servicio de agendamiento desde el portal del paciente.
 *
 * Proporciona:
 * - Médicos disponibles para agendar (con servicios y precios)
 * - Slots disponibles por médico/fecha
 * - Creación de turnos con validaciones
 * - Verificación de cancelaciones
 */

import { db } from '@/lib/db';
import { medicos, servicios, horariosAtencion, bloqueosAgenda, turnos, pacientes } from '@/drizzle/schema';
import { eq, and, sql, gte, lte, inArray, notInArray } from 'drizzle-orm';
import { safeWarn, safeError } from '@/lib/logger';

// ─── Tipos públicos ──────────────────────────────────────────

export interface MedicoPortal {
  id: string;
  nombre: string;
  especialidad: string;
  matricula: string | null;
  servicios: ServicioPortal[];
  duracionTurnoMinutos: number;
  colorEvento: string | null;
}

export interface ServicioPortal {
  id: string;
  nombre: string;
  duracionMinutos: number;
  precio: number | null;
}

export interface SlotDisponible {
  fechaHora: string; // ISO
  duracionMinutos: number;
  precio: number | null;
  servicioId: string;
  servicioNombre: string;
}

// ─── Médicos disponibles (para el portal) ────────────────────

export async function medicosDisponiblesPortal(sucursalId?: string): Promise<MedicoPortal[]> {
  const rows = await db
    .select({
      id: medicos.id,
      nombre: medicos.nombre,
      especialidad: medicos.especialidad,
      matricula: medicos.matricula,
      duracionTurnoMinutos: medicos.duracionTurnoMinutos,
      colorEvento: medicos.colorEvento,
      servicioId: servicios.id,
      servicioNombre: servicios.nombre,
      servicioDuracion: servicios.duracionMinutos,
      servicioPrecio: servicios.precio,
    })
    .from(medicos)
    .leftJoin(servicios, eq(servicios.medicoId, medicos.id))
    .where(
      and(
        eq(medicos.activo, true),
        sql`${medicos.deletedAt} IS NULL`,
        sucursalId ? eq(medicos.sucursalId, sucursalId) : undefined,
      ),
    )
    .orderBy(medicos.nombre);

  // Agrupar médicos con sus servicios
  const medicoMap = new Map<string, MedicoPortal>();
  for (const row of rows) {
    if (!medicoMap.has(row.id)) {
      medicoMap.set(row.id, {
        id: row.id,
        nombre: row.nombre,
        especialidad: row.especialidad,
        matricula: row.matricula,
        servicios: [],
        duracionTurnoMinutos: row.duracionTurnoMinutos,
        colorEvento: row.colorEvento,
      });
    }
    if (row.servicioId) {
      medicoMap.get(row.id)!.servicios.push({
        id: row.servicioId,
        nombre: row.servicioNombre!,
        duracionMinutos: row.servicioDuracion ?? 30,
        precio: row.servicioPrecio ? Number(row.servicioPrecio) : null,
      });
    }
  }

  return Array.from(medicoMap.values());
}

// ─── Slots disponibles ───────────────────────────────────────

/**
 * Calcula los slots disponibles para un médico en una fecha específica.
 * Considera: horarios de atención, bloqueos de agenda, turnos existentes.
 */
export async function slotsDisponibles(
  medicoId: string,
  fecha: string, // ISO date "YYYY-MM-DD"
  servicioId: string,
): Promise<SlotDisponible[]> {
  const diaSemana = getDiaSemana(fecha); // "lunes", "martes", etc.
  const fechaDate = new Date(fecha + 'T00:00:00');

  // 1. Obtener horario del día
  const [horario] = await db
    .select()
    .from(horariosAtencion)
    .where(and(eq(horariosAtencion.dia, diaSemana), eq(horariosAtencion.activo, true)))
    .limit(1);

  if (!horario) return []; // No atiende este día

  // 2. Obtener servicio para duración y precio
  const [servicio] = await db
    .select({ duracionMinutos: servicios.duracionMinutos, precio: servicios.precio, nombre: servicios.nombre })
    .from(servicios)
    .where(and(eq(servicios.id, servicioId), eq(servicios.activo, true)))
    .limit(1);

  if (!servicio) return [];

  const duracion = servicio.duracionMinutos || 30;
  const precio = servicio.precio ? Number(servicio.precio) : null;

  // 3. Obtener bloqueos de agenda
  const bloqueos = await db
    .select({ fechaInicio: bloqueosAgenda.fechaInicio, fechaFin: bloqueosAgenda.fechaFin })
    .from(bloqueosAgenda)
    .where(
      and(
        eq(bloqueosAgenda.medicoId, medicoId),
        lte(bloqueosAgenda.fechaInicio, new Date(fecha + 'T23:59:59')),
        gte(bloqueosAgenda.fechaFin, fechaDate),
      ),
    );

  // 4. Obtener turnos existentes para esa fecha
  const turnosExistentes = await db
    .select({ fechaHora: turnos.fechaHora, duracionMinutos: turnos.duracionMinutos })
    .from(turnos)
    .where(
      and(
        eq(turnos.medicoId, medicoId),
        gte(turnos.fechaHora, fechaDate),
        lte(turnos.fechaHora, new Date(fecha + 'T23:59:59')),
        notInArray(turnos.estado, ['cancelada', 'no_asistio']),
        sql`${turnos.deletedAt} IS NULL`,
      ),
    );

  // 5. Generar slots cada 30 min dentro del horario
  const slots: SlotDisponible[] = [];
  const intervalos = horario.tipo === 'partido'
    ? [
        { inicio: horario.inicio!, fin: horario.fin! },
        ...(horario.inicio2 && horario.fin2 ? [{ inicio: horario.inicio2, fin: horario.fin2 }] : []),
      ]
    : [{ inicio: horario.inicio!, fin: horario.fin! }];

  for (const intervalo of intervalos) {
    const [hInicio, mInicio] = intervalo.inicio.split(':').map(Number);
    const [hFin, mFin] = intervalo.fin.split(':').map(Number);
    let horaActual = new Date(fechaDate);
    horaActual.setHours(hInicio, mInicio, 0, 0);
    const horaFin = new Date(fechaDate);
    horaFin.setHours(hFin, mFin, 0, 0);

    while (horaActual.getTime() + duracion * 60_000 <= horaFin.getTime()) {
      const slotFin = new Date(horaActual.getTime() + duracion * 60_000);

      // Verificar si choca con algún bloqueo
      const bloqueado = bloqueos.some((b) => horaActual < b.fechaFin && slotFin > b.fechaInicio);
      if (!bloqueado) {
        // Verificar si choca con algún turno existente
        const ocupado = turnosExistentes.some((t) => {
          const tInicio = new Date(t.fechaHora);
          const tFin = new Date(tInicio.getTime() + t.duracionMinutos * 60_000);
          return horaActual < tFin && slotFin > tInicio;
        });

        if (!ocupado) {
          slots.push({
            fechaHora: horaActual.toISOString(),
            duracionMinutos: duracion,
            precio,
            servicioId,
            servicioNombre: servicio.nombre!,
          });
        }
      }

      horaActual = new Date(horaActual.getTime() + 30 * 60_000); // step 30 min
    }
  }

  return slots;
}

// ─── Crear turno desde el portal ─────────────────────────────

export interface CrearTurnoPortalInput {
  pacienteId: string;
  medicoId: string;
  servicioId: string;
  fechaHora: string; // ISO
  motivo?: string;
  sucursalId?: string;
}

export type TurnoCreadoPortal = Awaited<ReturnType<typeof crearTurnoPortal>>;

export async function crearTurnoPortal(input: CrearTurnoPortalInput) {
  // 1. Validar servicio
  const [servicio] = await db
    .select({ duracionMinutos: servicios.duracionMinutos, precio: servicios.precio, nombre: servicios.nombre })
    .from(servicios)
    .where(and(eq(servicios.id, input.servicioId), eq(servicios.activo, true)))
    .limit(1);
  if (!servicio) throw new Error('Servicio no encontrado');

  // 2. Verificar que el slot esté disponible
  const fecha = input.fechaHora.split('T')[0];
  const slots = await slotsDisponibles(input.medicoId, fecha, input.servicioId);
  const slotValido = slots.some((s) => s.fechaHora === input.fechaHora);
  if (!slotValido) throw new Error('El horario seleccionado no está disponible');

  // 3. Crear turno
  const fechaHora = new Date(input.fechaHora);
  const [turno] = await db
    .insert(turnos)
    .values({
      pacienteId: input.pacienteId,
      medicoId: input.medicoId,
      fechaHora,
      duracionMinutos: servicio.duracionMinutos || 30,
      estado: 'pendiente',
      tipoConsulta: 'presencial',
      motivo: input.motivo || null,
      fuente: 'portal',
      sucursalId: input.sucursalId || null,
      precio: servicio.precio || null,
    })
    .returning();

  // 4. Obtener datos del paciente y médico para la respuesta
  const [pacienteRow] = await db
    .select({ nombre: pacientes.nombre, telefono: pacientes.telefono })
    .from(pacientes)
    .where(eq(pacientes.id, input.pacienteId))
    .limit(1);

  const [medicoRow] = await db
    .select({ nombre: medicos.nombre, especialidad: medicos.especialidad })
    .from(medicos)
    .where(eq(medicos.id, input.medicoId))
    .limit(1);

  return {
    ...turno,
    pacienteNombre: pacienteRow?.nombre || '',
    pacienteTelefono: pacienteRow?.telefono || '',
    medicoNombre: medicoRow?.nombre || '',
    medicoEspecialidad: medicoRow?.especialidad || '',
    servicioNombre: servicio.nombre || '',
  };
}

// ─── WhatsApp confirmation ───────────────────────────────────

/**
 * Envía confirmación de turno por WhatsApp al paciente.
 * Fire-and-forget: no bloquea el flujo principal.
 */
export async function sendTurnoConfirmacionWhatsApp(
  telefono: string,
  pacienteNombre: string,
  medicoNombre: string,
  especialidad: string,
  fechaHora: string,
  motivo: string | null,
  precio: number | null,
): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !fromNumber) return;

  const fecha = new Date(fechaHora);
  const fechaStr = fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  const horaStr = fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  let message = `✅ *Turno confirmado - Consultorio Médico*

Hola ${pacienteNombre}, tu turno fue agendado correctamente:

🩺 *Médico:* ${medicoNombre} (${especialidad})
📅 *Fecha:* ${fechaStr}
⏰ *Hora:* ${horaStr}`;

  if (motivo) message += `\n📝 *Motivo:* ${motivo}`;
  if (precio && precio > 0) message += `\n💰 *Pendiente de pago:* $${precio.toLocaleString('es-CL')}`;
  message += `\n\nSi no puedes asistir, cancelá con anticipación desde el portal.
🔗 ${process.env.NEXT_PUBLIC_APP_URL || 'https://med.aicorebots.com'}/portal`;

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: telefono.startsWith('+') ? telefono : `+${telefono}`,
          From: fromNumber,
          Body: message,
        }),
      },
    );
    if (!response.ok) {
      safeWarn('[PortalBooking] Error enviando confirmación WhatsApp:', { status: response.status });
    }
  } catch (e) {
    safeError('[PortalBooking] Error enviando confirmación WhatsApp:', e instanceof Error ? { message: e.message } : e);
  }
}

// ─── Helpers ─────────────────────────────────────────────────

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function getDiaSemana(fechaISO: string): string {
  const d = new Date(fechaISO + 'T12:00:00');
  return DIAS[d.getDay()];
}
