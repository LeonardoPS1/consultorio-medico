/**
 * Servicio de Lista Negra de Pacientes.
 * CRUD completo para gestionar bloqueos por inasistencia.
 */

import { db } from '@/lib/db';
import { blacklist, pacientes, medicos } from '@/drizzle/schema';
import { eq, and, sql, count, desc, like, or } from 'drizzle-orm';
import { notFound } from '@/lib/api-handler';
import type { CreateBlacklistEntry, UpdateBlacklistEntry } from '@/lib/validations';

export interface ListBlacklistOptions {
  limit?: number;
  offset?: number;
  activo?: boolean;
  pacienteId?: string;
  search?: string;
  includeDeleted?: boolean;
}

export const blacklistService = {
  async list(options: ListBlacklistOptions = {}) {
    const { limit = 50, offset = 0, activo, pacienteId, search, includeDeleted = false } = options;

    const condList: any[] = [];
    if (!includeDeleted) condList.push(sql`${blacklist.deletedAt} IS NULL`);
    if (activo !== undefined) condList.push(eq(blacklist.activo, activo));
    if (pacienteId) condList.push(eq(blacklist.pacienteId, pacienteId));
    if (search) condList.push(or(
      like(blacklist.motivo, `%${search}%`),
    ));

    const where = condList.length > 0 ? and(...condList) : undefined;

    const [{ total }] = await db.select({ total: count() }).from(blacklist).where(where);

    const rows = await db.select({
      id: blacklist.id,
      pacienteId: blacklist.pacienteId,
      motivo: blacklist.motivo,
      activo: blacklist.activo,
      bloqueadoHasta: blacklist.bloqueadoHasta,
      creadoPor: blacklist.creadoPor,
      createdAt: blacklist.createdAt,
      updatedAt: blacklist.updatedAt,
      pacienteNombre: pacientes.nombre,
      pacienteApellido: pacientes.apellido,
      pacienteTelefono: pacientes.telefono,
      creadoPorNombre: medicos.nombre,
    })
      .from(blacklist)
      .leftJoin(pacientes, eq(blacklist.pacienteId, pacientes.id))
      .leftJoin(medicos, eq(blacklist.creadoPor, medicos.id))
      .where(where)
      .orderBy(desc(blacklist.createdAt))
      .limit(limit)
      .offset(offset);

    const data = rows.map(r => ({
      id: r.id,
      pacienteId: r.pacienteId,
      motivo: r.motivo,
      activo: r.activo,
      bloqueadoHasta: r.bloqueadoHasta?.toISOString?.() || r.bloqueadoHasta,
      creadoPor: r.creadoPor,
      createdAt: r.createdAt?.toISOString?.() || r.createdAt,
      updatedAt: r.updatedAt?.toISOString?.() || r.updatedAt,
      pacienteNombre: r.pacienteNombre && r.pacienteApellido ? `${r.pacienteNombre} ${r.pacienteApellido}` : '—',
      pacienteTelefono: r.pacienteTelefono,
      creadoPorNombre: r.creadoPorNombre || '—',
    }));

    return { data, total: Number(total), limit, offset };
  },

  async getById(id: string) {
    const [row] = await db.select({
      entry: blacklist,
      pacienteNombre: pacientes.nombre,
      pacienteApellido: pacientes.apellido,
      pacienteTelefono: pacientes.telefono,
    })
      .from(blacklist)
      .leftJoin(pacientes, eq(blacklist.pacienteId, pacientes.id))
      .where(and(eq(blacklist.id, id), sql`${blacklist.deletedAt} IS NULL`))
      .limit(1);

    if (!row) notFound('Entrada de lista negra no encontrada');

    // Get createdBy name
    let creadoPorNombre = '—';
    if (row.entry.creadoPor) {
      const [medico] = await db.select({ nombre: medicos.nombre })
        .from(medicos).where(eq(medicos.id, row.entry.creadoPor)).limit(1);
      if (medico) creadoPorNombre = medico.nombre;
    }

    return {
      ...row.entry,
      pacienteNombre: row.pacienteNombre && row.pacienteApellido ? `${row.pacienteNombre} ${row.pacienteApellido}` : '—',
      pacienteTelefono: row.pacienteTelefono,
      creadoPorNombre,
    };
  },

  async create(input: CreateBlacklistEntry) {
    const [nueva] = await db.insert(blacklist).values({
      pacienteId: input.pacienteId,
      motivo: input.motivo,
      activo: input.activo !== undefined ? input.activo : true,
      bloqueadoHasta: input.bloqueadoHasta ? new Date(input.bloqueadoHasta) : null,
      creadoPor: input.creadoPor || null,
      sucursalId: (input.sucursalId as any) || null,
    }).returning();

    return nueva;
  },

  async update(id: string, input: UpdateBlacklistEntry) {
    const existing = await this.getById(id);
    if (!existing) notFound('Entrada de lista negra no encontrada');

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (input.motivo !== undefined) updateData.motivo = input.motivo;
    if (input.activo !== undefined) updateData.activo = input.activo;
    if (input.bloqueadoHasta !== undefined) {
      updateData.bloqueadoHasta = input.bloqueadoHasta ? new Date(input.bloqueadoHasta) : null;
    }

    await db.update(blacklist).set(updateData).where(eq(blacklist.id, id));
    return this.getById(id);
  },

  async eliminar(id: string) {
    await this.getById(id);
    await db.update(blacklist).set({ deletedAt: new Date() }).where(eq(blacklist.id, id));
    return { success: true };
  },

  async getStats() {
    const baseCond = sql`${blacklist.deletedAt} IS NULL`;

    const [total] = await db.select({ total: count() }).from(blacklist).where(baseCond);

    const activos = await db.select({
      esActivo: blacklist.activo,
      total: count(),
    }).from(blacklist).where(baseCond).groupBy(blacklist.activo);

    return {
      total: Number(total?.total || 0),
      activos: activos.reduce((acc, a) => ({ ...acc, [a.esActivo ? 'activos' : 'inactivos']: Number(a.total) }), {} as Record<string, number>),
    };
  },

  async isPacienteBloqueado(pacienteId: string): Promise<boolean> {
    const [row] = await db.select({ id: blacklist.id })
      .from(blacklist)
      .where(and(
        eq(blacklist.pacienteId, pacienteId),
        eq(blacklist.activo, true),
        sql`${blacklist.deletedAt} IS NULL`,
        or(
          sql`${blacklist.bloqueadoHasta} IS NULL`,
          sql`${blacklist.bloqueadoHasta} > NOW()`,
        ),
      ))
      .limit(1);

    return !!row;
  },
};
