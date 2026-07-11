/**
 * Servicio de Consentimientos Informados Digitales.
 * CRUD completo para gestionar consentimientos con firma digital, IP y PDF.
 * Ley 20.584 (Chile) — Derechos y deberes de los pacientes.
 */

import { db } from '@/lib/db';
import { consentimientos, pacientes, medicos, consentimientoTipoEnum } from '@/drizzle/schema';
import { eq, and, sql, count, desc, like, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { notFound } from '@/lib/api-handler';
import type { CreateConsentimiento, UpdateConsentimiento } from '@/lib/validations';

export interface ListConsentimientosOptions {
  limit?: number;
  offset?: number;
  tipo?: string;
  pacienteId?: string;
  medicoId?: string;
  search?: string;
  includeDeleted?: boolean;
}

export const consentimientosService = {
  async list(options: ListConsentimientosOptions = {}) {
    const {
      limit = 50,
      offset = 0,
      tipo,
      pacienteId,
      medicoId,
      search,
      includeDeleted = false,
    } = options;

    const condList: (SQL | undefined)[] = [];
    if (!includeDeleted) condList.push(sql`${consentimientos.deletedAt} IS NULL`);
    if (tipo) condList.push(eq(consentimientos.tipo, sql`${tipo}::consentimiento_tipo`));
    if (pacienteId) condList.push(eq(consentimientos.pacienteId, pacienteId));
    if (medicoId) condList.push(eq(consentimientos.medicoId, medicoId));
    if (search)
      condList.push(
        or(
          like(consentimientos.titulo, `%${search}%`),
          like(consentimientos.nombrePaciente, `%${search}%`),
        ),
      );

    const where = condList.length > 0 ? and(...condList) : undefined;

    const [{ total }] = await db.select({ total: count() }).from(consentimientos).where(where);

    const rows = await db
      .select({
        id: consentimientos.id,
        pacienteId: consentimientos.pacienteId,
        tipo: consentimientos.tipo,
        titulo: consentimientos.titulo,
        fechaFirma: consentimientos.fechaFirma,
        nombrePaciente: consentimientos.nombrePaciente,
        rutPaciente: consentimientos.rutPaciente,
        documentoPdf: consentimientos.documentoPdf,
        medicoId: consentimientos.medicoId,
        createdAt: consentimientos.createdAt,
        updatedAt: consentimientos.updatedAt,
        pacienteNombre: pacientes.nombre,
        pacienteApellido: pacientes.apellido,
        medicoNombre: medicos.nombre,
      })
      .from(consentimientos)
      .leftJoin(pacientes, eq(consentimientos.pacienteId, pacientes.id))
      .leftJoin(medicos, eq(consentimientos.medicoId, medicos.id))
      .where(where)
      .orderBy(desc(consentimientos.createdAt))
      .limit(limit)
      .offset(offset);

    const data = rows.map((r) => ({
      id: r.id,
      pacienteId: r.pacienteId,
      tipo: r.tipo,
      titulo: r.titulo,
      fechaFirma: r.fechaFirma?.toISOString?.() || r.fechaFirma,
      nombrePaciente: r.nombrePaciente,
      rutPaciente: r.rutPaciente,
      documentoPdf: r.documentoPdf,
      medicoId: r.medicoId,
      createdAt: r.createdAt?.toISOString?.() || r.createdAt,
      updatedAt: r.updatedAt?.toISOString?.() || r.updatedAt,
      pacienteNombre:
        r.pacienteNombre && r.pacienteApellido ? `${r.pacienteNombre} ${r.pacienteApellido}` : '—',
      medicoNombre: r.medicoNombre || '—',
    }));

    return { data, total: Number(total), limit, offset };
  },

  async getById(id: string) {
    const [row] = await db
      .select({
        consentimiento: consentimientos,
        pacienteNombre: pacientes.nombre,
        pacienteApellido: pacientes.apellido,
      })
      .from(consentimientos)
      .leftJoin(pacientes, eq(consentimientos.pacienteId, pacientes.id))
      .where(and(eq(consentimientos.id, id), sql`${consentimientos.deletedAt} IS NULL`))
      .limit(1);

    if (!row) notFound('Consentimiento no encontrado');

    let medicoNombre = null;
    if (row.consentimiento.medicoId) {
      const [medico] = await db
        .select({ nombre: medicos.nombre })
        .from(medicos)
        .where(eq(medicos.id, row.consentimiento.medicoId))
        .limit(1);
      if (medico) medicoNombre = medico.nombre;
    }

    return {
      ...row.consentimiento,
      pacienteNombre:
        row.pacienteNombre && row.pacienteApellido
          ? `${row.pacienteNombre} ${row.pacienteApellido}`
          : '—',
      medicoNombre,
    };
  },

  async create(input: CreateConsentimiento) {
    const [nuevo] = await db
      .insert(consentimientos)
      .values({
        pacienteId: input.pacienteId,
        tipo: (input.tipo || consentimientoTipoEnum.enumValues[0]) as 'tratamiento' | 'cirugia' | 'anestesia' | 'datos' | 'fotografia' | 'investigacion' | 'otro',
        titulo: input.titulo,
        descripcion: input.descripcion || null,
        fechaFirma: input.fechaFirma ? new Date(input.fechaFirma) : null,
        ipFirma: input.ipFirma || null,
        nombrePaciente: input.nombrePaciente,
        rutPaciente: input.rutPaciente || null,
        documentoPdf: input.documentoPdf || null,
        metadata: input.metadata ?? null,
        medicoId: input.medicoId || null,
        sucursalId: input.sucursalId ?? null,
      })
      .returning();

    return nuevo;
  },

  async update(id: string, input: UpdateConsentimiento) {
    const existing = await this.getById(id);
    if (!existing) notFound('Consentimiento no encontrado');

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (input.tipo !== undefined) updateData.tipo = input.tipo;
    if (input.titulo !== undefined) updateData.titulo = input.titulo;
    if (input.descripcion !== undefined) updateData.descripcion = input.descripcion;
    if (input.fechaFirma !== undefined)
      updateData.fechaFirma = input.fechaFirma ? new Date(input.fechaFirma) : null;
    if (input.ipFirma !== undefined) updateData.ipFirma = input.ipFirma;
    if (input.nombrePaciente !== undefined) updateData.nombrePaciente = input.nombrePaciente;
    if (input.rutPaciente !== undefined) updateData.rutPaciente = input.rutPaciente;
    if (input.documentoPdf !== undefined) updateData.documentoPdf = input.documentoPdf;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    await db.update(consentimientos).set(updateData).where(eq(consentimientos.id, id));
    return this.getById(id);
  },

  async eliminar(id: string) {
    await this.getById(id);
    await db
      .update(consentimientos)
      .set({ deletedAt: new Date() })
      .where(eq(consentimientos.id, id));
    return { success: true };
  },

  async getStats() {
    const baseCond = sql`${consentimientos.deletedAt} IS NULL`;

    const [total] = await db.select({ total: count() }).from(consentimientos).where(baseCond);

    const porTipo = await db
      .select({
        tipo: consentimientos.tipo,
        total: count(),
      })
      .from(consentimientos)
      .where(baseCond)
      .groupBy(consentimientos.tipo);

    return {
      total: Number(total?.total || 0),
      porTipo: porTipo.reduce(
        (acc, t) => ({ ...acc, [t.tipo]: Number(t.total) }),
        {} as Record<string, number>,
      ),
    };
  },
};
