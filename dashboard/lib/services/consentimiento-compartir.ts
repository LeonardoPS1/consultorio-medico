import { db } from '@/lib/db';
import { consentimientoCompartir } from '@/drizzle/schema';
import { eq, and, sql, lte } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { notFound } from '@/lib/api-handler';

export interface ListConsentimientoOptions {
  pacienteId?: string;
  medicoOrigenId?: string;
  estado?: string;
  tenantId?: string;
  limit?: number;
  offset?: number;
}

export const consentimientoCompartirService = {
  async list(options: ListConsentimientoOptions = {}) {
    const {
      pacienteId,
      medicoOrigenId,
      estado,
      tenantId,
      limit = 50,
      offset = 0,
    } = options;

    const condList: (SQL | undefined)[] = [
      sql`${consentimientoCompartir.deletedAt} IS NULL`,
    ];
    if (pacienteId) condList.push(eq(consentimientoCompartir.pacienteId, pacienteId));
    if (medicoOrigenId) condList.push(eq(consentimientoCompartir.medicoOrigenId, medicoOrigenId));
    if (estado) condList.push(eq(consentimientoCompartir.estado, estado));
    if (tenantId) condList.push(eq(consentimientoCompartir.tenantId, tenantId));

    const where = and(...condList);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(consentimientoCompartir)
      .where(where);

    const rows = await db
      .select()
      .from(consentimientoCompartir)
      .where(where)
      .orderBy(sql`${consentimientoCompartir.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    return { data: rows, total: Number(total), limit, offset };
  },

  async getById(id: string) {
    const [row] = await db
      .select()
      .from(consentimientoCompartir)
      .where(and(eq(consentimientoCompartir.id, id), sql`${consentimientoCompartir.deletedAt} IS NULL`))
      .limit(1);

    if (!row) notFound('Consentimiento no encontrado');
    return row;
  },

  async create(input: {
    pacienteId: string;
    medicoOrigenId: string;
    medicoDestinoId: string;
    tenantDestinoId: string;
    alcance?: string;
    datosAutorizados?: Record<string, unknown>;
    fechaExpiracion?: Date;
    metadata?: Record<string, unknown>;
    tenantId?: string;
  }) {
    const [nuevo] = await db
      .insert(consentimientoCompartir)
      .values({
        pacienteId: input.pacienteId,
        medicoOrigenId: input.medicoOrigenId,
        medicoDestinoId: input.medicoDestinoId,
        tenantDestinoId: input.tenantDestinoId,
        alcance: input.alcance ?? 'historial_completo',
        datosAutorizados: input.datosAutorizados ?? {},
        fechaExpiracion: input.fechaExpiracion ?? null,
        metadata: input.metadata ?? {},
        tenantId: input.tenantId ?? '00000000-0000-0000-0000-000000000000',
        estado: 'pendiente',
      })
      .returning();

    return nuevo;
  },

  async firmar(id: string, ipFirma: string) {
    const existing = await this.getById(id);
    if (existing.estado !== 'pendiente') {
      throw new Error(`No se puede firmar un consentimiento en estado "${existing.estado}"`);
    }

    const [updated] = await db
      .update(consentimientoCompartir)
      .set({
        estado: 'firmado',
        firmaPacienteAt: new Date(),
        ipFirma,
        updatedAt: new Date(),
      })
      .where(eq(consentimientoCompartir.id, id))
      .returning();

    return updated;
  },

  async revocar(id: string) {
    const existing = await this.getById(id);
    if (existing.estado === 'revocado') {
      throw new Error('El consentimiento ya está revocado');
    }

    const [updated] = await db
      .update(consentimientoCompartir)
      .set({
        estado: 'revocado',
        updatedAt: new Date(),
      })
      .where(eq(consentimientoCompartir.id, id))
      .returning();

    return updated;
  },

  async verificarExpirados() {
    const result = await db
      .update(consentimientoCompartir)
      .set({
        estado: 'expirado',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(consentimientoCompartir.estado, 'firmado'),
          sql`${consentimientoCompartir.fechaExpiracion} IS NOT NULL`,
          lte(consentimientoCompartir.fechaExpiracion, new Date()),
        ),
      )
      .returning();

    return { actualizados: result.length };
  },

  async verificarAcceso(
    pacienteId: string,
    medicoDestinoId: string,
    tenantDestinoId: string,
  ): Promise<boolean> {
    const [row] = await db
      .select({ id: consentimientoCompartir.id })
      .from(consentimientoCompartir)
      .where(
        and(
          eq(consentimientoCompartir.pacienteId, pacienteId),
          eq(consentimientoCompartir.medicoDestinoId, medicoDestinoId),
          eq(consentimientoCompartir.tenantDestinoId, tenantDestinoId),
          eq(consentimientoCompartir.estado, 'firmado'),
          sql`${consentimientoCompartir.deletedAt} IS NULL`,
          sql`(
            ${consentimientoCompartir.fechaExpiracion} IS NULL
            OR ${consentimientoCompartir.fechaExpiracion} > NOW()
          )`,
        ),
      )
      .limit(1);

    return !!row;
  },

  async softDelete(id: string) {
    await this.getById(id);
    await db
      .update(consentimientoCompartir)
      .set({ deletedAt: new Date() })
      .where(eq(consentimientoCompartir.id, id));
    return { success: true };
  },
};
