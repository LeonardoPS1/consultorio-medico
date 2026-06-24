/**
 * Servicio de Órdenes de Estudio (Laboratorio, Imagen, etc.)
 */

import { db } from '@/lib/db';
import { ordenesEstudio, medicos, pacientes } from '@/drizzle/schema';
import { eq, and, sql, count, desc, like, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { notFound } from '@/lib/api-handler';

export interface ListOrdenesEstudioOptions {
  limit?: number;
  offset?: number;
  pacienteId?: string;
  medicoId?: string;
  estado?: string;
  tipo?: string;
  includeDeleted?: boolean;
}

export const ordenesEstudioService = {
  async list(options: ListOrdenesEstudioOptions = {}) {
    const {
      limit = 50,
      offset = 0,
      pacienteId,
      medicoId,
      estado,
      tipo,
      includeDeleted = false,
    } = options;

    const condList: (SQL | undefined)[] = [];
    if (!includeDeleted) condList.push(sql`${ordenesEstudio.deletedAt} IS NULL`);
    if (pacienteId) condList.push(eq(ordenesEstudio.pacienteId, pacienteId));
    if (medicoId) condList.push(eq(ordenesEstudio.medicoId, medicoId));
    if (estado) condList.push(eq(ordenesEstudio.estado, estado));
    if (tipo) condList.push(eq(ordenesEstudio.tipo, tipo));

    const where = condList.length > 0 ? and(...condList) : undefined;

    const [{ total }] = await db.select({ total: count() }).from(ordenesEstudio).where(where);

    const rows = await db
      .select({
        id: ordenesEstudio.id,
        pacienteId: ordenesEstudio.pacienteId,
        medicoId: ordenesEstudio.medicoId,
        turnoId: ordenesEstudio.turnoId,
        titulo: ordenesEstudio.titulo,
        descripcion: ordenesEstudio.descripcion,
        tipo: ordenesEstudio.tipo,
        estado: ordenesEstudio.estado,
        resultadoUrl: ordenesEstudio.resultadoUrl,
        observaciones: ordenesEstudio.observaciones,
        createdAt: ordenesEstudio.createdAt,
        updatedAt: ordenesEstudio.updatedAt,
        medicoNombre: medicos.nombre,
      })
      .from(ordenesEstudio)
      .leftJoin(medicos, eq(ordenesEstudio.medicoId, medicos.id))
      .where(where)
      .orderBy(desc(ordenesEstudio.createdAt))
      .limit(limit)
      .offset(offset);

    const data = rows.map((r) => ({
      id: r.id,
      pacienteId: r.pacienteId,
      medicoId: r.medicoId,
      turnoId: r.turnoId,
      titulo: r.titulo,
      descripcion: r.descripcion,
      tipo: r.tipo,
      estado: r.estado,
      resultadoUrl: r.resultadoUrl,
      observaciones: r.observaciones,
      createdAt: r.createdAt?.toISOString?.() || r.createdAt,
      updatedAt: r.updatedAt?.toISOString?.() || r.updatedAt,
      medicoNombre: r.medicoNombre || '—',
    }));

    return { data, total: Number(total), limit, offset };
  },

  async getById(id: string) {
    const [row] = await db
      .select({
        orden: ordenesEstudio,
        pacienteNombre: pacientes.nombre,
        pacienteApellido: pacientes.apellido,
        medicoNombre: medicos.nombre,
      })
      .from(ordenesEstudio)
      .leftJoin(pacientes, eq(ordenesEstudio.pacienteId, pacientes.id))
      .leftJoin(medicos, eq(ordenesEstudio.medicoId, medicos.id))
      .where(and(eq(ordenesEstudio.id, id), sql`${ordenesEstudio.deletedAt} IS NULL`))
      .limit(1);

    if (!row) notFound('Orden de estudio no encontrada');

    return {
      ...row.orden,
      pacienteNombre:
        row.pacienteNombre && row.pacienteApellido
          ? `${row.pacienteNombre} ${row.pacienteApellido}`
          : '—',
      medicoNombre: row.medicoNombre || '—',
    };
  },

  async getByPacienteId(pacienteId: string) {
    return this.list({ pacienteId });
  },
};
