import { db } from '@/lib/db';
import { conveniosIntercambio } from '@/drizzle/schema';
import { eq, and, sql, or, lte } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { notFound } from '@/lib/api-handler';

export interface ListConveniosOptions {
  limit?: number;
  offset?: number;
  estado?: string;
}

export const conveniosService = {
  async list(tenantId: string, options: ListConveniosOptions = {}) {
    const { limit = 50, offset = 0, estado } = options;

    const condList: (SQL | undefined)[] = [
      or(
        eq(conveniosIntercambio.tenantOrigenId, tenantId),
        eq(conveniosIntercambio.tenantDestinoId, tenantId),
      ),
    ];
    if (estado) condList.push(eq(conveniosIntercambio.estado, estado));

    const where = and(...condList);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(conveniosIntercambio)
      .where(where);

    const rows = await db
      .select()
      .from(conveniosIntercambio)
      .where(where)
      .orderBy(sql`${conveniosIntercambio.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    return { data: rows, total: Number(total), limit, offset };
  },

  async getById(id: string) {
    const [row] = await db
      .select()
      .from(conveniosIntercambio)
      .where(eq(conveniosIntercambio.id, id))
      .limit(1);

    if (!row) notFound('Convenio no encontrado');
    return row;
  },

  async create(input: {
    tenantOrigenId: string;
    tenantDestinoId: string;
    fechaInicio?: Date;
    fechaFin?: Date;
    metadata?: Record<string, unknown>;
  }) {
    const [nuevo] = await db
      .insert(conveniosIntercambio)
      .values({
        tenantOrigenId: input.tenantOrigenId,
        tenantDestinoId: input.tenantDestinoId,
        fechaInicio: input.fechaInicio ?? new Date(),
        fechaFin: input.fechaFin ?? null,
        metadata: input.metadata ?? {},
        estado: 'activo',
      })
      .returning();

    return nuevo;
  },

  async updateEstado(id: string, estado: string) {
    await this.getById(id);

    if (!['activo', 'inactivo'].includes(estado)) {
      throw new Error('Estado inválido. Use "activo" o "inactivo"');
    }

    const [updated] = await db
      .update(conveniosIntercambio)
      .set({
        estado,
        updatedAt: new Date(),
      })
      .where(eq(conveniosIntercambio.id, id))
      .returning();

    return updated;
  },

  async verificarVigentes() {
    const result = await db
      .update(conveniosIntercambio)
      .set({
        estado: 'inactivo',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(conveniosIntercambio.estado, 'activo'),
          sql`${conveniosIntercambio.fechaFin} IS NOT NULL`,
          lte(conveniosIntercambio.fechaFin, new Date()),
        ),
      )
      .returning();

    return { actualizados: result.length };
  },

  async tieneConvenioActivo(
    tenantOrigenId: string,
    tenantDestinoId: string,
  ): Promise<boolean> {
    const [row] = await db
      .select({ id: conveniosIntercambio.id })
      .from(conveniosIntercambio)
      .where(
        and(
          eq(conveniosIntercambio.tenantOrigenId, tenantOrigenId),
          eq(conveniosIntercambio.tenantDestinoId, tenantDestinoId),
          eq(conveniosIntercambio.estado, 'activo'),
          or(
            sql`${conveniosIntercambio.fechaFin} IS NULL`,
            sql`${conveniosIntercambio.fechaFin} > NOW()`,
          ),
        ),
      )
      .limit(1);

    return !!row;
  },

  async findByTenantDestino(tenantDestinoId: string) {
    return db
      .select()
      .from(conveniosIntercambio)
      .where(
        and(
          eq(conveniosIntercambio.tenantDestinoId, tenantDestinoId),
          eq(conveniosIntercambio.estado, 'activo'),
        ),
      );
  },

  async softDelete(id: string) {
    await this.getById(id);
    await db
      .delete(conveniosIntercambio)
      .where(eq(conveniosIntercambio.id, id));
    return { success: true };
  },
};
