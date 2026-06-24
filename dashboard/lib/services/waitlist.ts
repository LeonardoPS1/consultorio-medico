/**
 * Service layer para Lista de Espera y Ofertas de Turno.
 *
 * Flujo:
 * 1. Un paciente se inscribe en lista de espera para un médico específico
 * 2. Cuando se cancela un turno, se busca al primer paciente en espera (FIFO)
 * 3. Se le ofrece el turno con expiración de 15 minutos
 * 4. El paciente acepta/rechaza vía WhatsApp o el médico desde el dashboard
 * 5. Si acepta: se reasigna el turno al paciente
 * 6. Si rechaza/expiro: se pasa al siguiente paciente
 *
 * Límites:
 * - Máximo 3 ofertas por paciente por día
 * - Después de 3 ofertas: pausa de 24h
 */

import { db } from '@/lib/db';
import { listaEspera, ofertasTurno, turnos, pacientes, medicos } from '@/drizzle/schema';
import { eq, and, sql, count, desc, asc, lt, not, inArray } from 'drizzle-orm';
import { notFound, conflict, fail } from '@/lib/api-handler';
import type { ListaEspera, OfertaTurno } from '@/drizzle/schema';

const TIEMPO_EXPIRACION_MINUTOS = 15;
const LIMITE_OFERTAS_POR_DIA = 3;

export const waitlistService = {
  // ============================================================
  // LISTA DE ESPERA
  // ============================================================

  /**
   * Agrega un paciente a la lista de espera para un médico específico.
   */
  async agregar(pacienteId: string, medicoId: string, notas?: string, sucursalId?: string) {
    // Validar que el paciente existe
    const [pac] = await db
      .select({ id: pacientes.id, nombre: pacientes.nombre, apellido: pacientes.apellido })
      .from(pacientes)
      .where(and(eq(pacientes.id, pacienteId), sql`${pacientes.deletedAt} IS NULL`))
      .limit(1);
    if (!pac) notFound('Paciente no encontrado');

    // Validar que el médico existe
    const [med] = await db
      .select({ id: medicos.id, nombre: medicos.nombre })
      .from(medicos)
      .where(and(eq(medicos.id, medicoId), sql`${medicos.deletedAt} IS NULL`))
      .limit(1);
    if (!med) notFound('Médico no encontrado');

    // Verificar que no haya una inscripción activa para el mismo paciente+médico
    const [existente] = await db
      .select({ id: listaEspera.id })
      .from(listaEspera)
      .where(
        and(
          eq(listaEspera.pacienteId, pacienteId),
          eq(listaEspera.medicoId, medicoId),
          eq(listaEspera.estado, 'activa'),
        ),
      )
      .limit(1);
    if (existente) conflict('El paciente ya está en lista de espera para este médico');

    const [nuevo] = await db
      .insert(listaEspera)
      .values({
        pacienteId,
        medicoId,
        notas: notas || null,
        sucursalId: sucursalId || null,
      })
      .returning();

    return nuevo;
  },

  /**
   * Quita (cancela) una inscripción de la lista de espera.
   */
  async quitar(id: string) {
    const [existe] = await db
      .select({ id: listaEspera.id })
      .from(listaEspera)
      .where(and(eq(listaEspera.id, id), eq(listaEspera.estado, 'activa')))
      .limit(1);
    if (!existe) notFound('Inscripción no encontrada o ya no está activa');

    await db.update(listaEspera).set({ estado: 'cancelada' }).where(eq(listaEspera.id, id));

    return { deleted: true };
  },

  /**
   * Busca el mejor candidato para un turno cancelado.
   * FIFO estricto: el paciente que lleva más tiempo esperando.
   * Límite: 3 ofertas/día/paciente, luego pausa 24h.
   */
  async buscarCandidato(medicoId: string, sucursalId?: string) {
    const candidatos = await db
      .select({
        id: listaEspera.id,
        pacienteId: listaEspera.pacienteId,
        fechaInscripcion: listaEspera.fechaInscripcion,
      })
      .from(listaEspera)
      .where(
        and(
          eq(listaEspera.medicoId, medicoId),
          eq(listaEspera.estado, 'activa'),
          sucursalId ? eq(listaEspera.sucursalId, sucursalId) : undefined,
        ),
      )
      .orderBy(asc(listaEspera.fechaInscripcion))
      .limit(5); // Traemos varios para filtrar por límite de ofertas

    // Filtrar pacientes que excedieron el límite de ofertas hoy
    const candidatosValidos = [];
    for (const c of candidatos) {
      const ofertasHoy = await db
        .select({ total: count() })
        .from(ofertasTurno)
        .where(
          and(
            eq(ofertasTurno.listaEsperaId, c.id),
            sql`${ofertasTurno.fechaOferta} >= CURRENT_DATE`,
            sql`${ofertasTurno.fechaOferta} < CURRENT_DATE + INTERVAL '1 day'`,
          ),
        );

      const totalOfertas = Number(ofertasHoy[0]?.total || 0);
      if (totalOfertas < LIMITE_OFERTAS_POR_DIA) {
        candidatosValidos.push(c);
      }
    }

    return candidatosValidos[0] || null;
  },

  // ============================================================
  // OFERTAS DE TURNO
  // ============================================================

  /**
   * Crea una oferta de turno para un paciente en lista de espera.
   */
  async crearOferta(listaEsperaId: string, turnoId: string) {
    // Validar que la inscripción existe y está activa
    const [inscripcion] = await db
      .select({ id: listaEspera.id, pacienteId: listaEspera.pacienteId })
      .from(listaEspera)
      .where(and(eq(listaEspera.id, listaEsperaId), eq(listaEspera.estado, 'activa')))
      .limit(1);
    if (!inscripcion) notFound('Inscripción en lista de espera no encontrada o no activa');

    // Validar que el turno existe y está cancelado/disponible
    const [turno] = await db
      .select({ id: turnos.id, estado: turnos.estado })
      .from(turnos)
      .where(and(eq(turnos.id, turnoId), sql`${turnos.deletedAt} IS NULL`))
      .limit(1);
    if (!turno) notFound('Turno no encontrado');
    if (turno.estado !== 'cancelada') conflict('El turno debe estar cancelado para ser ofrecido');

    // Verificar que no haya una oferta pendiente para este turno
    const [ofertaExistente] = await db
      .select({ id: ofertasTurno.id })
      .from(ofertasTurno)
      .where(and(eq(ofertasTurno.turnoId, turnoId), eq(ofertasTurno.estado, 'pendiente')))
      .limit(1);
    if (ofertaExistente) conflict('Ya hay una oferta pendiente para este turno');

    // Calcular expiración (15 minutos desde ahora)
    const expiracion = new Date(Date.now() + TIEMPO_EXPIRACION_MINUTOS * 60 * 1000);

    const [nueva] = await db
      .insert(ofertasTurno)
      .values({
        listaEsperaId,
        turnoId,
        expiracion,
      })
      .returning();

    return nueva;
  },

  /**
   * Acepta una oferta de turno y reasigna el turno al paciente en espera.
   */
  async aceptar(ofertaId: string) {
    const [oferta] = await db
      .select({
        id: ofertasTurno.id,
        estado: ofertasTurno.estado,
        expiracion: ofertasTurno.expiracion,
        listaEsperaId: ofertasTurno.listaEsperaId,
        turnoId: ofertasTurno.turnoId,
      })
      .from(ofertasTurno)
      .where(eq(ofertasTurno.id, ofertaId))
      .limit(1);
    if (!oferta) notFound('Oferta no encontrada');
    if (oferta.estado !== 'pendiente') conflict('La oferta ya fue ' + oferta.estado);
    if (new Date() > new Date(oferta.expiracion)) conflict('La oferta ha expirado');

    // Obtener la inscripción para saber el paciente
    const [inscripcion] = await db
      .select({ pacienteId: listaEspera.pacienteId })
      .from(listaEspera)
      .where(eq(listaEspera.id, oferta.listaEsperaId))
      .limit(1);

    // Reasignar el turno al nuevo paciente
    const [turnoActualizado] = await db
      .update(turnos)
      .set({
        pacienteId: inscripcion.pacienteId,
        estado: 'pendiente',
        updatedAt: new Date(),
      })
      .where(eq(turnos.id, oferta.turnoId))
      .returning();

    // Marcar oferta como aceptada
    await db
      .update(ofertasTurno)
      .set({ estado: 'aceptada', respondedAt: new Date() })
      .where(eq(ofertasTurno.id, ofertaId));

    // Marcar inscripción como cumplida
    await db
      .update(listaEspera)
      .set({ estado: 'cumplida' })
      .where(eq(listaEspera.id, oferta.listaEsperaId));

    return {
      oferta: { ...oferta, estado: 'aceptada' },
      turno: turnoActualizado,
    };
  },

  /**
   * Rechaza una oferta de turno.
   */
  async rechazar(ofertaId: string) {
    const [oferta] = await db
      .select({ id: ofertasTurno.id, estado: ofertasTurno.estado })
      .from(ofertasTurno)
      .where(eq(ofertasTurno.id, ofertaId))
      .limit(1);
    if (!oferta) notFound('Oferta no encontrada');
    if (oferta.estado !== 'pendiente') conflict('La oferta ya fue ' + oferta.estado);

    await db
      .update(ofertasTurno)
      .set({ estado: 'rechazada', respondedAt: new Date() })
      .where(eq(ofertasTurno.id, ofertaId));

    return { rechazada: true };
  },

  /**
   * Marca ofertas pendientes como expiradas.
   */
  async expirarPendientes() {
    const vencidas = await db
      .select({
        id: ofertasTurno.id,
        turnoId: ofertasTurno.turnoId,
        listaEsperaId: ofertasTurno.listaEsperaId,
        expiracion: ofertasTurno.expiracion,
      })
      .from(ofertasTurno)
      .where(and(eq(ofertasTurno.estado, 'pendiente'), lt(ofertasTurno.expiracion, new Date())));

    if (vencidas.length === 0) return [];

    const ids = vencidas.map((v) => v.id);
    await db
      .update(ofertasTurno)
      .set({ estado: 'expirada', respondedAt: new Date() })
      .where(inArray(ofertasTurno.id, ids));

    return vencidas;
  },

  /**
   * Pipeline de expiración: marca vencidas y busca siguiente candidato para cada turno.
   * Ejecutado por n8n WF-10 cada 5 minutos.
   */
  async ejecutarPipeline() {
    const results = {
      expiradas: 0,
      nuevasOfertas: 0,
      ofertas: [] as Array<{ ofertaId: string; pacienteId: string; turnoId: string }>,
    };

    // 1. Expiar ofertas vencidas
    const vencidas = await this.expirarPendientes();
    results.expiradas = vencidas.length;

    // 2. Para cada turno con oferta vencida, buscar siguiente candidato
    const turnosProcesados = new Set<string>();
    for (const v of vencidas) {
      if (turnosProcesados.has(v.turnoId)) continue;
      turnosProcesados.add(v.turnoId);

      // Obtener el médico y sucursal del turno
      const [turnoInfo] = await db
        .select({ medicoId: turnos.medicoId, sucursalId: turnos.sucursalId })
        .from(turnos)
        .where(eq(turnos.id, v.turnoId))
        .limit(1);
      if (!turnoInfo) continue;

      // Buscar siguiente candidato (excluyendo el que ya rechazó)
      const siguiente = await this.buscarCandidatoExcluyendo(
        turnoInfo.medicoId,
        [v.listaEsperaId],
        turnoInfo.sucursalId || undefined,
      );
      if (!siguiente) continue;

      // Crear nueva oferta
      const oferta = await this.crearOferta(siguiente.id, v.turnoId);
      results.nuevasOfertas++;
      results.ofertas.push({
        ofertaId: oferta.id,
        pacienteId: siguiente.pacienteId,
        turnoId: v.turnoId,
      });

      // Notificar al nuevo paciente (fire-and-forget)
      const { notificarOfertaTurno } = await import('@/lib/whatsapp-waitlist');
      notificarOfertaTurno(oferta.id, v.turnoId, siguiente.id).catch(() => {});
    }

    return results;
  },

  /**
   * Busca candidato excluyendo inscripciones específicas.
   */
  async buscarCandidatoExcluyendo(medicoId: string, excluirIds: string[], sucursalId?: string) {
    const candidatos = await db
      .select({
        id: listaEspera.id,
        pacienteId: listaEspera.pacienteId,
        fechaInscripcion: listaEspera.fechaInscripcion,
      })
      .from(listaEspera)
      .where(
        and(
          eq(listaEspera.medicoId, medicoId),
          eq(listaEspera.estado, 'activa'),
          excluirIds.length > 0 ? not(inArray(listaEspera.id, excluirIds)) : undefined,
          sucursalId ? eq(listaEspera.sucursalId, sucursalId) : undefined,
        ),
      )
      .orderBy(asc(listaEspera.fechaInscripcion))
      .limit(5);

    // Filtrar por límite de ofertas diarias
    for (const c of candidatos) {
      const ofertasHoy = await db
        .select({ total: count() })
        .from(ofertasTurno)
        .where(
          and(
            eq(ofertasTurno.listaEsperaId, c.id),
            sql`${ofertasTurno.fechaOferta} >= CURRENT_DATE`,
            sql`${ofertasTurno.fechaOferta} < CURRENT_DATE + INTERVAL '1 day'`,
          ),
        );

      const totalOfertas = Number(ofertasHoy[0]?.total || 0);
      if (totalOfertas < LIMITE_OFERTAS_POR_DIA) {
        return c;
      }
    }

    return null;
  },

  // ============================================================
  // LISTAR / CONSULTAS
  // ============================================================

  /**
   * Lista inscripciones en lista de espera con datos del paciente.
   */
  async listar(medicoId?: string, estado?: string) {
    const whereConditions = and(
      medicoId ? eq(listaEspera.medicoId, medicoId) : undefined,
      estado ? eq(listaEspera.estado, estado) : undefined,
    );

    const items = await db
      .select({
        id: listaEspera.id,
        pacienteId: listaEspera.pacienteId,
        medicoId: listaEspera.medicoId,
        fechaInscripcion: listaEspera.fechaInscripcion,
        estado: listaEspera.estado,
        notas: listaEspera.notas,
        pacienteNombre: pacientes.nombre,
        pacienteApellido: pacientes.apellido,
        pacienteTelefono: pacientes.telefono,
        medicoNombre: medicos.nombre,
      })
      .from(listaEspera)
      .leftJoin(pacientes, eq(listaEspera.pacienteId, pacientes.id))
      .leftJoin(medicos, eq(listaEspera.medicoId, medicos.id))
      .where(whereConditions)
      .orderBy(asc(listaEspera.fechaInscripcion));

    return items;
  },

  /**
   * Lista ofertas de turno con datos relacionados.
   */
  async listarOfertas(listaEsperaId?: string, estado?: string) {
    const whereConditions = and(
      listaEsperaId ? eq(ofertasTurno.listaEsperaId, listaEsperaId) : undefined,
      estado ? eq(ofertasTurno.estado, estado) : undefined,
    );

    const items = await db
      .select({
        id: ofertasTurno.id,
        listaEsperaId: ofertasTurno.listaEsperaId,
        turnoId: ofertasTurno.turnoId,
        fechaOferta: ofertasTurno.fechaOferta,
        expiracion: ofertasTurno.expiracion,
        estado: ofertasTurno.estado,
        notificada: ofertasTurno.notificada,
        notificadaAt: ofertasTurno.notificadaAt,
        respondedAt: ofertasTurno.respondedAt,
        pacienteNombre: pacientes.nombre,
        pacienteApellido: pacientes.apellido,
      })
      .from(ofertasTurno)
      .leftJoin(listaEspera, eq(ofertasTurno.listaEsperaId, listaEspera.id))
      .leftJoin(pacientes, eq(listaEspera.pacienteId, pacientes.id))
      .where(whereConditions)
      .orderBy(desc(ofertasTurno.fechaOferta));

    return items;
  },
};
