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
  consentimientoWhatsapp: boolean;
  consentimientoEmail: boolean;
  fuente: string;
  tags: string[];
  metadata: Record<string, unknown>;
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
  ultimoAcceso?: string;
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
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
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

    const conditions = [];
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
  let conversaciones = readJSON<ConversacionData[]>('conversaciones', []);
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

  // Adjuntar datos del paciente
  return conversaciones.map((c) => ({
    ...c,
    paciente: pacientes.find((p) => p.id === c.pacienteId) ? {
      nombre: pacientes.find((p) => p.id === c.pacienteId)!.nombre,
      apellido: pacientes.find((p) => p.id === c.pacienteId)!.apellido,
      telefono: pacientes.find((p) => p.id === c.pacienteId)!.telefono,
    } : undefined,
  }));
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
    // En producción se crea con el seed SQL
    return false;
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

  // Crear pacientes
  const pacientesData = [
    { telefono: '+5491155550101', nombre: 'Juan', apellido: 'Pérez', canalPreferido: 'whatsapp', consentimientoWhatsapp: true, fuente: 'whatsapp', tags: [], metadata: {} as Record<string, unknown> },
    { telefono: '+5491155550102', nombre: 'María', apellido: 'García', canalPreferido: 'whatsapp', consentimientoWhatsapp: true, fuente: 'whatsapp', tags: [], metadata: {} as Record<string, unknown> },
    { telefono: '+5491155550103', nombre: 'Pedro', apellido: 'Sánchez', canalPreferido: 'whatsapp', consentimientoWhatsapp: true, fuente: 'whatsapp', tags: [], metadata: {} as Record<string, unknown> },
    { telefono: '+5491155550104', nombre: 'Ana', apellido: 'López', canalPreferido: 'email', consentimientoEmail: true, fuente: 'email', tags: [], metadata: {} as Record<string, unknown> },
    { telefono: '+5491155550105', nombre: 'Carlos', apellido: 'Ruiz', canalPreferido: 'whatsapp', consentimientoWhatsapp: true, fuente: 'whatsapp', tags: [], metadata: {} as Record<string, unknown> },
    { telefono: '+5491155550106', nombre: 'Laura', apellido: 'Martínez', canalPreferido: 'whatsapp', consentimientoWhatsapp: true, fuente: 'whatsapp', tags: [], metadata: {} as Record<string, unknown> },
  ];

  const pacientesList: PacienteData[] = [];
  for (const p of pacientesData) {
    const creado = await createPaciente(p as any);
    pacientesList.push(creado);
  }

  // Crear conversaciones y mensajes
  const ahora = new Date();
  const conversacionesData = [
    {
      pacienteIdx: 0, intencion: 'confirmacion', canal: 'whatsapp',
      mensajes: [
        { rol: 'paciente', contenido: 'Hola, quería confirmar mi turno para mañana', tiempo: -120 },
        { rol: 'asistente_ia', contenido: '¡Hola Juan! Te confirmo que tu turno con el Dr. Rodríguez sigue agendado para mañana a las 10:00. ¿Te confirmo asistencia?', tiempo: -119 },
        { rol: 'paciente', contenido: 'Perfecto doctor, entonces confirmo el turno para mañana a las 10', tiempo: -118 },
      ]
    },
    {
      pacienteIdx: 1, intencion: 'consulta', canal: 'whatsapp',
      mensajes: [
        { rol: 'paciente', contenido: 'Hola, quería saber si los resultados de los análisis ya están listos', tiempo: -200 },
        { rol: 'asistente_ia', contenido: 'Hola María! Déjame consultar... Los resultados de tus análisis del martes ya están disponibles. ¿Querés que te los envíe por WhatsApp o preferís pasar a buscarlos?', tiempo: -199 },
      ]
    },
    {
      pacienteIdx: 2, intencion: 'cancelacion', canal: 'whatsapp',
      mensajes: [
        { rol: 'paciente', contenido: 'Hola, necesito cancelar el turno del viernes, me surgió un imprevisto', tiempo: -300 },
        { rol: 'asistente_ia', contenido: 'Hola Pedro, lamento escuchar eso. Te cancelo el turno del viernes a las 15:30. ¿Querés que te agende un nuevo turno para la próxima semana?', tiempo: -299 },
        { rol: 'paciente', contenido: 'Si, por favor. ¿Hay disponible el martes a la mañana?', tiempo: -298 },
      ]
    },
    {
      pacienteIdx: 3, intencion: 'receta', canal: 'email',
      mensajes: [
        { rol: 'paciente', contenido: 'Gracias por la receta, ya la recibí por WhatsApp', tiempo: -400 },
        { rol: 'asistente_ia', contenido: '¡De nada Ana! Recordá que la receta tiene validez por 30 días. Cualquier duda estamos a tu disposición.', tiempo: -399 },
      ]
    },
  ];

  for (const cd of conversacionesData) {
    const paciente = pacientesList[cd.pacienteIdx];
    const primerMensaje = cd.mensajes[0];
    const conv = await createConversacion({
      pacienteId: paciente.id,
      canal: cd.canal,
      mensajeInicial: primerMensaje.contenido,
      rolMensajeInicial: primerMensaje.rol,
      intencionInicial: cd.intencion,
    });

    // Crear mensajes restantes
    for (let i = 1; i < cd.mensajes.length; i++) {
      const m = cd.mensajes[i];
      await createMensaje({
        conversacionId: conv.id,
        rol: m.rol,
        contenido: m.contenido,
        intencion: i === cd.mensajes.length - 1 ? cd.intencion : undefined,
      });
    }
  }

  console.log('[DataStore] ✅ Datos de ejemplo sembrados correctamente');
  return true;
}
