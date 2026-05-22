import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pacientes, turnos, pacienteEventos } from '@/drizzle/schema';
import { eq, and, sql, count, gt, gte, or, like } from 'drizzle-orm';

/**
 * GET /api/pacientes
 *
 * Lista pacientes con búsqueda opcional y estadísticas.
 *
 * Query params:
 * - search: búsqueda por nombre, apellido o teléfono
 * - limit: cantidad máxima (default 50)
 * - offset: paginación (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 100;
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0;

    // Condiciones de búsqueda
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

    // Total de pacientes que matchean
    const [{ total }] = await db
      .select({ total: count() })
      .from(pacientes)
      .where(whereConditions);

    // Total de pacientes con al menos un turno
    const [{ conTurnos }] = await db
      .select({ conTurnos: count() })
      .from(pacientes)
      .where(
        and(
          sql`${pacientes.deletedAt} IS NULL`,
          sql`EXISTS (SELECT 1 FROM ${turnos} WHERE ${turnos.pacienteId} = ${pacientes.id} AND ${turnos.deletedAt} IS NULL)`,
        ),
      );

    // Pacientes nuevos (sin turnos)
    const [{ nuevos }] = await db
      .select({ nuevos: count() })
      .from(pacientes)
      .where(
        and(
          sql`${pacientes.deletedAt} IS NULL`,
          sql`NOT EXISTS (SELECT 1 FROM ${turnos} WHERE ${turnos.pacienteId} = ${pacientes.id} AND ${turnos.deletedAt} IS NULL)`,
        ),
      );

    // Lista de pacientes con su último turno y total de turnos
    const lista = await db
      .select({
        id: pacientes.id,
        nombre: pacientes.nombre,
        apellido: pacientes.apellido,
        telefono: pacientes.telefono,
        email: pacientes.email,
        obraSocial: pacientes.obraSocial,
        tags: pacientes.tags,
        dni: pacientes.dni,
        createdAt: pacientes.createdAt,
        ultimoTurno: sql<string>`(
          SELECT MAX(${turnos.fechaHora}::text) FROM ${turnos}
          WHERE ${turnos.pacienteId} = ${pacientes.id}
            AND ${turnos.deletedAt} IS NULL
        )`,
        totalTurnos: sql<number>`(
          SELECT COUNT(*) FROM ${turnos}
          WHERE ${turnos.pacienteId} = ${pacientes.id}
            AND ${turnos.deletedAt} IS NULL
        )`,
      })
      .from(pacientes)
      .where(whereConditions)
      .orderBy(pacientes.createdAt)
      .limit(limit)
      .offset(offset);

    // Mapear tags como string[] (vienen como string de PG array)
    const data = lista.map((p) => ({
      ...p,
      tags: Array.isArray(p.tags)
        ? p.tags
        : typeof p.tags === 'string'
          ? JSON.parse(p.tags)
          : [],
    }));

    return NextResponse.json({
      data,
      total: Number(total),
      conTurnos: Number(conTurnos),
      nuevos: Number(nuevos),
      limit,
      offset,
    });
  } catch (error) {
    console.error('[API] Error GET /api/pacientes:', error);
    return NextResponse.json(
      { error: 'Error al obtener pacientes' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/pacientes
 *
 * Crea un nuevo paciente.
 *
 * Body (JSON):
 * - nombre: string (obligatorio)
 * - apellido: string (obligatorio)
 * - telefono: string (obligatorio, único)
 * - email: string (opcional)
 * - obraSocial: string (opcional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, apellido, telefono, email, obraSocial } = body;

    // Validación
    if (!nombre?.trim() || !apellido?.trim() || !telefono?.trim()) {
      return NextResponse.json(
        { error: 'nombre, apellido y telefono son obligatorios' },
        { status: 400 },
      );
    }

    // Verificar si ya existe un paciente con ese teléfono
    const existente = await db
      .select({ id: pacientes.id })
      .from(pacientes)
      .where(and(eq(pacientes.telefono, telefono), sql`${pacientes.deletedAt} IS NULL`))
      .limit(1);

    if (existente.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un paciente con ese teléfono' },
        { status: 409 },
      );
    }

    // Crear paciente (solo campos core, para evitar errores con columnas no migradas)
    const [nuevo] = await db
      .insert(pacientes)
      .values({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: telefono.trim(),
        email: email?.trim() || null,
        obraSocial: obraSocial || null,
        tags: obraSocial === 'Particular' ? ['Particular'] : ['Obra Social'],
      })
      .returning();

    // Registrar evento de creación (si la tabla existe)
    try {
      await db.insert(pacienteEventos).values({
        pacienteId: nuevo.id,
        tipo: 'creado',
        descripcion: 'Paciente registrado desde el dashboard',
        metadata: { source: 'dashboard', creadoPor: 'admin' },
      });
    } catch (eventError) {
      console.warn('[API] No se pudo registrar evento de creación:', eventError);
    }

    return NextResponse.json({ data: nuevo }, { status: 201 });
  } catch (error) {
    console.error('[API] Error POST /api/pacientes:', error);
    return NextResponse.json(
      { error: 'Error al crear paciente' },
      { status: 500 },
    );
  }
}
