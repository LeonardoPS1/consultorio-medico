/**
 * Servicio de mensajería interna del staff (médico ↔ secretaria, médico ↔ médico).
 *
 * Alcance:
 * - Conversaciones estrictamente 1:1 entre usuarios del MISMO tenant (nunca cross-tenant).
 * - Contexto opcional de paciente y/o turno para conversaciones ancladas a una ficha/turno.
 * - RLS por tenant (migración 0060). Toda consulta pasa por tenant de la sesión.
 *
 * Política multi-sucursal (decisión documentada): el staff puede mensajear a cualquier
 * usuario del mismo tenant, sin importar la sucursal. La restricción relevante es el
 * TENANT, no la sucursal. Una conversación anclada a un paciente/turno solo es visible
 * para el staff con acceso normal a esos datos (mismo criterio de verifyPacienteAccess).
 */

import { and, asc, count, desc, eq, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  conversacionesInternas,
  mensajesInternos,
  usuarios,
  pacientes,
  turnos,
} from '@/drizzle/schema';
import { notFound, fail } from '@/lib/api-handler';
import { notificacionesService } from '@/lib/services/notificaciones';
import { emitEventToUser } from '@/lib/sse-events';

// ─── Tipos ────────────────────────────────────────────────────

export interface NuevoMensajeInput {
  contenido: string;
  urgente?: boolean;
}

export interface NuevaConversacionInput {
  participanteId: string;
  contextoPacienteId?: string;
  contextoTurnoId?: string;
}

// ─── Helpers de pertenencia ───────────────────────────────────

/** Verifica que el usuario sea participante (A o B) de la conversación. */
async function requireParticipante(conversacionId: string, usuarioId: string) {
  const [conv] = await db
    .select()
    .from(conversacionesInternas)
    .where(
      and(
        eq(conversacionesInternas.id, conversacionId),
        sql`${conversacionesInternas.deletedAt} IS NULL`,
        or(
          eq(conversacionesInternas.participanteAId, usuarioId),
          eq(conversacionesInternas.participanteBId, usuarioId),
        ),
      ),
    )
    .limit(1);
  if (!conv) notFound('Conversación no encontrada');
  return conv;
}

/** Identifica al otro participante de la conversación. */
function otroParticipante(conv: { participanteAId: string; participanteBId: string }, usuarioId: string) {
  return conv.participanteAId === usuarioId ? conv.participanteBId : conv.participanteAId;
}

// ─── Listado de conversaciones ────────────────────────────────

export interface ConversacionConContexto {
  id: string;
  participante: { id: string; nombre: string; rol: string };
  contextoPaciente: { id: string; nombre: string } | null;
  contextoTurno: { id: string; fechaHora: string; motivo: string | null } | null;
  ultimoMensaje: string | null;
  ultimoAutorId: string | null;
  ultimaInteraccion: string;
  noLeidos: number;
}

export async function listarConversaciones(usuarioId: string): Promise<ConversacionConContexto[]> {
  const convs = await db
    .select({
      id: conversacionesInternas.id,
      participanteAId: conversacionesInternas.participanteAId,
      participanteBId: conversacionesInternas.participanteBId,
      contextoPacienteId: conversacionesInternas.contextoPacienteId,
      contextoTurnoId: conversacionesInternas.contextoTurnoId,
      ultimoMensaje: conversacionesInternas.ultimoMensaje,
      ultimoAutorId: conversacionesInternas.ultimoAutorId,
      ultimaInteraccion: conversacionesInternas.ultimaInteraccion,
    })
    .from(conversacionesInternas)
    .where(
      and(
        sql`${conversacionesInternas.deletedAt} IS NULL`,
        or(
          eq(conversacionesInternas.participanteAId, usuarioId),
          eq(conversacionesInternas.participanteBId, usuarioId),
        ),
      ),
    )
    .orderBy(desc(conversacionesInternas.ultimaInteraccion));

  const resultado: ConversacionConContexto[] = [];
  for (const conv of convs) {
    const otroId = otroParticipante(conv, usuarioId);

    const [participante] = await db
      .select({ id: usuarios.id, nombre: usuarios.nombre, rol: usuarios.rol })
      .from(usuarios)
      .where(eq(usuarios.id, otroId))
      .limit(1);

    let contextoPaciente = null;
    if (conv.contextoPacienteId) {
      const [pac] = await db
        .select({ id: pacientes.id, nombre: pacientes.nombre })
        .from(pacientes)
        .where(eq(pacientes.id, conv.contextoPacienteId))
        .limit(1);
      if (pac) contextoPaciente = pac;
    }

    let contextoTurno = null;
    if (conv.contextoTurnoId) {
      const [turno] = await db
        .select({ id: turnos.id, fechaHora: turnos.fechaHora, motivo: turnos.motivo })
        .from(turnos)
        .where(eq(turnos.id, conv.contextoTurnoId))
        .limit(1);
      if (turno) {
        contextoTurno = {
          id: turno.id,
          fechaHora: turno.fechaHora?.toISOString?.() || String(turno.fechaHora || ''),
          motivo: turno.motivo,
        };
      }
    }

    const [{ total }] = await db
      .select({ total: count() })
      .from(mensajesInternos)
      .where(
        and(
          eq(mensajesInternos.conversacionId, conv.id),
          eq(mensajesInternos.autorId, otroId),
          sql`${mensajesInternos.leidoAt} IS NULL`,
        ),
      );

    resultado.push({
      id: conv.id,
      participante: {
        id: participante?.id || otroId,
        nombre: participante?.nombre || 'Usuario',
        rol: participante?.rol || 'medico',
      },
      contextoPaciente,
      contextoTurno,
      ultimoMensaje: conv.ultimoMensaje,
      ultimoAutorId: conv.ultimoAutorId,
      ultimaInteraccion: conv.ultimaInteraccion?.toISOString?.() || String(conv.ultimaInteraccion || ''),
      noLeidos: Number(total),
    });
  }
  return resultado;
}

// ─── Crear conversación ───────────────────────────────────────

/**
 * Crea una conversación 1:1, o reutiliza una existente del mismo par que no esté
 * anclada a otro contexto. Valida que el participante sea del mismo tenant.
 */
export async function crearConversacion(
  usuarioId: string,
  tenantId: string,
  input: NuevaConversacionInput,
) {
  if (!input.participanteId) fail('Falta el participante de la conversación');
  if (input.participanteId === usuarioId) fail('No podés conversar con vos mismo');

  // Validar que el participante pertenece AL MISMO TENANT (no confiar en la UI).
  const [target] = await db
    .select({ id: usuarios.id, nombre: usuarios.nombre, rol: usuarios.rol })
    .from(usuarios)
    .where(
      and(
        eq(usuarios.id, input.participanteId),
        eq(usuarios.tenantId, tenantId),
        eq(usuarios.activo, true),
        sql`${usuarios.deletedAt} IS NULL`,
      ),
    )
    .limit(1);
  if (!target) fail('El usuario seleccionado no pertenece a tu organización', 400);

  // Acceso al contexto: RLS por tenant ya filtra; verificamos además que el contexto
  // exista y sea visible para el usuario que inicia (mismo criterio de acceso que su ficha).
  if (input.contextoTurnoId) {
    const [turnoVisible] = await db
      .select({ id: turnos.id })
      .from(turnos)
      .where(and(eq(turnos.id, input.contextoTurnoId), sql`${turnos.deletedAt} IS NULL`))
      .limit(1);
    if (!turnoVisible) fail('El turno de contexto no existe o no tenés acceso a él', 400);
  }
  if (input.contextoPacienteId) {
    const [pacienteVisible] = await db
      .select({ id: pacientes.id })
      .from(pacientes)
      .where(and(eq(pacientes.id, input.contextoPacienteId), sql`${pacientes.deletedAt} IS NULL`))
      .limit(1);
    if (!pacienteVisible) fail('El paciente de contexto no existe o no tenés acceso a él', 400);
  }

  // Reutilizar conversación existente del mismo par si no está anclada a otro contexto.
  const [existente] = await db
    .select()
    .from(conversacionesInternas)
    .where(
      and(
        sql`${conversacionesInternas.deletedAt} IS NULL`,
        or(
          and(
            eq(conversacionesInternas.participanteAId, usuarioId),
            eq(conversacionesInternas.participanteBId, input.participanteId),
          ),
          and(
            eq(conversacionesInternas.participanteAId, input.participanteId),
            eq(conversacionesInternas.participanteBId, usuarioId),
          ),
        ),
      ),
    )
    .limit(1);
  if (existente) {
    return {
      ...existente,
      participante: { id: target.id, nombre: target.nombre, rol: target.rol },
    };
  }

  const [nueva] = await db
    .insert(conversacionesInternas)
    .values({
      tenantId,
      participanteAId: usuarioId,
      participanteBId: input.participanteId,
      contextoPacienteId: input.contextoPacienteId || null,
      contextoTurnoId: input.contextoTurnoId || null,
    })
    .returning();
  return {
    ...nueva,
    participante: { id: target.id, nombre: target.nombre, rol: target.rol },
  };
}

// ─── Mensajes ─────────────────────────────────────────────────

export interface MensajeConAutor {
  id: string;
  autorId: string;
  autorNombre: string;
  contenido: string;
  urgente: boolean;
  leidoAt: string | null;
  createdAt: string;
}

/**
 * Lista mensajes de la conversación y marca como leídos los recibidos.
 * Consultar la conversación equivale a leerla (mismo patrón que el chat del portal).
 */
export async function listarMensajes(conversacionId: string, usuarioId: string): Promise<MensajeConAutor[]> {
  await requireParticipante(conversacionId, usuarioId);

  // Marcar como leídos los mensajes recibidos del otro participante.
  const [conv] = await db
    .select({ participanteAId: conversacionesInternas.participanteAId, participanteBId: conversacionesInternas.participanteBId })
    .from(conversacionesInternas)
    .where(eq(conversacionesInternas.id, conversacionId))
    .limit(1);
  const otroId = conv ? otroParticipante(conv, usuarioId) : null;
  if (otroId) {
    await db
      .update(mensajesInternos)
      .set({ leidoAt: new Date() })
      .where(
        and(
          eq(mensajesInternos.conversacionId, conversacionId),
          eq(mensajesInternos.autorId, otroId),
          sql`${mensajesInternos.leidoAt} IS NULL`,
        ),
      );
  }

  const rows = await db
    .select({
      id: mensajesInternos.id,
      autorId: mensajesInternos.autorId,
      contenido: mensajesInternos.contenido,
      urgente: mensajesInternos.urgente,
      leidoAt: mensajesInternos.leidoAt,
      createdAt: mensajesInternos.createdAt,
    })
    .from(mensajesInternos)
    .where(eq(mensajesInternos.conversacionId, conversacionId))
    .orderBy(asc(mensajesInternos.createdAt));

  // Resolver nombres de autores (evitar N+1 con una sola query).
  const autorIds = [...new Set(rows.map((m) => m.autorId))];
  const autores = autorIds.length
    ? await db
        .select({ id: usuarios.id, nombre: usuarios.nombre })
        .from(usuarios)
        .where(or(...autorIds.map((id) => eq(usuarios.id, id))))
    : [];
  const nombrePorId = new Map(autores.map((a) => [a.id, a.nombre]));

  return rows.map((m) => ({
    id: m.id,
    autorId: m.autorId,
    autorNombre: nombrePorId.get(m.autorId) || 'Usuario',
    contenido: m.contenido,
    urgente: m.urgente,
    leidoAt: m.leidoAt?.toISOString?.() || null,
    createdAt: m.createdAt?.toISOString?.() || String(m.createdAt || ''),
  }));
}

// ─── Enviar mensaje ───────────────────────────────────────────

/**
 * Envía un mensaje: inserta, actualiza la conversación, notifica al destinatario
 * (con mención/urgente) y emite SSE dirigido al usuario destinatario.
 */
export async function enviarMensaje(
  conversacionId: string,
  usuarioId: string,
  tenantId: string,
  input: NuevoMensajeInput,
): Promise<MensajeConAutor> {
  const contenido = (input.contenido || '').trim();
  if (!contenido) fail('El mensaje no puede estar vacío');
  if (contenido.length > 4000) fail('El mensaje es demasiado largo (máximo 4000 caracteres)');

  const conv = await requireParticipante(conversacionId, usuarioId);
  const destinatarioId = otroParticipante(conv, usuarioId);

  const [nuevo] = await db
    .insert(mensajesInternos)
    .values({
      tenantId,
      conversacionId,
      autorId: usuarioId,
      contenido,
      urgente: Boolean(input.urgente),
    })
    .returning();

  await db
    .update(conversacionesInternas)
    .set({
      ultimoMensaje: contenido,
      ultimoAutorId: usuarioId,
      ultimaInteraccion: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(conversacionesInternas.id, conversacionId));

  const [autor] = await db
    .select({ id: usuarios.id, nombre: usuarios.nombre })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId))
    .limit(1);

  await notificarDestinatario({
    destinatarioId,
    autorNombre: autor?.nombre || 'Usuario',
    contenido,
    urgente: Boolean(input.urgente),
    conversacionId,
    tenantId,
  });

  await notificarMenciones({
    contenido,
    tenantId,
    usuarioId,
    autorNombre: autor?.nombre || 'Usuario',
    conversacionId,
  });

  // Tiempo real: emitir al usuario destinatario (y al autor para cerrar el ciclo en otra pestaña).
  emitEventToUser(destinatarioId, {
    type: 'mensaje-interno',
    data: { conversacionId, autorId: usuarioId },
  });
  emitEventToUser(usuarioId, {
    type: 'mensaje-interno-entregado',
    data: { conversacionId, mensajeId: nuevo.id },
  });

  return {
    id: nuevo.id,
    autorId: usuarioId,
    autorNombre: autor?.nombre || 'Usuario',
    contenido,
    urgente: Boolean(input.urgente),
    leidoAt: null,
    createdAt: nuevo.createdAt?.toISOString?.() || String(nuevo.createdAt || ''),
  };
}

async function notificarDestinatario(opts: {
  destinatarioId: string;
  autorNombre: string;
  contenido: string;
  urgente: boolean;
  conversacionId: string;
  tenantId: string;
}) {
  const { destinatarioId, autorNombre, contenido, urgente, conversacionId, tenantId } = opts;
  const esUrgente = urgente;
  const titulo = esUrgente
    ? `${autorNombre} te escribió (urgente)`
    : `Nuevo mensaje de ${autorNombre}`;
  const href = `/dashboard/mensajeria-interna?conversacion=${conversacionId}`;
  try {
    await notificacionesService.create({
      usuarioId: destinatarioId,
      titulo,
      descripcion: contenido.slice(0, 120),
      tipo: esUrgente ? 'urgencia' : 'mensaje',
      href,
      metadata: { conversacionId, urgente: esUrgente },
      tenantId,
    });
  } catch {
    // No bloquear el envío si la notificación falla.
  }
}

async function notificarMenciones(opts: {
  contenido: string;
  tenantId: string;
  usuarioId: string;
  autorNombre: string;
  conversacionId: string;
}) {
  const { contenido, tenantId, usuarioId, autorNombre, conversacionId } = opts;
  const menciones = extraerMenciones(contenido);
  if (!menciones.length) return;

  const staff = await db
    .select({ id: usuarios.id, nombre: usuarios.nombre })
    .from(usuarios)
    .where(
      and(
        eq(usuarios.tenantId, tenantId),
        eq(usuarios.activo, true),
        sql`${usuarios.deletedAt} IS NULL`,
      ),
    );

  for (const mencion of menciones) {
    const target = staff.find((u) => u.id !== usuarioId && coincideNombre(u.nombre, mencion));
    if (!target) continue;
    try {
      await notificacionesService.create({
        usuarioId: target.id,
        titulo: `${autorNombre} te mencionó en un mensaje`,
        descripcion: contenido.slice(0, 120),
        tipo: 'mensaje',
        href: `/dashboard/mensajeria-interna?conversacion=${conversacionId}`,
        metadata: { conversacionId, mencion: true },
        tenantId,
      });
    } catch {
      // Ignorar fallos de notificación.
    }
  }
}

/** Extrae menciones @nombre del contenido (soporta nombres con espacios). */
function extraerMenciones(contenido: string): string[] {
  const matches = contenido.match(/(^|\s)@([A-Za-zÁÉÍÓÚÑáéíóúñ\s']+?)(?=[,.!?;:)]|\s|$)/g) || [];
  return matches
    .map((m) => m.trim().replace(/^@/, '').trim())
    .filter((m) => m.length > 0);
}

/** Compara nombres normalizados (ignora mayúsculas, tildes leves y espacios). */
function coincideNombre(nombre: string, mencion: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[áàä]/g, 'a')
      .replace(/[éèë]/g, 'e')
      .replace(/[íìï]/g, 'i')
      .replace(/[óòö]/g, 'o')
      .replace(/[úùü]/g, 'u')
      .replace(/[\s']+/g, ' ')
      .trim();
  return normalize(nombre) === normalize(mencion);
}

// ─── Conteo para el badge de navegación ───────────────────────

/** Total de mensajes no leídos del usuario (recibidos, de todas sus conversaciones). */
export async function getNoLeidosTotales(usuarioId: string): Promise<number> {
  const convs = await db
    .select({ id: conversacionesInternas.id, participanteAId: conversacionesInternas.participanteAId })
    .from(conversacionesInternas)
    .where(
      and(
        eq(conversacionesInternas.participanteAId, usuarioId),
        sql`${conversacionesInternas.deletedAt} IS NULL`,
      ),
    );
  const convsB = await db
    .select({ id: conversacionesInternas.id, participanteBId: conversacionesInternas.participanteBId })
    .from(conversacionesInternas)
    .where(
      and(
        eq(conversacionesInternas.participanteBId, usuarioId),
        sql`${conversacionesInternas.deletedAt} IS NULL`,
      ),
    );

  const convIds = [...convs.map((c) => c.id), ...convsB.map((c) => c.id)];
  if (!convIds.length) return 0;

  const [{ total }] = await db
    .select({ total: count() })
    .from(mensajesInternos)
    .where(
      and(
        or(...convIds.map((id) => eq(mensajesInternos.conversacionId, id))),
        sql`${mensajesInternos.leidoAt} IS NULL`,
      ),
    );
  return Number(total);
}

// ─── Staff disponible para iniciar conversación ───────────────

export async function listarStaff(tenantId: string, excluirUsuarioId: string) {
  return db
    .select({ id: usuarios.id, nombre: usuarios.nombre, rol: usuarios.rol })
    .from(usuarios)
    .where(
      and(
        eq(usuarios.tenantId, tenantId),
        eq(usuarios.activo, true),
        sql`${usuarios.deletedAt} IS NULL`,
        sql`${usuarios.id} != ${excluirUsuarioId}`,
      ),
    )
    .orderBy(usuarios.nombre);
}