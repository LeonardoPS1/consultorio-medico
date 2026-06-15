import { db } from '@/lib/db';
import { safeError, safeLog } from '@/lib/logger';
import { turnos, pacientes, medicos, bloqueosAgenda, ofertasTurno } from '@/drizzle/schema';
import { eq, and, sql, count, desc, gte, lt } from 'drizzle-orm';
import type { CreateTurno, UpdateTurno } from '@/lib/validations';
import { conflict, notFound, fail } from '@/lib/api-handler';
import { buildGCalPayload, syncTurnoToGCal } from '@/lib/google-calendar-sync';
import { waitlistService } from '@/lib/services/waitlist';
import { cache } from '@/lib/cache';
import { telemedicinaService } from '@/lib/services/livekit-telemedicina';

export const turnosService = {
  async list(fechaStr?: string, estado?: string, medico?: string, tipo?: string, search?: string, limit = 100, offset = 0, sucursalId?: string, medicoId?: string, fechaDesde?: string, fechaHasta?: string) {
    const cacheKey = `turnos:list:${fechaStr ?? fechaDesde ?? fechaHasta ?? '*'}:${estado ?? ''}:${medico ?? ''}:${tipo ?? ''}:${search ?? ''}:${limit}:${offset}:${sucursalId ?? ''}:${medicoId ?? ''}`;
    return cache.getOrSet(cacheKey, async () => {
      let fechaConditions: any[] = [];
      if (fechaDesde && fechaHasta) {
        fechaConditions = [
          sql`${turnos.fechaHora} >= ${fechaDesde + 'T00:00:00.000Z'}::timestamptz`,
          sql`${turnos.fechaHora} <= ${fechaHasta + 'T23:59:59.999Z'}::timestamptz`,
        ];
      } else if (fechaStr) {
        fechaConditions = [
          sql`${turnos.fechaHora} >= ${fechaStr + 'T00:00:00.000Z'}::timestamptz`,
          sql`${turnos.fechaHora} < ${new Date(new Date(fechaStr + 'T00:00:00.000Z').getTime() + 86400000).toISOString()}::timestamptz`,
        ];
      }

      const whereConditions = and(
        ...fechaConditions,
        sql`${turnos.deletedAt} IS NULL`,
        estado ? eq(turnos.estado, estado) : undefined,
        tipo ? eq(turnos.tipoConsulta, tipo) : undefined,
        medico ? sql`EXISTS (SELECT 1 FROM ${medicos} WHERE ${medicos.id} = ${turnos.medicoId} AND ${medicos.nombre} ILIKE ${'%' + medico + '%'})` : undefined,
        search ? sql`EXISTS (SELECT 1 FROM ${pacientes} WHERE ${pacientes.id} = ${turnos.pacienteId} AND (${pacientes.nombre} ILIKE ${'%' + search + '%'} OR ${pacientes.apellido} ILIKE ${'%' + search + '%'}))` : undefined,
        sucursalId ? eq(turnos.sucursalId, sucursalId) : undefined,
        medicoId ? eq(turnos.medicoId, medicoId) : undefined,
      );

      const statsWhere = and(
        ...fechaConditions,
        sql`${turnos.deletedAt} IS NULL`,
        sucursalId ? eq(turnos.sucursalId, sucursalId) : undefined,
        medicoId ? eq(turnos.medicoId, medicoId) : undefined,
      );
      const statsRows = await db.select({ estado: turnos.estado, total: count() }).from(turnos).where(statsWhere).groupBy(turnos.estado);
      const statsPorEstado: Record<string, number> = {};
      let statsTotal = 0;
      for (const r of statsRows) { statsPorEstado[r.estado] = Number(r.total); statsTotal += Number(r.total); }

      const [{ totalFiltrados }] = await db.select({ totalFiltrados: count() }).from(turnos).where(whereConditions);
      const lista = await db.select({
        id: turnos.id, fecha: sql<string>`TO_CHAR(${turnos.fechaHora}, 'YYYY-MM-DD')`, hora: sql<string>`TO_CHAR(${turnos.fechaHora}, 'HH24:MI')`,
        estado: turnos.estado, tipo: turnos.tipoConsulta, motivo: turnos.motivo,
        pacienteNombre: pacientes.nombre, pacienteApellido: pacientes.apellido,
        medicoNombre: medicos.nombre, medicoId: medicos.id, pacienteId: pacientes.id,
        inicioAtencionAt: turnos.inicioAtencionAt,
      }).from(turnos).leftJoin(pacientes, eq(turnos.pacienteId, pacientes.id)).leftJoin(medicos, eq(turnos.medicoId, medicos.id)).where(whereConditions).orderBy(turnos.fechaHora).limit(limit).offset(offset);

      const data = lista.map(t => ({
        id: t.id, hora: t.hora, paciente: `${t.pacienteNombre || ''} ${t.pacienteApellido || ''}`.trim() || 'Paciente',
        tipo: t.motivo || t.tipo || 'Consulta', medico: t.medicoNombre || 'Medico', medicoId: t.medicoId, pacienteId: t.pacienteId,
        estado: t.estado, fecha: fechaStr || t.fecha,
        inicioAtencionAt: t.inicioAtencionAt ? (t.inicioAtencionAt instanceof Date ? t.inicioAtencionAt.toISOString() : new Date(t.inicioAtencionAt).toISOString()) : undefined,
      }));

      return { data, total: Number(totalFiltrados), statsTotal, statsPorEstado, fecha: fechaStr };
    }, 10_000); // TTL 10s — turnos cambian frecuentemente
  },

  async create(input: CreateTurno) {
    const fechaHora = new Date(`${input.fecha}T${input.hora}:00.000Z`);
    if (isNaN(fechaHora.getTime())) fail('Fecha u hora inválida', 400);

    // Validar paciente
    const [pac] = await db.select({ id: pacientes.id }).from(pacientes).where(and(eq(pacientes.id, input.pacienteId), sql`${pacientes.deletedAt} IS NULL`)).limit(1);
    if (!pac) notFound('Paciente no encontrado');

    // Validar médico
    const [med] = await db.select({ id: medicos.id, horarios: medicos.horarios, nombre: medicos.nombre }).from(medicos).where(and(eq(medicos.id, input.medicoId), sql`${medicos.deletedAt} IS NULL`)).limit(1);
    if (!med) notFound('Medico no encontrado');

    // Validar que el médico atiende en ese día/horario
    // Si el médico no tiene horarios configurados, se permite el turno
    const horariosMedico = (med.horarios || {}) as Record<string, { activo?: boolean; inicio?: string; fin?: string; tipo?: string; inicio2?: string | null; fin2?: string | null }>;
    const tieneHorariosConfigurados = Object.keys(horariosMedico).length > 0;

    if (tieneHorariosConfigurados) {
      const dias = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
      const diaNombre = dias[fechaHora.getUTCDay()];
      const horaTurno = `${String(fechaHora.getUTCHours()).padStart(2, '0')}:${String(fechaHora.getUTCMinutes()).padStart(2, '0')}`;
      const horarioDia = horariosMedico[diaNombre];

      if (!horarioDia || !horarioDia.activo) {
        conflict(`El medico ${med.nombre} no atiende los ${diaNombre}.`);
      }

      const enRango = (h: string, inicio: string, fin: string) => h >= inicio && h < fin;

      if (horarioDia.tipo === 'partido' && horarioDia.inicio2 && horarioDia.fin2) {
        // Validar contra dos bloques: mañana y tarde
        const enManiana = horarioDia.inicio && horarioDia.fin && enRango(horaTurno, horarioDia.inicio, horarioDia.fin);
        const enTarde = enRango(horaTurno, horarioDia.inicio2, horarioDia.fin2);
        if (!enManiana && !enTarde) {
          conflict(`El medico ${med.nombre} atiende los ${diaNombre} de ${horarioDia.inicio} a ${horarioDia.fin} y de ${horarioDia.inicio2} a ${horarioDia.fin2}. El turno solicitado (${horaTurno}) esta fuera del horario.`);
        }
      } else {
        // Corrido: validar contra un solo bloque
        if (horarioDia.inicio && horarioDia.fin) {
          if (horaTurno < horarioDia.inicio || horaTurno >= horarioDia.fin) {
            conflict(`El medico ${med.nombre} atiende los ${diaNombre} de ${horarioDia.inicio} a ${horarioDia.fin}. El turno solicitado (${horaTurno}) esta fuera del horario.`);
          }
        }
      }
    }

    // Validar bloqueos
    const bloqueo = await db.select({ titulo: bloqueosAgenda.titulo, tipo: bloqueosAgenda.tipo }).from(bloqueosAgenda).where(and(eq(bloqueosAgenda.medicoId, input.medicoId), sql`${bloqueosAgenda.fechaInicio} <= ${fechaHora.toISOString()}::timestamptz`, sql`${bloqueosAgenda.fechaFin} >= ${fechaHora.toISOString()}::timestamptz`)).limit(1);
    if (bloqueo.length > 0) {
      const tipoLabel = bloqueo[0].tipo === 'vacaciones' ? 'de vacaciones' : bloqueo[0].tipo === 'feriado' ? 'feriado' : 'no disponible';
      conflict(`El medico esta ${tipoLabel}: "${bloqueo[0].titulo}". No se pueden agendar turnos en esta fecha.`);
    }

    // Validar conflicto horario
    const conflicto = await db.select({ id: turnos.id }).from(turnos).where(and(eq(turnos.medicoId, input.medicoId), eq(turnos.fechaHora, fechaHora), sql`${turnos.deletedAt} IS NULL`, sql`${turnos.estado} NOT IN ('cancelada', 'no_asistio')`)).limit(1);
    if (conflicto.length > 0) conflict('El medico ya tiene un turno en ese horario');

     const [nuevo] = await db.insert(turnos).values({
       pacienteId: input.pacienteId, medicoId: input.medicoId, fechaHora,
       duracionMinutos: input.duracionMinutos, motivo: input.motivo || null,
       tipoConsulta: input.tipoConsulta, estado: 'pendiente', fuente: 'web',
       sucursalId: (input as any).sucursalId || null,
     }).returning();

     // Disparar sync a Google Calendar (fire-and-forget)
     try {
       const [paciente] = await db
         .select({ nombre: pacientes.nombre, apellido: pacientes.apellido, telefono: pacientes.telefono })
         .from(pacientes)
         .where(and(eq(pacientes.id, input.pacienteId), sql`${pacientes.deletedAt} IS NULL`))
         .limit(1);

       const [medico] = await db
         .select({ nombre: medicos.nombre })
         .from(medicos)
         .where(and(eq(medicos.id, input.medicoId), sql`${medicos.deletedAt} IS NULL`))
         .limit(1);

       const fechaHoraStr = fechaHora.toISOString();
       const pacienteNombre = paciente ? `${paciente.nombre} ${paciente.apellido}`.trim() : 'Paciente';

       const payload = buildGCalPayload({
         action: 'create',
         turnoId: nuevo.id,
         fechaHora: fechaHoraStr,
         duracionMinutos: input.duracionMinutos,
         pacienteNombre,
         pacienteTelefono: paciente?.telefono,
         medicoNombre: medico?.nombre,
         motivo: input.motivo,
       });
       syncTurnoToGCal(payload).catch(() => {});
     } catch {
       // No bloquear la creación si el sync falla
     }

      // Si es turno virtual, generar sala LiveKit (fire-and-forget)
      if (input.tipoConsulta === 'virtual') {
        telemedicinaService.configurarSala(nuevo.id, fechaHora).catch((err) => {
          safeError('[LiveKit] Error configurando sala virtual:', err instanceof Error ? { message: err.message } : err);
        });
      }

      // Invalidar cache de listados
      cache.invalidate('turnos:list:');

      return nuevo;
  },

  async update(id: string, input: UpdateTurno & { skipWaitlist?: boolean }) {
    try {
      const [existe] = await db.select().from(turnos).where(and(eq(turnos.id, id), sql`${turnos.deletedAt} IS NULL`)).limit(1);
      if (!existe) notFound('Turno no encontrado');

      const data: Record<string, any> = { updatedAt: new Date() };
      if (input.estado === 'en_atencion') {
        data.estado = 'en_atencion';
        data.inicioAtencionAt = new Date();
      } else if (input.estado === 'cancelada') {
        data.estado = 'cancelada'; data.canceladoPor = 'dashboard'; data.motivoCancelacion = input.motivoCancelacion || null;
      } else if (input.estado) {
        data.estado = input.estado;
      }
      if (input.fecha && input.hora) data.fechaHora = new Date(`${input.fecha}T${input.hora}:00.000Z`);
      if (input.motivo !== undefined) data.motivo = input.motivo;
      if (input.tipoConsulta !== undefined) data.tipoConsulta = input.tipoConsulta;
      if (input.duracionMinutos) data.duracionMinutos = input.duracionMinutos;

      const [turnoActualizado] = await db.update(turnos).set(data).where(eq(turnos.id, id)).returning();

      if (!turnoActualizado) {
        safeError(`[Turnos] Update returned empty for id=${id}`, { id, estado: input.estado });
        fail('No se pudo actualizar el turno (resultado vacío)', 500);
      }

      // Disparar sync a Google Calendar si hubo cambios relevantes (fire-and-forget)
      try {
        const camposRelevantes = ['fecha', 'hora', 'estado'];
        const hayCambiosRelevantes = camposRelevantes.some(campo => (input as any)[campo] !== undefined);
      
        if (hayCambiosRelevantes) {
          const [paciente] = await db
            .select({ nombre: pacientes.nombre, apellido: pacientes.apellido, telefono: pacientes.telefono })
            .from(pacientes)
            .where(and(eq(pacientes.id, turnoActualizado.pacienteId), sql`${pacientes.deletedAt} IS NULL`))
            .limit(1);

          const [medico] = await db
            .select({ nombre: medicos.nombre })
            .from(medicos)
            .where(and(eq(medicos.id, turnoActualizado.medicoId), sql`${medicos.deletedAt} IS NULL`))
            .limit(1);

          const fechaHoraStr = turnoActualizado.fechaHora instanceof Date
            ? turnoActualizado.fechaHora.toISOString()
            : new Date(turnoActualizado.fechaHora).toISOString();

          const pacienteNombre = paciente ? `${paciente.nombre} ${paciente.apellido}`.trim() : 'Paciente';
          const medicoNombre = medico?.nombre;

          const gcalAction = turnoActualizado.estado === 'cancelada'
            ? 'delete' as const
            : turnoActualizado.googleCalendarEventId
              ? 'update' as const
              : 'create' as const;

          const payload = buildGCalPayload({
            action: gcalAction,
            turnoId: turnoActualizado.id,
            googleCalendarEventId: turnoActualizado.googleCalendarEventId,
            fechaHora: fechaHoraStr,
            duracionMinutos: turnoActualizado.duracionMinutos,
            pacienteNombre,
            pacienteTelefono: paciente?.telefono,
            medicoNombre,
            motivo: turnoActualizado.motivo,
          });
          syncTurnoToGCal(payload).catch(() => {});
        }
      } catch {
        // No bloquear la actualización si el sync falla
      }

      // Si el turno fue cancelado, buscar candidato en lista de espera (fire-and-forget)
      if (input.estado === 'cancelada' && !input.skipWaitlist) {
        waitlistService.buscarCandidato(turnoActualizado.medicoId, turnoActualizado.sucursalId || undefined)
          .then(async (candidato) => {
            if (!candidato) return;
            const oferta = await waitlistService.crearOferta(candidato.id, turnoActualizado.id);
            const { notificarOfertaTurno } = await import('@/lib/whatsapp-waitlist');
            notificarOfertaTurno(oferta.id, turnoActualizado.id, candidato.id).catch(() => {});
          })
          .catch((err) => {
            safeError('[Waitlist] Error al procesar cancelación:', err instanceof Error ? { message: err.message } : err);
          });
      }

      // Invalidar cache de listados
      cache.invalidate('turnos:list:');

      return turnoActualizado;
    } catch (error) {
      safeError(`[Turnos] Error en update id=${id}:`, error instanceof Error ? { message: error.message, stack: error.stack } : error);
      throw error; // Re-lanzar para que apiHandler lo capture
    }
  },

  async delete(id: string) {
    const [existe] = await db
      .select()
      .from(turnos)
      .where(and(eq(turnos.id, id), sql`${turnos.deletedAt} IS NULL`))
      .limit(1);

    if (!existe) notFound('Turno no encontrado');

    // Disparar sync a Google Calendar (fire-and-forget) para eliminar el evento
    try {
      const [paciente] = await db
        .select({ nombre: pacientes.nombre, apellido: pacientes.apellido, telefono: pacientes.telefono })
        .from(pacientes)
        .where(and(eq(pacientes.id, existe.pacienteId), sql`${pacientes.deletedAt} IS NULL`))
        .limit(1);

      const [medico] = await db
        .select({ nombre: medicos.nombre })
        .from(medicos)
        .where(and(eq(medicos.id, existe.medicoId), sql`${medicos.deletedAt} IS NULL`))
        .limit(1);

      const fechaHoraStr = existe.fechaHora instanceof Date
        ? existe.fechaHora.toISOString()
        : new Date(existe.fechaHora).toISOString();

      const pacienteNombre = paciente ? `${paciente.nombre} ${paciente.apellido}`.trim() : 'Paciente';

      const payload = buildGCalPayload({
        action: 'delete',
        turnoId: existe.id,
        googleCalendarEventId: existe.googleCalendarEventId,
        fechaHora: fechaHoraStr,
        pacienteNombre,
        pacienteTelefono: paciente?.telefono,
        medicoNombre: medico?.nombre,
      });
      syncTurnoToGCal(payload).catch(() => {});
    } catch {
      // No bloquear el soft-delete si el sync falla
    }

    // Soft delete
    await db.update(turnos).set({ deletedAt: new Date() }).where(eq(turnos.id, id));

    // Invalidar cache de listados
    cache.invalidate('turnos:list:');

    return { deleted: true };
  },
};
