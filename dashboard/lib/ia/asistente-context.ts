/**
 * Extractores de contexto para el asistente IA flotante.
 *
 * Cada función extrae datos relevantes de la página actual
 * para inyectar como contexto en el system prompt o en las sugerencias.
 */

import { db } from '@/lib/db';
import { conversaciones, mensajes, pacientes, turnos, recetas } from '@/drizzle/schema';
import { eq, desc, and, isNull, sql, lt, gt } from 'drizzle-orm';

// ============================================================
// Tipos
// ============================================================

export interface ContextoConversacion {
  pacienteNombre: string;
  ultimoMensaje: string;
  totalMensajes: number;
  estado: string;
  canal: string;
}

export interface ContextoPaciente {
  pacienteNombre: string;
  tieneHistorial: boolean;
  turnosProximos: number;
  recetasActivas: number;
}

export interface ContextoTurnos {
  turnosHoy: number;
  confirmados: number;
  pendientes: number;
  cancelados: number;
}

// ============================================================
// Extractores
// ============================================================

/**
 * Extrae contexto de una conversación específica para el asistente.
 * Retorna null si no se encuentra la conversación.
 */
export async function extractContextoConversacion(
  conversacionId: string,
): Promise<ContextoConversacion | null> {
  const [conv] = await db
    .select({
      pacienteNombre: sql<string>`COALESCE(${pacientes.nombre}, '') || ' ' || COALESCE(${pacientes.apellido}, '')`,
      ultimoMensaje: conversaciones.ultimoMensaje,
      estado: conversaciones.estado,
      canal: conversaciones.canal,
    })
    .from(conversaciones)
    .leftJoin(pacientes, eq(conversaciones.pacienteId, pacientes.id))
    .where(eq(conversaciones.id, conversacionId))
    .limit(1);

  if (!conv) return null;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mensajes)
    .where(eq(mensajes.conversacionId, conversacionId));

  return {
    pacienteNombre: conv.pacienteNombre.trim(),
    ultimoMensaje: conv.ultimoMensaje || '',
    totalMensajes: Number(count),
    estado: conv.estado,
    canal: conv.canal,
  };
}

/**
 * Extrae contexto de un paciente específico para el asistente.
 */
export async function extractContextoPaciente(
  pacienteId: string,
): Promise<ContextoPaciente | null> {
  const [paciente] = await db
    .select({
      nombre: pacientes.nombre,
      apellido: pacientes.apellido,
    })
    .from(pacientes)
    .where(and(eq(pacientes.id, pacienteId), isNull(pacientes.deletedAt)))
    .limit(1);

  if (!paciente) return null;

  const hoy = new Date();
  const mañana = new Date(hoy);
  mañana.setDate(mañana.getDate() + 30);

  const [{ turnosCount }] = await db
    .select({ turnosCount: sql<number>`count(*)` })
    .from(turnos)
    .where(
      and(
        eq(turnos.pacienteId, pacienteId),
        gt(turnos.fechaHora, hoy),
        isNull(turnos.deletedAt),
      ),
    );

  const [{ recetasCount }] = await db
    .select({ recetasCount: sql<number>`count(*)` })
    .from(recetas)
    .where(
      and(
        eq(recetas.pacienteId, pacienteId),
        eq(recetas.estado, 'activa'),
      ),
    );

  return {
    pacienteNombre: `${paciente.nombre} ${paciente.apellido}`,
    tieneHistorial: true,
    turnosProximos: Number(turnosCount),
    recetasActivas: Number(recetasCount),
  };
}

/**
 * Extrae contexto general de turnos del día.
 */
export async function extractContextoTurnos(sucursalId?: string): Promise<ContextoTurnos> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

  const conditions = [
    gt(turnos.fechaHora, hoy),
    lt(turnos.fechaHora, manana),
    isNull(turnos.deletedAt),
  ];

  if (sucursalId) {
    conditions.push(eq(turnos.sucursalId, sucursalId));
  }

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(turnos)
    .where(and(...conditions));

  const [{ confirmados }] = await db
    .select({ confirmados: sql<number>`count(*)` })
    .from(turnos)
    .where(and(...conditions, eq(turnos.estado, 'confirmado')));

  const [{ pendientes }] = await db
    .select({ pendientes: sql<number>`count(*)` })
    .from(turnos)
    .where(and(...conditions, eq(turnos.estado, 'pendiente')));

  const [{ cancelados }] = await db
    .select({ cancelados: sql<number>`count(*)` })
    .from(turnos)
    .where(and(...conditions, eq(turnos.estado, 'cancelado')));

  return {
    turnosHoy: Number(total),
    confirmados: Number(confirmados),
    pendientes: Number(pendientes),
    cancelados: Number(cancelados),
  };
}

/**
 * Extrae los últimos N mensajes de una conversación para contexto del chat.
 */
export async function extractMensajesRecientes(
  conversacionId: string,
  limite: number = 10,
): Promise<{ rol: string; contenido: string }[]> {
  const msgs = await db
    .select({
      rol: mensajes.rol,
      contenido: mensajes.contenido,
    })
    .from(mensajes)
    .where(eq(mensajes.conversacionId, conversacionId))
    .orderBy(desc(mensajes.createdAt))
    .limit(limite);

  // Retornar en orden cronológico
  return msgs.reverse().map((m) => ({
    rol: m.rol,
    contenido: m.contenido,
  }));
}
