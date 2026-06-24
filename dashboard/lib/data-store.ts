/**
 * Data Store — PostgreSQL via Drizzle ORM.
 *
 * Capa de acceso a datos para pacientes, conversaciones, mensajes y usuarios.
 * PostgreSQL es obligatorio en producción; ya no hay fallback JSON.
 */

import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { safeLog, safeError } from '@/lib/logger';
import { pacientes, conversaciones, mensajes, usuarios, medicos, tenants } from '@/drizzle/schema';
import { eq, and, or, like, sql, desc, count, gte, lte, asc, isNull } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

// ============================================================
// Tipos compartidos
// ============================================================

export interface PacienteData {
  id: string;
  telefono: string;
  email?: string;
  nombre: string;
  apellido: string;
  dni?: string;
  fechaNacimiento?: string;
  obraSocial?: string;
  numeroAfiliado?: string;
  alergias?: string;
  medicacionCronica?: string;
  notasMedicas?: string;
  canalPreferido: string;
  consentimientoWhatsapp?: boolean;
  consentimientoEmail?: boolean;
  fuente: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UsuarioData {
  id: string;
  email: string;
  passwordHash: string;
  nombre: string;
  rol: string;
  activo: boolean;
  plan?: string;
  medicoId?: string;
  tenantId?: string;
  ultimoAcceso?: string;
  secreto2fa?: string | null;
  activo2fa?: boolean;
  backupCodes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversacionData {
  id: string;
  pacienteId: string;
  medicoId?: string;
  canal: string;
  estado: string;
  optOut: boolean;
  optOutAt?: string;
  ultimoMensaje?: string;
  ultimoMensajeRol?: string;
  ultimaIntencion?: string;
  ultimaInteraccion: string;
  contextoIa: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  paciente?: {
    nombre: string | null;
    apellido: string | null;
    telefono: string | null;
  };
  mensajes?: MensajeData[];
}

export interface MensajeData {
  id: string;
  conversacionId: string;
  rol: string;
  contenido: string;
  contenidoProcesado?: string;
  tipo: string;
  intencion?: string;
  confianzaIntencion?: number;
  twilioSid?: string;
  twilioStatus?: string;
  n8nExecutionId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ============================================================
// PACIENTES
// ============================================================

export async function getPacienteByTelefono(telefono: string): Promise<PacienteData | null> {
  const result = await db.select().from(pacientes).where(eq(pacientes.telefono, telefono)).limit(1);
  if (result.length === 0) return null;
  const p = result[0];
  return {
    id: p.id,
    telefono: p.telefono,
    email: p.email || undefined,
    nombre: p.nombre,
    apellido: p.apellido,
    dni: p.dni || undefined,
    fechaNacimiento: p.fechaNacimiento || undefined,
    obraSocial: p.obraSocial || undefined,
    numeroAfiliado: p.numeroAfiliado || undefined,
    alergias: p.alergias || undefined,
    medicacionCronica: p.medicacionCronica || undefined,
    notasMedicas: p.notasMedicas || undefined,
    canalPreferido: p.canalPreferido || 'whatsapp',
    consentimientoWhatsapp: p.consentimientoWhatsapp ?? false,
    consentimientoEmail: p.consentimientoEmail ?? false,
    fuente: p.fuente || 'whatsapp',
    tags: p.tags || [],
    metadata: (p.metadata as Record<string, unknown>) ?? {},
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function createPaciente(
  data: Omit<PacienteData, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<PacienteData> {
  const now = new Date().toISOString();
  const nuevo: PacienteData = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(pacientes).values({
    id: nuevo.id,
    telefono: nuevo.telefono,
    email: nuevo.email || null,
    nombre: nuevo.nombre,
    apellido: nuevo.apellido,
    dni: nuevo.dni || null,
    fechaNacimiento: nuevo.fechaNacimiento || null,
    obraSocial: nuevo.obraSocial || null,
    numeroAfiliado: nuevo.numeroAfiliado || null,
    alergias: nuevo.alergias || null,
    medicacionCronica: nuevo.medicacionCronica || null,
    notasMedicas: nuevo.notasMedicas || null,
    canalPreferido: nuevo.canalPreferido,
    consentimientoWhatsapp: nuevo.consentimientoWhatsapp,
    consentimientoEmail: nuevo.consentimientoEmail,
    fuente: nuevo.fuente,
    tags: nuevo.tags,
    metadata: nuevo.metadata,
  });
  return nuevo;
}

// ============================================================
// CONVERSACIONES
// ============================================================

export async function getConversaciones(options?: {
  estado?: string;
  canal?: string;
  search?: string;
  limit?: number;
  offset?: number;
  medicoId?: string;
}): Promise<ConversacionData[]> {
  let query = db
    .select({
      conversacion: conversaciones,
      pacienteNombre: pacientes.nombre,
      pacienteApellido: pacientes.apellido,
      pacienteTelefono: pacientes.telefono,
    })
    .from(conversaciones)
    .leftJoin(pacientes, eq(conversaciones.pacienteId, pacientes.id))
    .orderBy(desc(conversaciones.ultimaInteraccion))
    .$dynamic();

  const conditions: (SQL | undefined)[] = [];
  if (options?.estado) {
    conditions.push(eq(conversaciones.estado, options.estado));
  }
  if (options?.canal) {
    conditions.push(eq(conversaciones.canal, options.canal));
  }
  if (options?.search) {
    conditions.push(
      or(
        like(pacientes.nombre, `%${options.search}%`),
        like(pacientes.apellido, `%${options.search}%`),
        like(conversaciones.ultimoMensaje, `%${options.search}%`),
      ),
    );
  }
  if (options?.medicoId) {
    conditions.push(eq(conversaciones.medicoId, options.medicoId));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.offset(options.offset);
  }

  const results = await query;
  return results.map((r) => ({
    id: r.conversacion.id,
    pacienteId: r.conversacion.pacienteId,
    medicoId: r.conversacion.medicoId || undefined,
    canal: r.conversacion.canal,
    estado: r.conversacion.estado,
    optOut: r.conversacion.optOut,
    optOutAt: r.conversacion.optOutAt?.toISOString(),
    ultimoMensaje: r.conversacion.ultimoMensaje || undefined,
    ultimoMensajeRol: r.conversacion.ultimoMensajeRol || undefined,
    ultimaIntencion: r.conversacion.ultimaIntencion || undefined,
    ultimaInteraccion: r.conversacion.ultimaInteraccion.toISOString(),
    contextoIa: (r.conversacion.contextoIa as Record<string, unknown>) ?? {},
    metadata: (r.conversacion.metadata as Record<string, unknown>) ?? {},
    createdAt: r.conversacion.createdAt.toISOString(),
    updatedAt: r.conversacion.updatedAt.toISOString(),
    paciente: {
      nombre: r.pacienteNombre,
      apellido: r.pacienteApellido,
      telefono: r.pacienteTelefono,
    },
  }));
}

export async function getConversacionById(id: string): Promise<ConversacionData | null> {
  const result = await db
    .select({
      conversacion: conversaciones,
      pacienteNombre: pacientes.nombre,
      pacienteApellido: pacientes.apellido,
      pacienteTelefono: pacientes.telefono,
    })
    .from(conversaciones)
    .leftJoin(pacientes, eq(conversaciones.pacienteId, pacientes.id))
    .where(eq(conversaciones.id, id))
    .limit(1);

  if (result.length === 0) return null;
  const r = result[0];
  return {
    id: r.conversacion.id,
    pacienteId: r.conversacion.pacienteId,
    medicoId: r.conversacion.medicoId || undefined,
    canal: r.conversacion.canal,
    estado: r.conversacion.estado,
    optOut: r.conversacion.optOut,
    optOutAt: r.conversacion.optOutAt?.toISOString(),
    ultimoMensaje: r.conversacion.ultimoMensaje || undefined,
    ultimoMensajeRol: r.conversacion.ultimoMensajeRol || undefined,
    ultimaIntencion: r.conversacion.ultimaIntencion || undefined,
    ultimaInteraccion: r.conversacion.ultimaInteraccion.toISOString(),
    contextoIa: (r.conversacion.contextoIa as Record<string, unknown>) ?? {},
    metadata: (r.conversacion.metadata as Record<string, unknown>) ?? {},
    createdAt: r.conversacion.createdAt.toISOString(),
    updatedAt: r.conversacion.updatedAt.toISOString(),
    paciente: {
      nombre: r.pacienteNombre || '',
      apellido: r.pacienteApellido || '',
      telefono: r.pacienteTelefono || '',
    },
  };
}

export async function createConversacion(data: {
  pacienteId: string;
  medicoId?: string;
  canal?: string;
  mensajeInicial?: string;
  rolMensajeInicial?: string;
  intencionInicial?: string;
}): Promise<ConversacionData> {
  const now = new Date().toISOString();
  const nueva: ConversacionData = {
    id: crypto.randomUUID(),
    pacienteId: data.pacienteId,
    medicoId: data.medicoId,
    canal: data.canal || 'whatsapp',
    estado: 'activa',
    optOut: false,
    ultimoMensaje: data.mensajeInicial,
    ultimoMensajeRol: data.rolMensajeInicial || 'paciente',
    ultimaIntencion: data.intencionInicial,
    ultimaInteraccion: now,
    contextoIa: {} as Record<string, unknown>,
    metadata: {} as Record<string, unknown>,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(conversaciones).values({
    id: nueva.id,
    pacienteId: nueva.pacienteId,
    medicoId: nueva.medicoId || null,
    canal: nueva.canal,
    estado: nueva.estado,
    optOut: nueva.optOut,
    ultimoMensaje: nueva.ultimoMensaje || null,
    ultimoMensajeRol: nueva.ultimoMensajeRol || null,
    ultimaIntencion: nueva.ultimaIntencion || null,
    ultimaInteraccion: new Date(),
    contextoIa: nueva.contextoIa,
    metadata: nueva.metadata,
  });
  return nueva;
}

export async function updateConversacion(
  id: string,
  data: Partial<{
    estado: string;
    ultimoMensaje: string;
    ultimoMensajeRol: string;
    ultimaIntencion: string;
    contextoIa: Record<string, unknown>;
    medicoId: string;
    metadata: Record<string, unknown>;
  }>,
): Promise<ConversacionData | null> {
  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.ultimoMensaje !== undefined || data.ultimaIntencion !== undefined) {
    updateData.ultimaInteraccion = new Date();
  }
  await db.update(conversaciones).set(updateData).where(eq(conversaciones.id, id));
  return getConversacionById(id);
}

// ============================================================
// MENSAJES
// ============================================================

export async function getMensajesByConversacion(conversacionId: string): Promise<MensajeData[]> {
  const result = await db
    .select()
    .from(mensajes)
    .where(eq(mensajes.conversacionId, conversacionId))
    .orderBy(asc(mensajes.createdAt));
  return result.map((m) => ({
    id: m.id,
    conversacionId: m.conversacionId,
    rol: m.rol,
    contenido: m.contenido,
    contenidoProcesado: m.contenidoProcesado || undefined,
    tipo: m.tipo,
    intencion: m.intencion || undefined,
    confianzaIntencion: m.confianzaIntencion ? Number(m.confianzaIntencion) : undefined,
    twilioSid: m.twilioSid || undefined,
    twilioStatus: m.twilioStatus || undefined,
    n8nExecutionId: m.n8nExecutionId || undefined,
    metadata: (m.metadata as Record<string, unknown>) ?? {},
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function createMensaje(data: {
  conversacionId: string;
  rol: string;
  contenido: string;
  contenidoProcesado?: string;
  tipo?: string;
  intencion?: string;
  confianzaIntencion?: number;
  twilioSid?: string;
  twilioStatus?: string;
  n8nExecutionId?: string;
  metadata?: Record<string, unknown>;
}): Promise<MensajeData> {
  const now = new Date().toISOString();
  const nuevo: MensajeData = {
    id: crypto.randomUUID(),
    conversacionId: data.conversacionId,
    rol: data.rol,
    contenido: data.contenido,
    contenidoProcesado: data.contenidoProcesado,
    tipo: data.tipo || 'texto',
    intencion: data.intencion,
    confianzaIntencion: data.confianzaIntencion,
    twilioSid: data.twilioSid,
    twilioStatus: data.twilioStatus,
    n8nExecutionId: data.n8nExecutionId,
    metadata: data.metadata ?? {},
    createdAt: now,
  };

  await db.insert(mensajes).values({
    id: nuevo.id,
    conversacionId: nuevo.conversacionId,
    rol: nuevo.rol,
    contenido: nuevo.contenido,
    contenidoProcesado: nuevo.contenidoProcesado || null,
    tipo: nuevo.tipo,
    intencion: nuevo.intencion || null,
    confianzaIntencion: nuevo.confianzaIntencion ? String(nuevo.confianzaIntencion) : null,
    twilioSid: nuevo.twilioSid || null,
    twilioStatus: nuevo.twilioStatus || null,
    n8nExecutionId: nuevo.n8nExecutionId || null,
    metadata: nuevo.metadata,
  });

  await updateConversacion(data.conversacionId, {
    ultimoMensaje: data.contenido,
    ultimoMensajeRol: data.rol,
    ultimaIntencion: data.intencion,
  });

  return nuevo;
}

export async function updateMensajeByTwilioSid(
  twilioSid: string,
  updates: {
    twilioStatus?: string;
    costo?: number;
    metadata?: Record<string, unknown>;
  },
): Promise<MensajeData | null> {
  const existing = await db
    .select()
    .from(mensajes)
    .where(eq(mensajes.twilioSid, twilioSid))
    .limit(1);

  if (existing.length === 0) return null;

  const updateFields: Record<string, unknown> = {};
  if (updates.twilioStatus !== undefined) updateFields.twilioStatus = updates.twilioStatus;
  if (updates.costo !== undefined) updateFields.costo = String(updates.costo);
  if (updates.metadata !== undefined) updateFields.metadata = updates.metadata;

  await db.update(mensajes).set(updateFields).where(eq(mensajes.twilioSid, twilioSid));

  const updated = await db
    .select()
    .from(mensajes)
    .where(eq(mensajes.twilioSid, twilioSid))
    .limit(1);

  if (updated.length === 0) return null;
  const m = updated[0];
  return {
    id: m.id,
    conversacionId: m.conversacionId,
    rol: m.rol,
    contenido: m.contenido,
    contenidoProcesado: m.contenidoProcesado || undefined,
    tipo: m.tipo,
    intencion: m.intencion || undefined,
    confianzaIntencion: m.confianzaIntencion ? Number(m.confianzaIntencion) : undefined,
    twilioSid: m.twilioSid || undefined,
    twilioStatus: m.twilioStatus || undefined,
    n8nExecutionId: m.n8nExecutionId || undefined,
    metadata: (m.metadata as Record<string, unknown>) ?? {},
    createdAt: m.createdAt.toISOString(),
  };
}

// ============================================================
// GET MENSAJES (para Webhook Logs Dashboard)
// ============================================================

export interface GetMensajesOptions {
  twilioStatus?: string;
  desde?: string;
  hasta?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

export interface MensajeWithPaciente extends MensajeData {
  pacienteNombre: string;
  pacienteApellido: string;
  pacienteTelefono: string;
  conversacionEstado: string;
  conversacionCanal: string;
}

export async function getMensajes(
  options: GetMensajesOptions = {},
): Promise<{ mensajes: MensajeWithPaciente[]; total: number; porEstado: Record<string, number> }> {
  const conditions: (SQL | undefined)[] = [];

  if (options.twilioStatus) {
    conditions.push(eq(mensajes.twilioStatus, options.twilioStatus));
  }
  if (options.desde) {
    conditions.push(gte(mensajes.createdAt, new Date(options.desde)));
  }
  if (options.hasta) {
    conditions.push(lte(mensajes.createdAt, new Date(options.hasta)));
  }
  if (options.search) {
    conditions.push(
      sql`(LOWER(${mensajes.contenido}) LIKE LOWER(${'%' + options.search + '%'}) OR LOWER(${pacientes.nombre}) LIKE LOWER(${'%' + options.search + '%'}) OR LOWER(${pacientes.apellido}) LIKE LOWER(${'%' + options.search + '%'}))`,
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ total: count() })
    .from(mensajes)
    .leftJoin(conversaciones, eq(mensajes.conversacionId, conversaciones.id))
    .leftJoin(pacientes, eq(conversaciones.pacienteId, pacientes.id))
    .where(whereClause);

  const total = Number(countResult[0]?.total || 0);

  const limit = options.limit || 50;
  const offset = options.offset || 0;

  const rows = await db
    .select({
      id: mensajes.id,
      conversacionId: mensajes.conversacionId,
      rol: mensajes.rol,
      contenido: mensajes.contenido,
      contenidoProcesado: mensajes.contenidoProcesado,
      tipo: mensajes.tipo,
      intencion: mensajes.intencion,
      confianzaIntencion: mensajes.confianzaIntencion,
      twilioSid: mensajes.twilioSid,
      twilioStatus: mensajes.twilioStatus,
      costo: mensajes.costo,
      n8nExecutionId: mensajes.n8nExecutionId,
      metadata: mensajes.metadata,
      createdAt: mensajes.createdAt,
      pacienteNombre: pacientes.nombre,
      pacienteApellido: pacientes.apellido,
      pacienteTelefono: pacientes.telefono,
      conversacionEstado: conversaciones.estado,
      conversacionCanal: conversaciones.canal,
    })
    .from(mensajes)
    .leftJoin(conversaciones, eq(mensajes.conversacionId, conversaciones.id))
    .leftJoin(pacientes, eq(conversaciones.pacienteId, pacientes.id))
    .where(whereClause)
    .orderBy(desc(mensajes.createdAt))
    .limit(limit)
    .offset(offset);

  const statusCounts = await db
    .select({
      status: mensajes.twilioStatus,
      total: count(),
    })
    .from(mensajes)
    .groupBy(mensajes.twilioStatus);

  const porEstado: Record<string, number> = {};
  for (const s of statusCounts) {
    if (s.status) porEstado[s.status] = Number(s.total);
  }

  return {
    mensajes: rows.map((r) => ({
      id: r.id,
      conversacionId: r.conversacionId,
      rol: r.rol,
      contenido: r.contenido,
      contenidoProcesado: r.contenidoProcesado || undefined,
      tipo: r.tipo,
      intencion: r.intencion || undefined,
      confianzaIntencion: r.confianzaIntencion ? Number(r.confianzaIntencion) : undefined,
      twilioSid: r.twilioSid || undefined,
      twilioStatus: r.twilioStatus || undefined,
      n8nExecutionId: r.n8nExecutionId || undefined,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      createdAt: r.createdAt.toISOString(),
      pacienteNombre: r.pacienteNombre || '',
      pacienteApellido: r.pacienteApellido || '',
      pacienteTelefono: r.pacienteTelefono || '',
      conversacionEstado: r.conversacionEstado || '',
      conversacionCanal: r.conversacionCanal || '',
    })),
    total,
    porEstado,
  };
}

// ============================================================
// USUARIOS
// ============================================================

export async function getUserByEmail(email: string): Promise<UsuarioData | null> {
  const result = await db.select().from(usuarios).where(eq(usuarios.email, email)).limit(1);
  if (result.length === 0) return null;
  const u = result[0];
  if (!u.activo) return null;

  let medicoId: string | undefined;
  try {
    const [medico] = await db
      .select({ id: medicos.id })
      .from(medicos)
      .where(and(eq(medicos.usuarioId, u.id), isNull(medicos.deletedAt)))
      .limit(1);
    if (medico) medicoId = medico.id;
  } catch {
    // Tabla medicos puede no existir aún en entornos muy nuevos
  }

  return {
    id: u.id,
    email: u.email,
    passwordHash: u.passwordHash,
    nombre: u.nombre,
    rol: u.rol,
    activo: u.activo,
    plan: u.plan || 'free',
    medicoId,
    tenantId: u.tenantId ?? undefined,
    secreto2fa: u.secreto2fa,
    activo2fa: u.activo2fa,
    backupCodes: u.backupCodes,
    ultimoAcceso: u.ultimoAcceso?.toISOString(),
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

export async function createAdminUserIfNotExists(): Promise<boolean> {
  try {
    const existing = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, 'admin@consultorio.com'))
      .limit(1);
    if (existing.length > 0) return false;

    // Asegurar que existe el tenant default
    const tenantExists = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, '00000000-0000-0000-0000-000000000000'))
      .limit(1);
    if (tenantExists.length === 0) {
      await db.insert(tenants).values({
        id: '00000000-0000-0000-0000-000000000000',
        nombre: 'Consultorio Medico',
        subdomain: 'demo',
        logoUrl: '/aicoremed_dark_1200.svg',
        colores: { primary: '#2563eb' },
        activo: true,
      });
    }

    const seedPassword =
      process.env.SEED_ADMIN_PASSWORD || process.env.NEXT_PUBLIC_SEED_ADMIN_PASSWORD;
    if (!seedPassword) {
      console.warn(
        '[Seed] No SEED_ADMIN_PASSWORD set, using fallback. Cambiá la password después del primer login.',
      );
    }
    const hash = await bcrypt.hash(seedPassword || 'Admin123456!', 10);
    const adminId = crypto.randomUUID();

    await db.insert(usuarios).values({
      id: adminId,
      email: 'admin@consultorio.com',
      passwordHash: hash,
      nombre: 'Administrador',
      rol: 'admin',
      activo: true,
      tenantId: '00000000-0000-0000-0000-000000000000',
      plan: 'professional',
    });

    // Crear medico asociado al admin
    const medicoExists = await db
      .select()
      .from(medicos)
      .where(eq(medicos.email, 'admin@consultorio.com'))
      .limit(1);
    if (medicoExists.length === 0) {
      await db.insert(medicos).values({
        usuarioId: adminId,
        nombre: 'Administrador',
        especialidad: 'Direccion Medica',
        email: 'admin@consultorio.com',
        activo: true,
      });
    }

    safeLog('[DataStore] Admin creado en PostgreSQL exitosamente');
    return true;
  } catch (err) {
    safeError(
      '[DataStore] Error creando admin en PostgreSQL:',
      err instanceof Error ? { message: err.message } : err,
    );
    return false;
  }
}

export async function updateUser2FA(
  email: string,
  data: { secreto2fa: string | null; activo2fa: boolean; clearBackupCodes?: boolean },
): Promise<boolean> {
  try {
    const updateData: Record<string, unknown> = {
      secreto2fa: data.secreto2fa,
      activo2fa: data.activo2fa,
      updatedAt: new Date(),
    };
    if (data.clearBackupCodes) {
      updateData.backupCodes = null;
    }
    await db.update(usuarios).set(updateData).where(eq(usuarios.email, email));
    return true;
  } catch {
    return false;
  }
}

/**
 * Almacena los códigos de respaldo 2FA hasheados.
 * Se recibe un array de SHA-256 (hex) ya calculados.
 */
export async function storeBackupCodes(email: string, hashedCodes: string[]): Promise<void> {
  await db
    .update(usuarios)
    .set({
      backupCodes: JSON.stringify(hashedCodes),
      updatedAt: new Date(),
    })
    .where(eq(usuarios.email, email));
}

// ============================================================
// SEED DATA
// ============================================================

export async function seedDataIfEmpty(): Promise<boolean> {
  await createAdminUserIfNotExists();
  return false;
}
