/**
 * Data Store - Capa de almacenamiento con fallback
 *
 * Intenta usar PostgreSQL (via Drizzle) en producción/VPS.
 * Si no hay conexión, usa un archivo JSON local para desarrollo.
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

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
  ultimoAcceso?: string;
  secreto2fa?: string | null;
  activo2fa?: boolean;
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
  // Join data (para el dashboard)
  paciente?: {
    nombre: string;
    apellido: string;
    telefono: string;
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
// Store JSON (fallback para desarrollo local)
// ============================================================

const DATA_DIR = path.join(process.cwd(), '.data');
const CONVERSACIONES_FILE = path.join(DATA_DIR, 'conversaciones.json');
const MENSAJES_FILE = path.join(DATA_DIR, 'mensajes.json');
const PACIENTES_FILE = path.join(DATA_DIR, 'pacientes.json');
const USUARIOS_FILE = path.join(DATA_DIR, 'usuarios.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON<T>(filePath: string, defaultData: T): T {
  try {
    ensureDataDir();
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return defaultData;
  }
}

function writeJSON<T>(filePath: string, data: T): void {
  ensureDataDir();
  // Atomic write: primero a archivo temporal, luego renombrar
  // Esto previene corrupción si dos requests concurrentes escriben
  const tmpPath = filePath + '.tmp.' + process.pid;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

// ============================================================
// Store principal (detecta PostgreSQL o usa JSON)
// ============================================================

let pgAvailable: boolean | null = null;

async function checkPostgres(): Promise<boolean> {
  if (pgAvailable !== null) return pgAvailable;

  try {
    const { db } = await import('@/lib/db');
    const { sql } = await import('drizzle-orm');
    // Intentamos un query simple
    await db.execute(sql`SELECT 1`);
    pgAvailable = true;
    console.log('[DataStore] Usando PostgreSQL');
    return true;
  } catch {
    pgAvailable = false;
    console.log('[DataStore] PostgreSQL no disponible, usando JSON store (desarrollo)');
    return false;
  }
}

// ============================================================
// PACIENTES
// ============================================================

function asRecord(obj: unknown): Record<string, unknown> {
  return (obj as Record<string, unknown>) ?? {};
}

export async function getPacienteByTelefono(telefono: string): Promise<PacienteData | null> {
  const pg = await checkPostgres();
  if (pg) {
    const { db } = await import('@/lib/db');
    const { pacientes } = await import('@/drizzle/schema');
    const { eq } = await import('drizzle-orm');
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
      metadata: asRecord(p.metadata),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  // Fallback JSON
  const pacientes = readJSON<PacienteData[]>(PACIENTES_FILE, []);
  return pacientes.find((p) => p.telefono === telefono) || null;
}

export async function createPaciente(data: Omit<PacienteData, 'id' | 'createdAt' | 'updatedAt'>): Promise<PacienteData> {
  const now = new Date().toISOString();
  const nuevo: PacienteData = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };

  const pg = await checkPostgres();
  if (pg) {
    const { db } = await import('@/lib/db');
    const { pacientes } = await import('@/drizzle/schema');
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

  // Fallback JSON
  const pacientes = readJSON<PacienteData[]>(PACIENTES_FILE, []);
  pacientes.push(nuevo);
  writeJSON(PACIENTES_FILE, pacientes);
  return nuevo;
}

// ============================================================
// CONVERSACIONES
// ============================================================

export async function getConversaciones(
  options?: { estado?: string; canal?: string; search?: string; limit?: number; offset?: number }
): Promise<ConversacionData[]> {
  const pg = await checkPostgres();
  
  if (pg) {
    const { db } = await import('@/lib/db');
    const { conversaciones, pacientes } = await import('@/drizzle/schema');
    const { eq, like, or, sql, desc, and } = await import('drizzle-orm');

    let query: any = db
      .select({
        conversacion: conversaciones,
        pacienteNombre: pacientes.nombre,
        pacienteApellido: pacientes.apellido,
        pacienteTelefono: pacientes.telefono,
      })
      .from(conversaciones)
      .leftJoin(pacientes, eq(conversaciones.pacienteId, pacientes.id))
      .orderBy(desc(conversaciones.ultimaInteraccion));

    const conditions: any[] = [];
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
          like(conversaciones.ultimoMensaje, `%${options.search}%`)
        )
      );
    }

    // Aplicar filtros a la query
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.offset(options.offset);
    }

    const results: any[] = await query;
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
      contextoIa: asRecord(r.conversacion.contextoIa),
      metadata: asRecord(r.conversacion.metadata),
      createdAt: r.conversacion.createdAt.toISOString(),
      updatedAt: r.conversacion.updatedAt.toISOString(),
      paciente: {
        nombre: r.pacienteNombre,
        apellido: r.pacienteApellido,
        telefono: r.pacienteTelefono,
      },
    }));
  }

  // Fallback JSON
  let conversaciones = readJSON<ConversacionData[]>(CONVERSACIONES_FILE, []);
  const pacientes = readJSON<PacienteData[]>(PACIENTES_FILE, []);

  if (options?.estado) {
    conversaciones = conversaciones.filter((c) => c.estado === options.estado);
  }
  if (options?.canal) {
    conversaciones = conversaciones.filter((c) => c.canal === options.canal);
  }
  if (options?.search) {
    const s = options.search.toLowerCase();
    conversaciones = conversaciones.filter((c) => {
      const p = pacientes.find((p) => p.id === c.pacienteId);
      return (
        c.ultimoMensaje?.toLowerCase().includes(s) ||
        p?.nombre.toLowerCase().includes(s) ||
        p?.apellido.toLowerCase().includes(s)
      );
    });
  }

  // Ordenar por última interacción
  conversaciones.sort((a, b) => new Date(b.ultimaInteraccion).getTime() - new Date(a.ultimaInteraccion).getTime());

  if (options?.offset) {
    conversaciones = conversaciones.slice(options.offset);
  }
  if (options?.limit) {
    conversaciones = conversaciones.slice(0, options.limit);
  }

  // Adjuntar datos del paciente y calcular no leídos
  const mensajes = readJSON<MensajeData[]>(MENSAJES_FILE, []);
  return conversaciones.map((c) => {
    const mensajesNoLeidos = mensajes.filter(
      (m) => m.conversacionId === c.id && m.rol === 'paciente' && m.twilioStatus !== 'read'
    ).length;

    return {
      ...c,
      noLeidos: mensajesNoLeidos || Math.floor(Math.random() * 3), // fallback random para demo
      paciente: pacientes.find((p) => p.id === c.pacienteId) ? {
        nombre: pacientes.find((p) => p.id === c.pacienteId)!.nombre,
        apellido: pacientes.find((p) => p.id === c.pacienteId)!.apellido,
        telefono: pacientes.find((p) => p.id === c.pacienteId)!.telefono,
      } : undefined,
    };
  });
}

export async function getConversacionById(id: string): Promise<ConversacionData | null> {
  const pg = await checkPostgres();
  if (pg) {
    const { db } = await import('@/lib/db');
    const { conversaciones, pacientes } = await import('@/drizzle/schema');
    const { eq } = await import('drizzle-orm');
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
      contextoIa: asRecord(r.conversacion.contextoIa),
      metadata: asRecord(r.conversacion.metadata),
      createdAt: r.conversacion.createdAt.toISOString(),
      updatedAt: r.conversacion.updatedAt.toISOString(),
      paciente: {
        nombre: r.pacienteNombre || '',
        apellido: r.pacienteApellido || '',
        telefono: r.pacienteTelefono || '',
      },
    };
  }

  // Fallback JSON
  const conversaciones = readJSON<ConversacionData[]>(CONVERSACIONES_FILE, []);
  const pacientes = readJSON<PacienteData[]>(PACIENTES_FILE, []);
  const conv = conversaciones.find((c) => c.id === id);
  if (!conv) return null;
  const p = pacientes.find((p) => p.id === conv.pacienteId);
  return {
    ...conv,
    paciente: p ? { nombre: p.nombre, apellido: p.apellido, telefono: p.telefono } : undefined,
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

  const pg = await checkPostgres();
  if (pg) {
    const { db } = await import('@/lib/db');
    const { conversaciones } = await import('@/drizzle/schema');
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

  // Fallback JSON
  const conversaciones = readJSON<ConversacionData[]>(CONVERSACIONES_FILE, []);
  conversaciones.push(nueva);
  writeJSON(CONVERSACIONES_FILE, conversaciones);

  // Si hay mensaje inicial, crearlo también
  if (data.mensajeInicial) {
    await createMensaje({
      conversacionId: nueva.id,
      rol: data.rolMensajeInicial || 'paciente',
      contenido: data.mensajeInicial,
      intencion: data.intencionInicial,
    });
  }

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
  }>
): Promise<ConversacionData | null> {
  const now = new Date().toISOString();

  const pg = await checkPostgres();
  if (pg) {
    const { db } = await import('@/lib/db');
    const { conversaciones } = await import('@/drizzle/schema');
    const { eq } = await import('drizzle-orm');
    const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
    if (data.ultimoMensaje !== undefined || data.ultimaIntencion !== undefined) {
      updateData.ultimaInteraccion = new Date();
    }
    await db.update(conversaciones).set(updateData).where(eq(conversaciones.id, id));
    return getConversacionById(id);
  }

  // Fallback JSON
  const conversaciones = readJSON<ConversacionData[]>(CONVERSACIONES_FILE, []);
  const idx = conversaciones.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  conversaciones[idx] = {
    ...conversaciones[idx],
    ...data,
    ultimaInteraccion: data.ultimoMensaje !== undefined || data.ultimaIntencion !== undefined ? now : conversaciones[idx].ultimaInteraccion,
    updatedAt: now,
  };
  writeJSON(CONVERSACIONES_FILE, conversaciones);
  return conversaciones[idx];
}

// ============================================================
// MENSAJES
// ============================================================

export async function getMensajesByConversacion(conversacionId: string): Promise<MensajeData[]> {
  const pg = await checkPostgres();
  if (pg) {
    const { db } = await import('@/lib/db');
    const { mensajes } = await import('@/drizzle/schema');
    const { eq, asc } = await import('drizzle-orm');
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
      metadata: asRecord(m.metadata),
      createdAt: m.createdAt.toISOString(),
    }));
  }

  // Fallback JSON
  const mensajes = readJSON<MensajeData[]>(MENSAJES_FILE, []);
  return mensajes
    .filter((m) => m.conversacionId === conversacionId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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

  const pg = await checkPostgres();
  if (pg) {
    const { db } = await import('@/lib/db');
    const { mensajes } = await import('@/drizzle/schema');
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

    // Actualizar último mensaje en la conversación
    await updateConversacion(data.conversacionId, {
      ultimoMensaje: data.contenido,
      ultimoMensajeRol: data.rol,
      ultimaIntencion: data.intencion,
    });

    return nuevo;
  }

  // Fallback JSON
  const mensajes = readJSON<MensajeData[]>(MENSAJES_FILE, []);
  mensajes.push(nuevo);
  writeJSON(MENSAJES_FILE, mensajes);

  // Actualizar último mensaje en la conversación
  await updateConversacion(data.conversacionId, {
    ultimoMensaje: data.contenido,
    ultimoMensajeRol: data.rol,
    ultimaIntencion: data.intencion,
  });

  return nuevo;
}

/**
 * Actualiza el estado de un mensaje usando su Twilio SID.
 * Sirve para procesar los Status Callbacks de Twilio.
 */
export async function updateMensajeByTwilioSid(
  twilioSid: string,
  updates: {
    twilioStatus?: string;
    costo?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<MensajeData | null> {
  const pg = await checkPostgres();
  if (pg) {
    const { db } = await import('@/lib/db');
    const { mensajes } = await import('@/drizzle/schema');
    const { eq } = await import('drizzle-orm');

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

    await db
      .update(mensajes)
      .set(updateFields)
      .where(eq(mensajes.twilioSid, twilioSid));

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
      metadata: asRecord(m.metadata),
      createdAt: m.createdAt.toISOString(),
    };
  }

  // Fallback JSON
  const mensajes = readJSON<MensajeData[]>(MENSAJES_FILE, []);
  const idx = mensajes.findIndex((m) => m.twilioSid === twilioSid);
  if (idx === -1) return null;

  if (updates.twilioStatus !== undefined) mensajes[idx].twilioStatus = updates.twilioStatus;
  if (updates.costo !== undefined) {
    mensajes[idx].metadata = { ...mensajes[idx].metadata, costo: updates.costo };
  }
  if (updates.metadata !== undefined) {
    mensajes[idx].metadata = { ...mensajes[idx].metadata, ...updates.metadata };
  }
  writeJSON(MENSAJES_FILE, mensajes);
  return mensajes[idx];
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
  options: GetMensajesOptions = {}
): Promise<{ mensajes: MensajeWithPaciente[]; total: number; porEstado: Record<string, number> }> {
  const pg = await checkPostgres();
  if (pg) {
    const { db } = await import('@/lib/db');
    const { mensajes, conversaciones, pacientes } = await import('@/drizzle/schema');
    const { eq, and, like, gte, lte, desc, sql, count } = await import('drizzle-orm');

    const conditions: any[] = [];

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
        sql`(LOWER(${mensajes.contenido}) LIKE LOWER(${'%' + options.search + '%'}) OR LOWER(${pacientes.nombre}) LIKE LOWER(${'%' + options.search + '%'}) OR LOWER(${pacientes.apellido}) LIKE LOWER(${'%' + options.search + '%'}))`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await db
      .select({ total: count() })
      .from(mensajes)
      .leftJoin(conversaciones, eq(mensajes.conversacionId, conversaciones.id))
      .leftJoin(pacientes, eq(conversaciones.pacienteId, pacientes.id))
      .where(whereClause);

    const total = Number(countResult[0]?.total || 0);

    // Get messages with pagination
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

    // Count by status
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
        metadata: asRecord(r.metadata),
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

  // Fallback JSON
  const allMensajes = readJSON<MensajeWithPaciente[]>(MENSAJES_FILE, []);
  const filtered = allMensajes.filter((m) => {
    if (options.twilioStatus && m.twilioStatus !== options.twilioStatus) return false;
    if (options.desde && new Date(m.createdAt) < new Date(options.desde)) return false;
    if (options.hasta && new Date(m.createdAt) > new Date(options.hasta)) return false;
    if (options.search) {
      const s = options.search.toLowerCase();
      if (!m.contenido.toLowerCase().includes(s) && !m.pacienteNombre.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const sorted = filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const limit = options.limit || 50;
  const offset = options.offset || 0;

  const porEstado: Record<string, number> = {};
  for (const m of allMensajes) {
    if (m.twilioStatus) porEstado[m.twilioStatus] = (porEstado[m.twilioStatus] || 0) + 1;
  }

  return {
    mensajes: sorted.slice(offset, offset + limit),
    total: filtered.length,
    porEstado,
  };
}

// ============================================================
// USUARIOS (para auth sin PostgreSQL)
// ============================================================

export async function getUserByEmail(email: string): Promise<UsuarioData | null> {
  const pg = await checkPostgres();
  if (pg) {
    const { db } = await import('@/lib/db');
    const { usuarios } = await import('@/drizzle/schema');
    const { eq } = await import('drizzle-orm');
    const result = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, email))
      .limit(1);
    if (result.length === 0) return null;
    const u = result[0];
    if (!u.activo) return null;
    return {
      id: u.id,
      email: u.email,
      passwordHash: u.passwordHash,
      nombre: u.nombre,
      rol: u.rol,
      activo: u.activo,
      plan: u.plan || 'free',
      ultimoAcceso: u.ultimoAcceso?.toISOString(),
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    };
  }

  // Fallback JSON
  const usuarios = readJSON<UsuarioData[]>(USUARIOS_FILE, []);
  return usuarios.find((u) => u.email === email && u.activo) || null;
}

export async function createAdminUserIfNotExists(): Promise<boolean> {
  const pg = await checkPostgres();
  if (pg) {
    try {
      const { db } = await import('@/lib/db');
      const { usuarios, medicos, tenants } = await import('@/drizzle/schema');
      const { eq, sql } = await import('drizzle-orm');
      const bcrypt = await import('bcryptjs');

      // Verificar si ya existe el admin
      const existing = await db.select().from(usuarios).where(eq(usuarios.email, 'admin@consultorio.com')).limit(1);
      if (existing.length > 0) return false;

      // Asegurar tenant por defecto
      const tenantExists = await db.select().from(tenants).where(eq(tenants.id, '00000000-0000-0000-0000-000000000000')).limit(1);
      if (tenantExists.length === 0) {
        await db.insert(tenants).values({
          id: '00000000-0000-0000-0000-000000000000',
          nombre: 'Consultorio Médico',
          subdomain: 'demo',
          logoUrl: '/aicoremed_dark_1200.svg',
          colores: { primary: '#2563eb' },
          activo: true,
        });
      }

      const hash = await bcrypt.hash('admin123', 10);
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

      // Crear médico asociado
      await db.insert(medicos).values({
        id: crypto.randomUUID(),
        usuarioId: adminId,
        nombre: 'Administrador',
        especialidad: 'Dirección Médica',
        email: 'admin@consultorio.com',
        activo: true,
      });

      console.log('[DataStore] ✅ Admin creado en PostgreSQL: admin@consultorio.com / admin123');
      return true;
    } catch (err) {
      console.error('[DataStore] Error creando admin en PostgreSQL:', err);
      return false;
    }
  }

  const usuarios = readJSON<UsuarioData[]>(USUARIOS_FILE, []);
  const adminExists = usuarios.find((u) => u.email === 'admin@consultorio.com');

  if (adminExists) return false;

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin: UsuarioData = {
    id: crypto.randomUUID(),
    email: 'admin@consultorio.com',
    passwordHash,
    nombre: 'Administrador',
    rol: 'admin',
    activo: true,
    createdAt: now,
    updatedAt: now,
  };

  usuarios.push(admin);
  writeJSON(USUARIOS_FILE, usuarios);

  // También crear un médico de prueba
  const medicoUser: UsuarioData = {
    id: crypto.randomUUID(),
    email: 'medico@consultorio.com',
    passwordHash: await bcrypt.hash('medico123', 10),
    nombre: 'Dr. Rodríguez',
    rol: 'medico',
    activo: true,
    createdAt: now,
    updatedAt: now,
  };

  usuarios.push(medicoUser);
  writeJSON(USUARIOS_FILE, usuarios);

  console.log('[DataStore] ✅ Usuarios creados: admin@consultorio.com / medico@consultorio.com');
  return true;
}

/**
 * Actualiza la configuración 2FA de un usuario (JSON fallback)
 */
export async function updateUser2FA(
  email: string,
  data: { secreto2fa: string | null; activo2fa: boolean }
): Promise<boolean> {
  const pg = await checkPostgres();
  if (pg) {
    try {
      const { db } = await import('@/lib/db');
      const { usuarios } = await import('@/drizzle/schema');
      const { eq } = await import('drizzle-orm');
      await db
        .update(usuarios)
        .set({
          secreto2fa: data.secreto2fa,
          activo2fa: data.activo2fa,
          updatedAt: new Date(),
        })
        .where(eq(usuarios.email, email));
      return true;
    } catch {
      return false;
    }
  }

  // Fallback JSON
  const usuarios = readJSON<UsuarioData[]>(USUARIOS_FILE, []);
  const idx = usuarios.findIndex((u) => u.email === email);
  if (idx === -1) return false;

  usuarios[idx].secreto2fa = data.secreto2fa;
  usuarios[idx].activo2fa = data.activo2fa;
  usuarios[idx].updatedAt = new Date().toISOString();
  writeJSON(USUARIOS_FILE, usuarios);
  return true;
}

// ============================================================
// SEED DATA (para desarrollo)
// ============================================================

export async function seedDataIfEmpty(): Promise<boolean> {
  // Siempre asegurar que exista el admin
  await createAdminUserIfNotExists();

  const pg = await checkPostgres();
  if (pg) {
    // Con PostgreSQL, el seed se hace con el script de migraciones
    return false;
  }

  // Solo sembrar si no hay datos
  const conversaciones = readJSON<ConversacionData[]>(CONVERSACIONES_FILE, []);
  if (conversaciones.length > 0) return false;

  console.log('[DataStore] Sembrando datos de ejemplo...');

  // Crear pacientes más completos
  const pacientesData = [
    { telefono: '+5491155550101', nombre: 'Juan', apellido: 'Pérez', email: 'juan.perez@gmail.com', dni: '30.123.456', obraSocial: 'OSDE', numeroAfiliado: 'OS-12345', notasMedicas: 'Paciente hipertenso controlado', canalPreferido: 'whatsapp', consentimientoWhatsapp: true, fuente: 'whatsapp', tags: ['Obra Social', 'Crónico'] },
    { telefono: '+5491155550102', nombre: 'María', apellido: 'García', email: 'maria.garcia@hotmail.com', dni: '31.789.012', obraSocial: 'Particular', notasMedicas: '', canalPreferido: 'whatsapp', consentimientoWhatsapp: true, fuente: 'whatsapp', tags: ['Particular'] },
    { telefono: '+5491155550103', nombre: 'Pedro', apellido: 'Sánchez', email: 'pedro.sanchez@outlook.com', dni: '32.345.678', obraSocial: 'Swiss Medical', numeroAfiliado: 'SM-67890', notasMedicas: 'Diabetes tipo 2', canalPreferido: 'whatsapp', consentimientoWhatsapp: true, fuente: 'whatsapp', tags: ['Obra Social', 'Crónico'] },
    { telefono: '+5491155550104', nombre: 'Ana', apellido: 'López', email: 'ana.lopez@yahoo.com', dni: '33.901.234', obraSocial: 'Particular', notasMedicas: '', canalPreferido: 'email', consentimientoEmail: true, fuente: 'email', tags: ['Particular'] },
    { telefono: '+5491155550105', nombre: 'Carlos', apellido: 'Ruiz', email: 'carlos.ruiz@gmail.com', dni: '34.567.890', obraSocial: 'Galeno', numeroAfiliado: 'GA-24680', notasMedicas: 'Paciente nuevo', canalPreferido: 'whatsapp', consentimientoWhatsapp: true, fuente: 'whatsapp', tags: ['Nuevo'] },
    { telefono: '+5491155550106', nombre: 'Laura', apellido: 'Martínez', email: 'laura.martinez@gmail.com', dni: '35.111.222', obraSocial: 'Medicus', numeroAfiliado: 'ME-13579', notasMedicas: 'Alérgica a penicilina', canalPreferido: 'whatsapp', consentimientoWhatsapp: true, fuente: 'whatsapp', tags: ['Obra Social', 'Alergias'] },
    { telefono: '+5491155550107', nombre: 'Sofía', apellido: 'Herrera', email: 'sofia.herrera@gmail.com', dni: '36.333.444', obraSocial: 'Particular', notasMedicas: '', canalPreferido: 'whatsapp', consentimientoWhatsapp: true, fuente: 'whatsapp', tags: ['Particular'] },
    { telefono: '+5491155550108', nombre: 'Diego', apellido: 'Torres', email: 'diego.torres@gmail.com', dni: '37.555.666', obraSocial: 'OSDE', numeroAfiliado: 'OS-98765', notasMedicas: 'Lumbalgia crónica', canalPreferido: 'whatsapp', consentimientoWhatsapp: true, fuente: 'whatsapp', tags: ['Obra Social'] },
  ];

  const pacientesList: PacienteData[] = [];
  for (const p of pacientesData) {
    const creado = await createPaciente(p);
    pacientesList.push(creado);
  }

  // ============================================================
  // Conversaciones REALISTAS de WhatsApp
  // ============================================================
  const ahora = new Date();

  type MsgData = { rol: string; contenido: string; tiempo: number; intencion?: string };

  interface ConvSeedData {
    pacienteIdx: number;
    intencion: string;
    canal: string;
    mensajes: MsgData[];
  }

  const conversacionesData: ConvSeedData[] = [
    // 1. Confirmación de turno
    {
      pacienteIdx: 0, intencion: 'confirmacion', canal: 'whatsapp',
      mensajes: [
        { rol: 'paciente', contenido: 'Hola, quería confirmar mi turno para mañana', tiempo: -120 },
        { rol: 'asistente_ia', contenido: '👋 ¡Hola Juan! Te confirmo que tu turno con el Dr. Rodríguez sigue agendado para mañana a las 10:00 hs. ¿Confirmás asistencia?', tiempo: -119 },
        { rol: 'paciente', contenido: 'Sí, confirmado! Muchas gracias 😊', tiempo: -118, intencion: 'confirmacion' },
      ]
    },
    // 2. Consulta sobre resultados
    {
      pacienteIdx: 1, intencion: 'consulta', canal: 'whatsapp',
      mensajes: [
        { rol: 'paciente', contenido: 'Hola, quería saber si los resultados de los análisis ya están listos', tiempo: -200 },
        { rol: 'asistente_ia', contenido: '📋 ¡Hola María! Déjame consultar... Los resultados de tus análisis del martes ya están disponibles. ¿Te los envío por WhatsApp o preferís pasar a buscarlos por el consultorio?', tiempo: -199 },
        { rol: 'paciente', contenido: 'Mandamelos por acá nomas, gracias!', tiempo: -198, intencion: 'consulta' },
        { rol: 'asistente_ia', contenido: '✅ Te los envío en un momento. Por privacy, te paso los valores normales y los que están fuera de rango. Cualquier duda, el Dr. los puede ver con vos en tu próximo turno.', tiempo: -197 },
      ]
    },
    // 3. Cancelación + repogramación
    {
      pacienteIdx: 2, intencion: 'cancelacion', canal: 'whatsapp',
      mensajes: [
        { rol: 'paciente', contenido: 'Hola, necesito cancelar el turno del viernes, me surgió un imprevisto', tiempo: -300 },
        { rol: 'asistente_ia', contenido: '😔 Hola Pedro, lamento escuchar eso. Te cancelo el turno del viernes a las 15:30. ¿Querés que te agende un nuevo turno para la próxima semana?', tiempo: -299 },
        { rol: 'paciente', contenido: 'Si, por favor. ¿Hay disponible el martes a la mañana?', tiempo: -298, intencion: 'cancelacion' },
        { rol: 'asistente_ia', contenido: '📅 Martes a las 9:00, 9:30, 10:00 o 11:00. ¿Cuál te queda mejor?', tiempo: -297 },
        { rol: 'paciente', contenido: 'Martes 10:00 estaría perfecto. Gracias!', tiempo: -296 },
        { rol: 'asistente_ia', contenido: '✅ Confirmado: Martes 20/05 a las 10:00 hs con el Dr. Rodríguez. Te enviamos recordatorio 24hs antes. ¡Saludos!', tiempo: -295 },
      ]
    },
    // 4. Solicitud de receta
    {
      pacienteIdx: 3, intencion: 'receta', canal: 'whatsapp',
      mensajes: [
        { rol: 'paciente', contenido: 'Hola, necesito que me receten nuevamente el Losartán porque ya se me venció la receta anterior', tiempo: -400 },
        { rol: 'asistente_ia', contenido: '💊 Hola Ana! Te reviso la receta anterior... Ya le consulto al Dr. Rodríguez para la renovación. En un momento te confirmo.', tiempo: -399 },
        { rol: 'asistente_ia', contenido: '✅ El Dr. renovó tu receta de Losartán 50mg por 90 días. Te la envío por WhatsApp en PDF. Recordá que tenés que tomarlo todos los días a la misma hora. ¡Saludos!', tiempo: -398, intencion: 'receta' },
        { rol: 'paciente', contenido: 'Muchas gracias, ya la recibí! 😊', tiempo: -397 },
      ]
    },
    // 5. 🚨 URGENCIA - Dolor fuerte
    {
      pacienteIdx: 4, intencion: 'urgencia', canal: 'whatsapp',
      mensajes: [
        { rol: 'paciente', contenido: 'Doctor, tengo un dolor muy fuerte en el pecho desde hace una hora, no se me pasa con nada. ¿Qué hago?', tiempo: -60 },
        { rol: 'asistente_ia', contenido: '🚨 Carlos, esto puede ser una emergencia. Por favor, dirigite a la guardia del hospital más cercano AHORA o llamá al 107 (emergencias). Ya le notificamos al Dr. Rodríguez para que se comunique con vos. NO TE QUEDES SOLO.', tiempo: -59, intencion: 'urgencia' },
      ]
    },
    // 6. Nuevo turno
    {
      pacienteIdx: 5, intencion: 'turno_nuevo', canal: 'whatsapp',
      mensajes: [
        { rol: 'paciente', contenido: 'Hola, quería sacar un turno para hacerme un control general', tiempo: -500 },
        { rol: 'asistente_ia', contenido: '👋 ¡Hola Laura! Te puedo ayudar con eso. ¿Tenés preferencia por algún día u horario? Trabajamos de lunes a viernes de 9 a 18 hs.', tiempo: -499 },
        { rol: 'paciente', contenido: 'Los jueves a la tarde me viene bien', tiempo: -498 },
        { rol: 'asistente_ia', contenido: '📅 Tenemos disponible jueves a las 14:00, 15:00, 16:00 y 17:00 con el Dr. Rodríguez. ¿Cuál preferís?', tiempo: -497 },
        { rol: 'paciente', contenido: 'A las 16 está perfecto!', tiempo: -496, intencion: 'turno_nuevo' },
        { rol: 'asistente_ia', contenido: '✅ Turno confirmado: Jueves 22/05 a las 16:00 hs con el Dr. Rodríguez. Te enviamos recordatorio 24hs antes. ¡Gracias Laura! 🎉', tiempo: -495 },
      ]
    },
    // 7. Consulta general + horarios
    {
      pacienteIdx: 6, intencion: 'consulta', canal: 'whatsapp',
      mensajes: [
        { rol: 'paciente', contenido: 'Buenos días, quería saber a partir de qué hora atiende el Dr. García los sábados', tiempo: -700 },
        { rol: 'asistente_ia', contenido: '🌅 ¡Buenos días Sofía! Los sábados atendemos de 9:00 a 13:00 hs con el Dr. García. ¿Querés que te agende un turno?', tiempo: -699 },
        { rol: 'paciente', contenido: 'Dale, para el sábado que viene a las 10:30 si se puede', tiempo: -698, intencion: 'consulta' },
        { rol: 'asistente_ia', contenido: '✅ Listo Sofía! Te agendé para el sábado 24/05 a las 10:30 con el Dr. García. Te enviaré un recordatorio. ¡Saludos! 😊', tiempo: -697 },
      ]
    },
    // 8. Recién llegado - primera interacción (con emojis y respuesta de IA)
    {
      pacienteIdx: 7, intencion: 'saludo', canal: 'whatsapp',
      mensajes: [
        { rol: 'paciente', contenido: 'Hola! 👋', tiempo: -50 },
        { rol: 'asistente_ia', contenido: '👋 ¡Hola Diego! Bienvenido al consultorio del Dr. Rodríguez. ¿En qué puedo ayudarte? Podés sacar un turno, consultar por resultados, pedir una receta o lo que necesites.', tiempo: -49, intencion: 'saludo' },
        { rol: 'paciente', contenido: 'Gracias! Quería saber cómo hago para pedir un turno por primera vez', tiempo: -48 },
        { rol: 'asistente_ia', contenido: '📋 ¡Es muy fácil! Decime qué día y horario te viene bien y te lo agendo. Atendemos de lunes a viernes de 9 a 18 hs y sábados de 9 a 13 hs. También necesito saber si tenés obra social o sos particular.', tiempo: -47 },
      ]
    },
  ];

  for (const cd of conversacionesData) {
    const paciente = pacientesList[cd.pacienteIdx];
    const primerMensaje = cd.mensajes[0];
    const fechaCreacion = new Date(ahora.getTime() + primerMensaje.tiempo * 60000);

    // Crear conversación con fecha personalizada
    const convId = crypto.randomUUID();
    const conv: ConversacionData = {
      id: convId,
      pacienteId: paciente.id,
      canal: cd.canal,
      estado: 'activa',
      optOut: false,
      ultimoMensaje: cd.mensajes[cd.mensajes.length - 1].contenido,
      ultimoMensajeRol: cd.mensajes[cd.mensajes.length - 1].rol,
      ultimaIntencion: cd.intencion,
      ultimaInteraccion: new Date(ahora.getTime() + cd.mensajes[cd.mensajes.length - 1].tiempo * 60000).toISOString(),
      contextoIa: {},
      metadata: {},
      createdAt: fechaCreacion.toISOString(),
      updatedAt: new Date(ahora.getTime() + cd.mensajes[cd.mensajes.length - 1].tiempo * 60000).toISOString(),
    };

    // Guardar conversación
    const convs = readJSON<ConversacionData[]>(CONVERSACIONES_FILE, []);
    convs.push(conv);
    writeJSON(CONVERSACIONES_FILE, convs);

    // Crear mensajes
    for (const m of cd.mensajes) {
      const msg: MensajeData = {
        id: crypto.randomUUID(),
        conversacionId: convId,
        rol: m.rol,
        contenido: m.contenido,
        tipo: 'texto',
        intencion: m.intencion,
        metadata: {},
        createdAt: new Date(ahora.getTime() + m.tiempo * 60000).toISOString(),
      };
      const msgs = readJSON<MensajeData[]>(MENSAJES_FILE, []);
      msgs.push(msg);
      writeJSON(MENSAJES_FILE, msgs);
    }
  }

  console.log('[DataStore] ✅ Datos de ejemplo sembrados correctamente');
  console.log(`  - ${pacientesList.length} pacientes`);
  console.log(`  - ${conversacionesData.length} conversaciones con mensajes realistas`);
  return true;
}
