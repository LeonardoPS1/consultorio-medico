/**
 * Service layer para Pacientes.
 * Contiene toda la lógica de negocio y acceso a DB.
 * Los route handlers solo parsean requests y llaman estos servicios.
 */

import { db } from '@/lib/db';
import { pacientes, turnos, pacienteEventos } from '@/drizzle/schema';
import { eq, and, sql, count, or, ilike, desc } from 'drizzle-orm';
import type { CreatePaciente, UpdatePaciente } from '@/lib/validations';
import { conflict, notFound } from '@/lib/api-handler';
import { privacidadService } from '@/lib/services/privacidad';
import { cache } from '@/lib/cache';

export const pacientesService = {
  /** Listar pacientes con búsqueda y stats */
  async list(search?: string, limit = 100, offset = 0, sucursalId?: string, medicoId?: string) {
    const cacheKey = `pacientes:list:${search ?? ''}:${limit}:${offset}:${sucursalId ?? ''}:${medicoId ?? ''}`;
    return cache.getOrSet(cacheKey, async () => {
      const turnoJoin = medicoId
        ? sql`EXISTS (SELECT 1 FROM ${turnos} WHERE ${turnos.pacienteId} = ${pacientes.id} AND ${turnos.medicoId} = ${medicoId} AND ${turnos.deletedAt} IS NULL)`
        : sql`EXISTS (SELECT 1 FROM ${turnos} WHERE ${turnos.pacienteId} = ${pacientes.id} AND ${turnos.deletedAt} IS NULL)`;

      const noTurnoJoin = medicoId
        ? sql`NOT EXISTS (SELECT 1 FROM ${turnos} WHERE ${turnos.pacienteId} = ${pacientes.id} AND ${turnos.medicoId} = ${medicoId} AND ${turnos.deletedAt} IS NULL)`
        : sql`NOT EXISTS (SELECT 1 FROM ${turnos} WHERE ${turnos.pacienteId} = ${pacientes.id} AND ${turnos.deletedAt} IS NULL)`;

      const whereConditions = and(
        sql`${pacientes.deletedAt} IS NULL`,
        search
          ? or(
              ilike(pacientes.nombre, `%${search}%`),
              ilike(pacientes.apellido, `%${search}%`),
              ilike(pacientes.telefono, `%${search}%`),
              ilike(pacientes.rut, `%${search}%`),
              ilike(pacientes.dni, `%${search}%`),
              sql`${pacientes.nombre} || ' ' || ${pacientes.apellido} ILIKE ${'%' + search + '%'}`,
            )
          : undefined,
        sucursalId ? eq(pacientes.sucursalId, sucursalId) : undefined,
      );

      const [{ total }] = await db.select({ total: count() }).from(pacientes).where(whereConditions);

      const [{ conTurnos }] = await db
        .select({ conTurnos: count() })
        .from(pacientes)
        .where(and(
          sql`${pacientes.deletedAt} IS NULL`,
          turnoJoin,
          sucursalId ? eq(pacientes.sucursalId, sucursalId) : undefined,
        ));

      const [{ nuevos }] = await db
        .select({ nuevos: count() })
        .from(pacientes)
        .where(and(
          sql`${pacientes.deletedAt} IS NULL`,
          noTurnoJoin,
          sucursalId ? eq(pacientes.sucursalId, sucursalId) : undefined,
        ));

      const turnoSubSelect = medicoId
        ? sql`(SELECT MAX(${turnos.fechaHora}::text) FROM ${turnos} WHERE ${turnos.pacienteId} = ${pacientes.id} AND ${turnos.medicoId} = ${medicoId} AND ${turnos.deletedAt} IS NULL)`
        : sql`(SELECT MAX(${turnos.fechaHora}::text) FROM ${turnos} WHERE ${turnos.pacienteId} = ${pacientes.id} AND ${turnos.deletedAt} IS NULL)`;

      const turnoCountSelect = medicoId
        ? sql`(SELECT COUNT(*) FROM ${turnos} WHERE ${turnos.pacienteId} = ${pacientes.id} AND ${turnos.medicoId} = ${medicoId} AND ${turnos.deletedAt} IS NULL)`
        : sql`(SELECT COUNT(*) FROM ${turnos} WHERE ${turnos.pacienteId} = ${pacientes.id} AND ${turnos.deletedAt} IS NULL)`;

      const lista = await db.select({
        id: pacientes.id, nombre: pacientes.nombre, apellido: pacientes.apellido,
        telefono: pacientes.telefono, email: pacientes.email, obraSocial: pacientes.obraSocial,
        sistemaSalud: pacientes.sistemaSalud, isapreNombre: pacientes.isapreNombre,
        tags: pacientes.tags, dni: pacientes.dni, createdAt: pacientes.createdAt,
        ultimoTurno: sql<string>`${turnoSubSelect}`,
        totalTurnos: sql<number>`${turnoCountSelect}`,
      }).from(pacientes).where(whereConditions).orderBy(pacientes.createdAt).limit(limit).offset(offset);

      const data = lista.map(p => ({ ...p, tags: Array.isArray(p.tags) ? p.tags : typeof p.tags === 'string' ? JSON.parse(p.tags) : [] }));
      return { data, total: Number(total), conTurnos: Number(conTurnos), nuevos: Number(nuevos), limit, offset };
    }, 30_000); // TTL 30s — pacientes cambian con menos frecuencia
  },

  /** Crear paciente */
  async create(input: CreatePaciente) {
    const existente = await db.select({ id: pacientes.id }).from(pacientes).where(and(eq(pacientes.telefono, input.telefono), sql`${pacientes.deletedAt} IS NULL`)).limit(1);
    if (existente.length > 0) conflict('Ya existe un paciente con ese teléfono');

    const [nuevo] = await db.insert(pacientes).values({
      nombre: input.nombre.trim(), apellido: input.apellido.trim(),
      telefono: input.telefono.trim(), email: input.email?.trim() || null,
      obraSocial: input.obraSocial || null,
      sistemaSalud: input.sistemaSalud || null,
      isapreNombre: input.isapreNombre || null,
      dni: input.dni || null,
      fechaNacimiento: input.fechaNacimiento || null, direccion: input.direccion || null,
      regionId: input.regionId || null,
      comunaId: input.comunaId || null,
      alergias: input.alergias || null, medicacionCronica: input.medicacionCronica || null,
      notasMedicas: input.notasMedicas || null,
      tags: (() => {
        if (input.sistemaSalud === 'fonasa') return ['Fonasa'];
        if (input.sistemaSalud === 'isapre' && input.isapreNombre) return [input.isapreNombre];
        if (input.sistemaSalud === 'particular' || input.obraSocial === 'Particular') return ['Particular'];
        return ['Fonasa'];
      })(),
      sucursalId: (input as any).sucursalId || null,
    }).returning();

    // Evento de registro (fire-and-forget — no bloquea la respuesta)
    db.insert(pacienteEventos).values({ pacienteId: nuevo.id, tipo: 'opt_in', descripcion: 'Paciente registrado desde el dashboard', metadata: { source: 'dashboard' } }).then().catch(() => {});

    // Invalidar cache de listados
    cache.invalidate('pacientes:list:');

    return nuevo;
  },

  /** Obtener detalle completo */
  async getById(id: string) {
    return cache.getOrSet(`pacientes:get:${id}`, async () => {
      const [p] = await db.select().from(pacientes).where(and(eq(pacientes.id, id), sql`${pacientes.deletedAt} IS NULL`));
      if (!p) notFound('Paciente no encontrado');
      return p;
    }, 30_000); // TTL 30s
  },

  /** Actualizar paciente */
  async update(id: string, input: UpdatePaciente) {
    await this.getById(id);
    const data: Record<string, any> = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined) data[k] = v;
    }
    const [updated] = await db.update(pacientes).set(data).where(eq(pacientes.id, id)).returning();

    // Invalidar cache
    cache.invalidate('pacientes:list:');
    cache.invalidate(`pacientes:get:${id}`);

    return updated;
  },

  /** Soft-delete paciente con cascada de datos relacionados (ARCO) */
  async delete(id: string) {
    // Delega en privacidadService que maneja la cascada completa:
    // soft-delete de turnos, conversaciones, mensajes, recetas,
    // historial médico, eventos, tareas, facturación,
    // anonimización PII y notificación a n8n
    const result = await privacidadService.confirmarBaja(id);

    // Invalidar cache
    cache.invalidate('pacientes:list:');
    cache.invalidate(`pacientes:get:${id}`);

    return result;
  },
};
