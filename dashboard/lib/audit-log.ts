// ============================================================
// Auditoría de accesos a datos médicos
// ============================================================

import fs from 'fs';
import path from 'path';
import { sql } from 'drizzle-orm';

const AUDIT_DIR = path.join(process.cwd(), '.data');
const AUDIT_FILE = path.join(AUDIT_DIR, 'auditoria.json');

export interface AuditEntry {
  id: string;
  usuarioId?: string;
  usuarioEmail?: string;
  usuarioNombre?: string;
  accion: AccionAudit;
  entidad: EntidadAudit;
  entidadId?: string;
  detalle?: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

export type AccionAudit = 'login' | 'logout' | 'view' | 'create' | 'edit' | 'delete' | 'export' | 'config';
export type EntidadAudit = 'paciente' | 'turno' | 'conversacion' | 'mensaje' | 'receta' | 'credencial' | 'usuario' | 'reporte' | 'historial_medico' | 'configuracion';

/**
 * Registra un evento de auditoría
 */
export async function logAudit(entry: {
  usuarioId?: string;
  usuarioEmail?: string;
  usuarioNombre?: string;
  accion: AccionAudit;
  entidad: EntidadAudit;
  entidadId?: string;
  detalle?: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  // Intentar guardar en PostgreSQL
  try {
    const { db } = await import('@/lib/db');
    const { auditoriaAccesos } = await import('@/drizzle/schema');
    await db.insert(auditoriaAccesos).values({
      usuarioId: entry.usuarioId,
      usuarioEmail: entry.usuarioEmail,
      usuarioNombre: entry.usuarioNombre,
      accion: entry.accion,
      entidad: entry.entidad,
      entidadId: entry.entidadId,
      detalle: entry.detalle,
      ip: entry.ip,
      userAgent: entry.userAgent,
    });
    return;
  } catch {
    // Fallback a JSON
  }

  // Fallback JSON
  try {
    if (!fs.existsSync(AUDIT_DIR)) {
      fs.mkdirSync(AUDIT_DIR, { recursive: true });
    }

    let logs: AuditEntry[] = [];
    try {
      const raw = fs.readFileSync(AUDIT_FILE, 'utf-8');
      logs = JSON.parse(raw);
    } catch {
      logs = [];
    }

    const auditEntry: AuditEntry = {
      id: crypto.randomUUID(),
      ...entry,
      createdAt: new Date().toISOString(),
    };

    logs.push(auditEntry);

    // Mantener máximo 10,000 registros
    if (logs.length > 10_000) {
      logs = logs.slice(-10_000);
    }

    fs.writeFileSync(AUDIT_FILE, JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error('[AuditLog] Error al guardar:', err);
  }
}

/**
 * Obtiene los logs de auditoría, con opciones de filtro
 */
export async function getAuditLogs(options?: {
  limit?: number;
  offset?: number;
  entidad?: EntidadAudit;
  accion?: AccionAudit;
  usuarioId?: string;
}): Promise<{ logs: AuditEntry[]; total: number }> {
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  // Intentar desde PostgreSQL
  try {
    const { db } = await import('@/lib/db');
    const { auditoriaAccesos } = await import('@/drizzle/schema');
    const { desc, eq, and } = await import('drizzle-orm');

    const conditions: any[] = [];
    if (options?.entidad) conditions.push(eq(auditoriaAccesos.entidad, options.entidad));
    if (options?.accion) conditions.push(eq(auditoriaAccesos.accion, options.accion));
    if (options?.usuarioId) conditions.push(eq(auditoriaAccesos.usuarioId, options.usuarioId));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db
      .select()
      .from(auditoriaAccesos)
      .where(where)
      .orderBy(desc(auditoriaAccesos.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditoriaAccesos)
      .where(where);

    return {
      logs: result.map(r => ({
        id: r.id,
        usuarioId: r.usuarioId || undefined,
        usuarioEmail: r.usuarioEmail || undefined,
        usuarioNombre: r.usuarioNombre || undefined,
        accion: r.accion as AccionAudit,
        entidad: r.entidad as EntidadAudit,
        entidadId: r.entidadId || undefined,
        detalle: r.detalle || undefined,
        ip: r.ip || undefined,
        userAgent: r.userAgent || undefined,
        createdAt: r.createdAt.toISOString(),
      })),
      total: Number(totalResult[0]?.count) || 0,
    };
  } catch {
    // Fallback a JSON
  }

  // Fallback JSON
  try {
    if (!fs.existsSync(AUDIT_DIR)) {
      return { logs: [], total: 0 };
    }
    const raw = fs.readFileSync(AUDIT_FILE, 'utf-8');
    let logs: AuditEntry[] = JSON.parse(raw);

    // Aplicar filtros
    if (options?.entidad) logs = logs.filter(l => l.entidad === options.entidad);
    if (options?.accion) logs = logs.filter(l => l.accion === options.accion);
    if (options?.usuarioId) logs = logs.filter(l => l.usuarioId === options.usuarioId);

    // Ordenar descendente por fecha
    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = logs.length;
    logs = logs.slice(offset, offset + limit);

    return { logs, total };
  } catch {
    return { logs: [], total: 0 };
  }
}
