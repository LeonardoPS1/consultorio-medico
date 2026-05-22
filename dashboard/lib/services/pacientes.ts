/**
 * Service layer para Pacientes.
 * Contiene toda la lógica de negocio y acceso a DB.
 * Los route handlers solo parsean requests y llaman estos servicios.
 */

import { db } from '@/lib/db';
import { pacientes, turnos, pacienteEventos } from '@/drizzle/schema';
import { eq, and, sql, count, or, like, desc } from 'drizzle-orm';
import type { CreatePaciente, UpdatePaciente } from '@/lib/validations';
import { conflict, notFound } from '@/lib/api-handler';

export const pacientesService = {
  /** Listar pacientes con búsqueda y stats */
  async list(search?: string, limit = 100, offset = 0) {
    const whereConditions = and(
      sql`${pacientes.deletedAt} IS NULL`,
      search
        ? or(
            like(pacientes.nombre, `%${search}%`),
            like(pacientes.apellido, `%${search}%`),
            like(pacientes.telefono, `%${search}%`),
          )
        : undefined,
    );

    const [{ total }] = await db.select({ total: count() }).from(pacientes).where(whereConditions);

    const [{ conTurnos }] = await db
      .select({ conTurnos: count() })
      .from(pacientes)
      .where(and(
        sql`${pacientes.deletedAt} IS NULL`,
        sql`EXISTS (SELECT 1 FROM ${turnos} WHERE ${turnos.pacienteId} = ${pacientes.id} AND ${turnos.deletedAt} IS NULL)`,
      ));

    const [{ nuevos }] = await db
      .select({ nuevos: count() })
      .from(pacientes)
      .where(and(
        sql`${pacientes.deletedAt} IS NULL`,
        sql`NOT EXISTS (SELECT 1 FROM ${turnos} WHERE ${turnos.pacienteId} = ${pacientes.id} AND ${turnos.deletedAt} IS NULL)`,
      ));

    const lista = await db.select({
      id: pacientes.id, nombre: pacientes.nombre, apellido: pacientes.apellido,
      telefono: pacientes.telefono, email: pacientes.email, obraSocial: pacientes.obraSocial,
      tags: pacientes.tags, dni: pacientes.dni, createdAt: pacientes.createdAt,
      ultimoTurno: sql<string>`(SELECT MAX(${turnos.fechaHora}::text) FROM ${turnos} WHERE ${turnos.pacienteId} = ${pacientes.id} AND ${turnos.deletedAt} IS NULL)`,
      totalTurnos: sql<number>`(SELECT COUNT(*) FROM ${turnos} WHERE ${turnos.pacienteId} = ${pacientes.id} AND ${turnos.deletedAt} IS NULL)`,
    }).from(pacientes).where(whereConditions).orderBy(pacientes.createdAt).limit(limit).offset(offset);

    const data = lista.map(p => ({ ...p, tags: Array.isArray(p.tags) ? p.tags : typeof p.tags === 'string' ? JSON.parse(p.tags) : [] }));
    return { data, total: Number(total), conTurnos: Number(conTurnos), nuevos: Number(nuevos), limit, offset };
  },

  /** Crear paciente */
  async create(input: CreatePaciente) {
    const existente = await db.select({ id: pacientes.id }).from(pacientes).where(and(eq(pacientes.telefono, input.telefono), sql`${pacientes.deletedAt} IS NULL`)).limit(1);
    if (existente.length > 0) conflict('Ya existe un paciente con ese teléfono');

    const [nuevo] = await db.insert(pacientes).values({
      nombre: input.nombre.trim(), apellido: input.apellido.trim(),
      telefono: input.telefono.trim(), email: input.email?.trim() || null,
      obraSocial: input.obraSocial || null, dni: input.dni || null,
      fechaNacimiento: input.fechaNacimiento || null, direccion: input.direccion || null,
      alergias: input.alergias || null, medicacionCronica: input.medicacionCronica || null,
      notasMedicas: input.notasMedicas || null,
      tags: input.obraSocial === 'Particular' ? ['Particular'] : ['Obra Social'],
    }).returning();

    try { await db.insert(pacienteEventos).values({ pacienteId: nuevo.id, tipo: 'opt_in', descripcion: 'Paciente registrado desde el dashboard', metadata: { source: 'dashboard' } }); } catch {}

    return nuevo;
  },

  /** Obtener detalle completo */
  async getById(id: string) {
    const [p] = await db.select().from(pacientes).where(and(eq(pacientes.id, id), sql`${pacientes.deletedAt} IS NULL`));
    if (!p) notFound('Paciente no encontrado');
    return p;
  },

  /** Actualizar paciente */
  async update(id: string, input: UpdatePaciente) {
    await this.getById(id);
    const data: Record<string, any> = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined) data[k] = v;
    }
    const [updated] = await db.update(pacientes).set(data).where(eq(pacientes.id, id)).returning();
    return updated;
  },
};
