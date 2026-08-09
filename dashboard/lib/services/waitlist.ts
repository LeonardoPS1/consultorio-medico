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

import {
  and,
  eq,
  sql,
  count,
  desc,
  asc,
  lt,
  not,
  inArray,
  gte,
  lte,
  notInArray,
} from 'drizzle-orm';
import {
  listaEspera,
  ofertasTurno,
  turnos,
  pacientes,
  medicos,
  bloqueosAgenda,
} from '@/drizzle/schema';
import { notFound, conflict } from '@/lib/api-handler';
import { db } from '@/lib/db';

const TIEMPO_EXPIRACION_MINUTOS = 15;
const LIMITE_OFERTAS_POR_DIA = 3;

export const waitlistService = {
  // ============================================================
  // LISTA DE ESPERA
  // ============================================================

  /**
   * Agrega un paciente a la lista de espera para un médico específico.
   * @param pacienteId
   * @param medicoId
   * @param notas
   * @param sucursalId
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
   * @param id
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
   * @param medicoId
   * @param sucursalId
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
   * @param listaEsperaId
   * @param turnoId
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
   * @param ofertaId
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
   * @param ofertaId
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
   * @param medicoId
   * @param excluirIds
   * @param sucursalId
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
   * @param medicoId
   * @param estado
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
   * @param listaEsperaId
   * @param estado
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

// ============================================================
// FRANJAS LIBRES
// ============================================================

/** Entrada de horario configurada para un día de la semana en `medicos.horarios`. */
interface HorarioDia {
  activo?: boolean;
  inicio?: string;
  fin?: string;
  tipo?: string;
  inicio2?: string | null;
  fin2?: string | null;
}

/** Franja horaria libre (no ocupada por turno ni bloqueo de agenda). */
export interface IFranjaLibre {
  fechaHora: Date;
  duracionMinutos: number;
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

function getDiaSemana(fecha: Date): string {
  return DIAS[fecha.getDay()];
}

/**
 * Calcula las próximas franjas libres de un médico.
 *
 * Considera los horarios configurados en `medicos.horarios` (soporta horarios
 * partidos `tipo === 'partido'` con `inicio2/fin2`), excluye turnos existentes
 * (estado distinto de 'cancelada'/'no_asistio') y bloqueos de agenda. Solo se
 * devuelven franjas futuras (`fechaHora > new Date()`), ordenadas ascendente
 * y recortadas al `limite` indicado.
 * @param medicoId - ID del médico del que se calculan las franjas.
 * @param opts - Opciones: `dias` (ventana en días, default 7) y `limite` (máx. de franjas, default 20).
 * @param opts.dias
 * @param opts.limite
 * @returns Franjas libres futuras ordenadas ascendentemente.
 */
export async function proximasFranjasLibres(
  medicoId: string,
  opts: { dias?: number; limite?: number } = {},
): Promise<IFranjaLibre[]> {
  const dias = Math.max(1, opts.dias ?? 7);
  const limite = Math.max(1, opts.limite ?? 20);
  const ahora = new Date();

  const [med] = await db
    .select({
      horarios: medicos.horarios,
      duracionTurnoMinutos: medicos.duracionTurnoMinutos,
    })
    .from(medicos)
    .where(and(eq(medicos.id, medicoId), sql`${medicos.deletedAt} IS NULL`))
    .limit(1);
  if (!med) return [];

  const duracion = med.duracionTurnoMinutos || 30;
  const horariosMedico = (med.horarios || {}) as Record<string, HorarioDia | undefined>;

  // Ventana de consulta: hoy + `dias` días (filtra en DB, refinamos en memoria por día)
  const finVentana = new Date(ahora);
  finVentana.setDate(ahora.getDate() + dias - 1);
  finVentana.setHours(23, 59, 59, 999);

  const turnosExistentes = await db
    .select({ fechaHora: turnos.fechaHora, duracionMinutos: turnos.duracionMinutos })
    .from(turnos)
    .where(
      and(
        eq(turnos.medicoId, medicoId),
        gte(turnos.fechaHora, ahora),
        lte(turnos.fechaHora, finVentana),
        notInArray(turnos.estado, ['cancelada', 'no_asistio']),
        sql`${turnos.deletedAt} IS NULL`,
      ),
    );

  const bloqueos = await db
    .select({ fechaInicio: bloqueosAgenda.fechaInicio, fechaFin: bloqueosAgenda.fechaFin })
    .from(bloqueosAgenda)
    .where(
      and(
        eq(bloqueosAgenda.medicoId, medicoId),
        gte(bloqueosAgenda.fechaFin, ahora),
        lte(bloqueosAgenda.fechaInicio, finVentana),
      ),
    );

  const franjas: IFranjaLibre[] = [];

  for (let i = 0; i < dias && franjas.length < limite; i++) {
    const dia = new Date(ahora);
    dia.setDate(ahora.getDate() + i);
    dia.setHours(0, 0, 0, 0);

    const horario = horariosMedico[getDiaSemana(dia)];
    if (!horario?.activo) continue;

    const inicioDia = dia.getTime();
    const finDia = inicioDia + 24 * 60 * 60 * 1000;

    const turnosDia = turnosExistentes.filter((t) => {
      const ts = new Date(t.fechaHora).getTime();
      return ts >= inicioDia && ts < finDia;
    });
    const bloqueosDia = bloqueos.filter((b) => {
      const bInicio = new Date(b.fechaInicio).getTime();
      const bFin = new Date(b.fechaFin).getTime();
      return bInicio < finDia && bFin > inicioDia;
    });

    const intervalos =
      horario.tipo === 'partido'
        ? [
            { inicio: horario.inicio || '', fin: horario.fin || '' },
            ...(horario.inicio2 && horario.fin2
              ? [{ inicio: horario.inicio2, fin: horario.fin2 }]
              : []),
          ]
        : [{ inicio: horario.inicio || '', fin: horario.fin || '' }];

    for (const intervalo of intervalos) {
      const [hInicio, mInicio] = intervalo.inicio.split(':').map(Number);
      const [hFin, mFin] = intervalo.fin.split(':').map(Number);
      if (
        Number.isNaN(hInicio) ||
        Number.isNaN(mInicio) ||
        Number.isNaN(hFin) ||
        Number.isNaN(mFin)
      ) {
        continue;
      }

      let horaActual = new Date(dia);
      horaActual.setHours(hInicio, mInicio, 0, 0);
      const horaFin = new Date(dia);
      horaFin.setHours(hFin, mFin, 0, 0);

      while (
        franjas.length < limite &&
        horaActual.getTime() + duracion * 60_000 <= horaFin.getTime()
      ) {
        const slotFin = new Date(horaActual.getTime() + duracion * 60_000);

        // Verificar si choca con algún bloqueo de agenda
        const bloqueado = bloqueosDia.some(
          (b) =>
            horaActual.getTime() < new Date(b.fechaFin).getTime() &&
            slotFin.getTime() > new Date(b.fechaInicio).getTime(),
        );
        if (!bloqueado) {
          // Verificar si choca con algún turno existente
          const ocupado = turnosDia.some((t) => {
            const tInicio = new Date(t.fechaHora).getTime();
            const tFin = tInicio + t.duracionMinutos * 60_000;
            return horaActual.getTime() < tFin && slotFin.getTime() > tInicio;
          });

          // Solo franjas futuras
          if (!ocupado && horaActual.getTime() > ahora.getTime()) {
            franjas.push({ fechaHora: new Date(horaActual.getTime()), duracionMinutos: duracion });
          }
        }

        horaActual = new Date(horaActual.getTime() + duracion * 60_000);
      }
    }
  }

  return franjas;
}
