/**
 * Servicio de Derivaciones (interconsultas entre médicos).
 * CRUD completo con integración al sistema de notificaciones.
 */

import { db } from '@/lib/db';
import { derivaciones, pacientes, medicos, consentimientoCompartir } from '@/drizzle/schema';
import { eq, and, sql, count, desc, like, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { notFound } from '@/lib/api-handler';
import type { UpdateDerivacion } from '@/lib/validations';

export interface ListDerivacionesOptions {
  limit?: number;
  offset?: number;
  estado?: string;
  pacienteId?: string;
  medicoId?: string; // busca como origen o destino
  search?: string;
  includeDeleted?: boolean;
}

export const derivacionesService = {
  async list(options: ListDerivacionesOptions = {}) {
    const {
      limit = 50,
      offset = 0,
      estado,
      pacienteId,
      medicoId,
      search,
      includeDeleted = false,
    } = options;

    const condList: (SQL | undefined)[] = [];
    if (!includeDeleted) condList.push(sql`${derivaciones.deletedAt} IS NULL`);
    if (estado) condList.push(eq(derivaciones.estado, estado));
    if (pacienteId) condList.push(eq(derivaciones.pacienteId, pacienteId));
    if (medicoId)
      condList.push(
        or(eq(derivaciones.medicoOrigenId, medicoId), eq(derivaciones.medicoDestinoId, medicoId)),
      );
    if (search)
      condList.push(
        or(
          like(derivaciones.motivo, `%${search}%`),
          like(derivaciones.diagnostico, `%${search}%`),
          like(derivaciones.especialidad, `%${search}%`),
        ),
      );

    const where = condList.length > 0 ? and(...condList) : undefined;

    const [{ total }] = await db.select({ total: count() }).from(derivaciones).where(where);

    const rows = await db
      .select({
        id: derivaciones.id,
        pacienteId: derivaciones.pacienteId,
        medicoOrigenId: derivaciones.medicoOrigenId,
        medicoDestinoId: derivaciones.medicoDestinoId,
        especialidad: derivaciones.especialidad,
        motivo: derivaciones.motivo,
        diagnostico: derivaciones.diagnostico,
        cie10Codigo: derivaciones.cie10Codigo,
        gravedad: derivaciones.gravedad,
        estado: derivaciones.estado,
        notasOrigen: derivaciones.notasOrigen,
        notasDestino: derivaciones.notasDestino,
        fechaRespuesta: derivaciones.fechaRespuesta,
        consentimientoId: derivaciones.consentimientoId,
        tenantDestinoId: derivaciones.tenantDestinoId,
        createdAt: derivaciones.createdAt,
        updatedAt: derivaciones.updatedAt,
        pacienteNombre: pacientes.nombre,
        pacienteApellido: pacientes.apellido,
        pacienteTelefono: pacientes.telefono,
        medicoOrigenNombre: medicos.nombre,
        medicoDestinoNombre: medicos.nombre,
      })
      .from(derivaciones)
      .leftJoin(pacientes, eq(derivaciones.pacienteId, pacientes.id))
      .leftJoin(medicos, eq(derivaciones.medicoOrigenId, medicos.id))
      .where(where)
      .orderBy(desc(derivaciones.createdAt))
      .limit(limit)
      .offset(offset);

    // Need a second join for medicoDestino since we can't alias in select with Drizzle easily
    // We'll fetch nombres separately
    const destinoIds = rows.map((r) => r.medicoDestinoId).filter(Boolean) as string[];
    let medicosDestino: Map<string, string> = new Map();
    if (destinoIds.length > 0) {
      const destinoRows = await db
        .select({
          id: medicos.id,
          nombre: medicos.nombre,
        })
        .from(medicos)
        .where(and(sql`${medicos.id} = ANY(${destinoIds})`, sql`${medicos.deletedAt} IS NULL`));
      medicosDestino = new Map(destinoRows.map((r) => [r.id, r.nombre]));
    }

    // Get medicoOrigen names in a similar way
    const origenIds = Array.from(new Set(rows.map((r) => r.medicoOrigenId)));
    let medicosOrigen: Map<string, string> = new Map();
    if (origenIds.length > 0) {
      const origenRows = await db
        .select({
          id: medicos.id,
          nombre: medicos.nombre,
        })
        .from(medicos)
        .where(and(sql`${medicos.id} = ANY(${origenIds})`, sql`${medicos.deletedAt} IS NULL`));
      medicosOrigen = new Map(origenRows.map((r) => [r.id, r.nombre]));
    }

    const data = rows.map((r) => ({
      id: r.id,
      pacienteId: r.pacienteId,
      medicoOrigenId: r.medicoOrigenId,
      medicoDestinoId: r.medicoDestinoId,
      especialidad: r.especialidad,
      motivo: r.motivo,
      diagnostico: r.diagnostico,
      cie10Codigo: r.cie10Codigo,
      gravedad: r.gravedad,
      estado: r.estado,
      notasOrigen: r.notasOrigen,
      notasDestino: r.notasDestino,
      fechaRespuesta: r.fechaRespuesta?.toISOString?.() || r.fechaRespuesta,
      consentimientoId: r.consentimientoId,
      tenantDestinoId: r.tenantDestinoId,
      createdAt: r.createdAt?.toISOString?.() || r.createdAt,
      updatedAt: r.updatedAt?.toISOString?.() || r.updatedAt,
      pacienteNombre:
        r.pacienteNombre && r.pacienteApellido ? `${r.pacienteNombre} ${r.pacienteApellido}` : '—',
      pacienteTelefono: r.pacienteTelefono,
      medicoOrigenNombre: medicosOrigen.get(r.medicoOrigenId) || '—',
      medicoDestinoNombre: r.medicoDestinoId ? medicosDestino.get(r.medicoDestinoId) || '—' : null,
    }));

    return { data, total: Number(total), limit, offset };
  },

  async getById(id: string) {
    const [row] = await db
      .select({
        derivacion: derivaciones,
        pacienteNombre: pacientes.nombre,
        pacienteApellido: pacientes.apellido,
        pacienteTelefono: pacientes.telefono,
      })
      .from(derivaciones)
      .leftJoin(pacientes, eq(derivaciones.pacienteId, pacientes.id))
      .where(and(eq(derivaciones.id, id), sql`${derivaciones.deletedAt} IS NULL`))
      .limit(1);

    if (!row) notFound('Derivación no encontrada');

    // Get medico names
    const medicosIds = [row.derivacion.medicoOrigenId];
    if (row.derivacion.medicoDestinoId) medicosIds.push(row.derivacion.medicoDestinoId);

    const medicosRows = await db
      .select({
        id: medicos.id,
        nombre: medicos.nombre,
        especialidad: medicos.especialidad,
      })
      .from(medicos)
      .where(and(sql`${medicos.id} = ANY(${medicosIds})`, sql`${medicos.deletedAt} IS NULL`));

    const medicosMap = new Map(
      medicosRows.map((m) => [m.id, { nombre: m.nombre, especialidad: m.especialidad }]),
    );

    return {
      ...row.derivacion,
      pacienteNombre:
        row.pacienteNombre && row.pacienteApellido
          ? `${row.pacienteNombre} ${row.pacienteApellido}`
          : '—',
      pacienteTelefono: row.pacienteTelefono,
      medicoOrigenNombre: medicosMap.get(row.derivacion.medicoOrigenId)?.nombre || '—',
      medicoOrigenEspecialidad: medicosMap.get(row.derivacion.medicoOrigenId)?.especialidad || '—',
      medicoDestinoNombre: row.derivacion.medicoDestinoId
        ? medicosMap.get(row.derivacion.medicoDestinoId)?.nombre || '—'
        : null,
      medicoDestinoEspecialidad: row.derivacion.medicoDestinoId
        ? medicosMap.get(row.derivacion.medicoDestinoId)?.especialidad || null
        : null,
    };
  },

  async create(input: {
    pacienteId: string;
    medicoOrigenId: string;
    medicoDestinoId?: string | null;
    especialidad: string;
    motivo: string;
    diagnostico?: string | null;
    cie10Codigo?: string | null;
    gravedad?: string;
    notasOrigen?: string | null;
    sucursalId?: string | null;
    consentimientoId?: string | null;
    tenantDestinoId?: string | null;
    tenantId?: string;
  }) {
    const [nueva] = await db
      .insert(derivaciones)
      .values({
        pacienteId: input.pacienteId,
        medicoOrigenId: input.medicoOrigenId,
        medicoDestinoId: input.medicoDestinoId || null,
        especialidad: input.especialidad,
        motivo: input.motivo,
        diagnostico: input.diagnostico || null,
        cie10Codigo: input.cie10Codigo || null,
        gravedad: input.gravedad ?? 'normal',
        notasOrigen: input.notasOrigen || null,
        sucursalId: input.sucursalId ?? null,
        consentimientoId: input.consentimientoId ?? null,
        tenantDestinoId: input.tenantDestinoId ?? null,
        tenantId: input.tenantId ?? '00000000-0000-0000-0000-000000000000',
      })
      .returning();

    // Notificar al médico destino via sistema de notificaciones (si hay destino)
    if (input.medicoDestinoId) {
      try {
        const { notificacionesService } = await import('@/lib/services/notificaciones');
        // Buscar el usuario asociado al médico destino
        const [medicoDestino] = await db
          .select({ usuarioId: medicos.usuarioId })
          .from(medicos)
          .where(eq(medicos.id, input.medicoDestinoId))
          .limit(1);
        if (medicoDestino?.usuarioId) {
          await notificacionesService.create({
            usuarioId: medicoDestino.usuarioId,
            titulo: 'Nueva derivación recibida',
            descripcion: `Derivación a ${input.especialidad}: ${input.motivo.substring(0, 100)}`,
            tipo: 'sistema',
            href: `/dashboard/derivaciones?id=${nueva.id}`,
          });
        }
      } catch {
        /* No bloquear si notificación falla */
      }
    }

    return nueva;
  },

  async update(id: string, input: UpdateDerivacion) {
    const existing = await this.getById(id);
    if (!existing) notFound('Derivación no encontrada');

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (input.medicoDestinoId !== undefined) updateData.medicoDestinoId = input.medicoDestinoId;
    if (input.estado !== undefined) {
      updateData.estado = input.estado;
      if (
        input.estado === 'aceptada' ||
        input.estado === 'rechazada' ||
        input.estado === 'completada'
      ) {
        updateData.fechaRespuesta = new Date();
      }
    }
    if (input.notasDestino !== undefined) updateData.notasDestino = input.notasDestino;
    if (input.gravedad !== undefined) updateData.gravedad = input.gravedad;
    if (input.especialidad !== undefined) updateData.especialidad = input.especialidad;
    if (input.motivo !== undefined) updateData.motivo = input.motivo;
    if (input.diagnostico !== undefined) updateData.diagnostico = input.diagnostico;
    if (input.cie10Codigo !== undefined) updateData.cie10Codigo = input.cie10Codigo;
    if (input.consentimientoId !== undefined) updateData.consentimientoId = input.consentimientoId;

    await db.update(derivaciones).set(updateData).where(eq(derivaciones.id, id));

    // Notificar al médico origen cuando cambia estado
    if (input.estado) {
      try {
        const { notificacionesService } = await import('@/lib/services/notificaciones');
        const [medicoOrigen] = await db
          .select({ usuarioId: medicos.usuarioId })
          .from(medicos)
          .where(eq(medicos.id, existing.medicoOrigenId))
          .limit(1);
        if (medicoOrigen?.usuarioId) {
          const estadoLabels: Record<string, string> = {
            aceptada: 'aceptada',
            rechazada: 'rechazada',
            completada: 'completada',
          };
          await notificacionesService.create({
            usuarioId: medicoOrigen.usuarioId,
            titulo: `Derivación ${estadoLabels[input.estado] || input.estado}`,
            descripcion: `La derivación a ${input.especialidad || existing.especialidad} fue ${estadoLabels[input.estado] || input.estado}`,
            tipo: 'sistema',
            href: `/dashboard/derivaciones?id=${id}`,
          });
        }
      } catch {
        /* No bloquear */
      }
    }

    return this.getById(id);
  },

  async eliminar(id: string) {
    await this.getById(id);
    await db.update(derivaciones).set({ deletedAt: new Date() }).where(eq(derivaciones.id, id));
    return { success: true };
  },

  async getStats(medicoId?: string) {
    const cond = medicoId
      ? and(
          sql`${derivaciones.deletedAt} IS NULL`,
          or(eq(derivaciones.medicoOrigenId, medicoId), eq(derivaciones.medicoDestinoId, medicoId)),
        )
      : sql`${derivaciones.deletedAt} IS NULL`;

    const [total] = await db.select({ total: count() }).from(derivaciones).where(cond);

    const estados = await db
      .select({
        estado: derivaciones.estado,
        total: count(),
      })
      .from(derivaciones)
      .where(cond)
      .groupBy(derivaciones.estado);

    const gravedades = await db
      .select({
        gravedad: derivaciones.gravedad,
        total: count(),
      })
      .from(derivaciones)
      .where(cond)
      .groupBy(derivaciones.gravedad);

    return {
      total: Number(total?.total || 0),
      porEstado: estados.reduce(
        (acc, e) => ({ ...acc, [e.estado]: Number(e.total) }),
        {} as Record<string, number>,
      ),
      porGravedad: gravedades.reduce(
        (acc, g) => ({ ...acc, [g.gravedad]: Number(g.total) }),
        {} as Record<string, number>,
      ),
    };
  },

  async getMedicos() {
    return db
      .select({
        id: medicos.id,
        nombre: medicos.nombre,
        especialidad: medicos.especialidad,
      })
      .from(medicos)
      .where(and(sql`${medicos.deletedAt} IS NULL`, eq(medicos.activo, true)))
      .orderBy(medicos.nombre);
  },

  async getCrossTenant(tenantId: string) {
    const rows = await db
      .select()
      .from(derivaciones)
      .where(
        and(
          eq(derivaciones.tenantDestinoId, tenantId),
          sql`${derivaciones.deletedAt} IS NULL`,
        ),
      )
      .orderBy(desc(derivaciones.createdAt));

    return { data: rows, total: rows.length };
  },

  async getByConsentimientoId(consentimientoId: string) {
    const rows = await db
      .select()
      .from(derivaciones)
      .where(
        and(
          eq(derivaciones.consentimientoId, consentimientoId),
          sql`${derivaciones.deletedAt} IS NULL`,
        ),
      )
      .limit(1);

    return rows[0] || null;
  },
};
