import { createHash, randomUUID } from 'crypto';
import { eq, and, or, inArray, isNull, gte, lt, count, desc } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { recetas, pacientes, medicos, recetaEstadoEnum } from '@/drizzle/schema';
import { db } from '@/lib/db';
import { escapeHtml } from '@/lib/html-utils';
import { safeWarn } from '@/lib/logger';
import { mapEstadoDisplay, ESTADO_DISPLAY_LABELS, getHoyISO } from '@/lib/receta-utils';
import type { EstadoReceta } from '@/lib/receta-utils';

export type { EstadoReceta } from '@/lib/receta-utils';

// ─── Tipos ─────────────────────────────────────────────────

export interface CreateRecetaInput {
  pacienteId: string;
  medicamento: string;
  dosis: string;
  frecuencia?: string | null;
  duracion?: string | null;
  indicaciones?: string | null;
  medicoId?: string | null;
  presentacion?: string | null;
  cantidadTotal?: string | null;
}

export interface UpdateRecetaInput {
  estado?: EstadoReceta;
  medicamento?: string;
  dosis?: string;
  frecuencia?: string | null;
  duracion?: string | null;
  indicaciones?: string | null;
  presentacion?: string | null;
  cantidadTotal?: string | null;
}

export interface RecetaItem {
  id: string;
  pacienteId: string;
  paciente: string;
  medicamento: string;
  dosis: string;
  duracion: string;
  estado: EstadoReceta;
  indicaciones?: string;
  vence: string;
  fechaCreacion: string;
  renovable: boolean;
  hashVerificacion?: string | null;
}

export interface RecetaListResult {
  data: RecetaItem[];
  total: number;
  activas: number;
  vencidas: number;
  historial: number;
}

// ─── Constantes ─────────────────────────────────────────────

/** Estados de la BD considerados "activos" (vigentes). */
type EstadoRecetaDb = (typeof recetaEstadoEnum.enumValues)[number] | 'activa' | 'vencida';

const ESTADOS_ACTIVOS_DB: EstadoRecetaDb[] = ['borrador', 'emitida', 'entregada', 'activa'];
const ESTADOS_HISTORIAL_DB: EstadoRecetaDb[] = ['anulada', 'renovada', 'historial'];

/**
 * Mapea un estado de visualización de vuelta al enum de la BD.
 * @param estado
 */
function estadoDisplayToDb(estado: EstadoReceta): EstadoRecetaDb {
  if (estado === 'historial') return 'historial';
  if (estado === 'vencida') return 'expirada';
  return 'emitida';
}

/**
 * Construye el filtro SQL para un estado de visualización
 * (sin casteos a enum: usa los valores reales de receta_estado).
 * @param scope
 * @param estadoFiltro
 */
function buildEstadoWhere(scope: SQL | undefined, estadoFiltro?: EstadoReceta): SQL | undefined {
  if (!estadoFiltro) return scope;
  const hoy = getHoyISO();

  if (estadoFiltro === 'activa') {
    return and(
      scope,
      inArray(recetas.estado, ESTADOS_ACTIVOS_DB),
      or(isNull(recetas.fechaFin), gte(recetas.fechaFin, hoy)),
    );
  }

  if (estadoFiltro === 'vencida') {
    return and(
      scope,
      or(
        eq(recetas.estado, 'expirada'),
        eq(recetas.estado, 'vencida'),
        and(inArray(recetas.estado, ESTADOS_ACTIVOS_DB), lt(recetas.fechaFin, hoy)),
      ),
    );
  }

  return and(scope, inArray(recetas.estado, ESTADOS_HISTORIAL_DB));
}

function getRecetaSecret(): string {
  const s = process.env.RECETA_HASH_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RECETA_HASH_SECRET es obligatorio en producción');
    }
    safeWarn('[Recetas] RECETA_HASH_SECRET no configurado — usando fallback de desarrollo');
    return 'dev-fallback-not-for-production-receta';
  }
  return s;
}

// ─── Hash de verificación ───────────────────────────────────

/**
 * Genera un hash SHA-256 único para la receta.
 * Se usa como firma digital verificable vía QR.
 * @param params
 * @param params.id
 * @param params.pacienteId
 * @param params.medicamento
 * @param params.dosis
 * @param params.fechaInicio
 */
export function generarHashVerificacion(params: {
  id: string;
  pacienteId: string;
  medicamento: string;
  dosis: string;
  fechaInicio: string;
}): string {
  const payload = [
    params.id,
    params.pacienteId,
    params.medicamento.trim().toLowerCase(),
    params.dosis.trim().toLowerCase(),
    params.fechaInicio,
    getRecetaSecret(),
  ].join('||');
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Verifica que el hash de una receta sea válido.
 * @param receta
 * @param receta.id
 * @param receta.pacienteId
 * @param receta.medicamento
 * @param receta.dosis
 * @param receta.fechaInicio
 * @param receta.hashVerificacion
 */
export function verificarHash(receta: {
  id: string;
  pacienteId: string;
  medicamento: string;
  dosis: string;
  fechaInicio: string;
  hashVerificacion?: string | null;
}): { valido: boolean; regenerado?: string } {
  const hashEsperado = generarHashVerificacion({
    id: receta.id,
    pacienteId: receta.pacienteId,
    medicamento: receta.medicamento,
    dosis: receta.dosis,
    fechaInicio: receta.fechaInicio,
  });

  if (!receta.hashVerificacion) {
    return { valido: false, regenerado: hashEsperado };
  }

  return {
    valido: receta.hashVerificacion === hashEsperado,
    regenerado: hashEsperado,
  };
}

// ─── CRUD ───────────────────────────────────────────────────

/**
 * Lista recetas con filtros y estadísticas.
 * @param params
 * @param params.estado Estado de visualización ('activa'|'vencida'|'historial').
 * @param params.limit
 * @param params.offset
 * @param params.medicoId
 * @param params.pacienteId Filtra por paciente (opcional).
 */
export async function listarRecetas(params: {
  estado?: EstadoReceta;
  limit?: number;
  offset?: number;
  medicoId?: string | null;
  pacienteId?: string | null;
}): Promise<RecetaListResult> {
  const { estado, limit = 100, offset = 0, medicoId, pacienteId } = params;

  const scope = and(
    medicoId ? eq(recetas.medicoId, medicoId) : undefined,
    pacienteId ? eq(recetas.pacienteId, pacienteId) : undefined,
  );

  const whereBase = (estadoFiltro?: EstadoReceta) => buildEstadoWhere(scope, estadoFiltro);
  const whereList = whereBase(estado);

  const [activas, vencidas, historial, total] = await Promise.all([
    db.select({ count: count() }).from(recetas).where(whereBase('activa')),
    db.select({ count: count() }).from(recetas).where(whereBase('vencida')),
    db.select({ count: count() }).from(recetas).where(whereBase('historial')),
    db.select({ count: count() }).from(recetas).where(whereList),
  ]);

  const lista = await db
    .select({
      id: recetas.id,
      pacienteId: recetas.pacienteId,
      pacienteNombre: pacientes.nombre,
      pacienteApellido: pacientes.apellido,
      estado: recetas.estado,
      medicamento: recetas.medicamento,
      dosis: recetas.dosis,
      frecuencia: recetas.frecuencia,
      duracion: recetas.duracion,
      indicaciones: recetas.indicaciones,
      fechaInicio: recetas.fechaInicio,
      fechaFin: recetas.fechaFin,
      createdAt: recetas.createdAt,
      hashVerificacion: recetas.hashVerificacion,
    })
    .from(recetas)
    .leftJoin(pacientes, eq(recetas.pacienteId, pacientes.id))
    .where(whereList)
    .orderBy(desc(recetas.createdAt))
    .limit(limit)
    .offset(offset);

  const data: RecetaItem[] = lista.map((r) => {
    const estado = mapEstadoDisplay(r.estado, r.fechaFin);
    return {
      id: r.id,
      pacienteId: r.pacienteId,
      paciente: `${r.pacienteNombre || ''} ${r.pacienteApellido || ''}`.trim() || 'Paciente',
      medicamento: r.medicamento,
      dosis: r.dosis,
      duracion: r.duracion || r.frecuencia,
      estado,
      indicaciones: r.indicaciones || undefined,
      vence: r.fechaFin || r.fechaInicio,
      fechaCreacion: r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '',
      renovable: estado !== 'historial',
      hashVerificacion: r.hashVerificacion,
    };
  });

  return {
    data,
    total: Number(total[0]?.count ?? 0),
    activas: Number(activas[0]?.count ?? 0),
    vencidas: Number(vencidas[0]?.count ?? 0),
    historial: Number(historial[0]?.count ?? 0),
  };
}

/**
 * Obtiene una receta por ID (con datos completos).
 * @param id
 */
export async function obtenerReceta(id: string) {
  const [receta] = await db
    .select({
      id: recetas.id,
      pacienteId: recetas.pacienteId,
      medicoId: recetas.medicoId,
      turnoId: recetas.turnoId,
      estado: recetas.estado,
      medicamento: recetas.medicamento,
      presentacion: recetas.presentacion,
      dosis: recetas.dosis,
      frecuencia: recetas.frecuencia,
      duracion: recetas.duracion,
      cantidadTotal: recetas.cantidadTotal,
      indicaciones: recetas.indicaciones,
      fechaInicio: recetas.fechaInicio,
      fechaFin: recetas.fechaFin,
      requiereAutorizacion: recetas.requiereAutorizacion,
      autorizacionObraSocial: recetas.autorizacionObraSocial,
      recetaAnteriorId: recetas.recetaAnteriorId,
      hashVerificacion: recetas.hashVerificacion,
      createdAt: recetas.createdAt,
      updatedAt: recetas.updatedAt,
      pacienteNombre: pacientes.nombre,
      pacienteApellido: pacientes.apellido,
      medicoNombre: medicos.nombre,
    })
    .from(recetas)
    .leftJoin(pacientes, eq(recetas.pacienteId, pacientes.id))
    .leftJoin(medicos, eq(recetas.medicoId, medicos.id))
    .where(eq(recetas.id, id))
    .limit(1);

  return receta || null;
}

/**
 * Crea una nueva receta con hash de verificación.
 * @param input
 */
export async function crearReceta(input: CreateRecetaInput) {
  if (!input.medicoId) {
    throw new Error('Se requiere un médico para crear la receta');
  }

  const fechaInicio = getHoyISO();
  const fechaFin = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  // Generar UUID antes de insertar para calcular el hash en la misma operación
  const id = randomUUID();

  const hash = generarHashVerificacion({
    id,
    pacienteId: input.pacienteId,
    medicamento: input.medicamento.trim(),
    dosis: input.dosis.trim(),
    fechaInicio,
  });

  const [nueva] = await db
    .insert(recetas)
    .values({
      pacienteId: input.pacienteId,
      medicoId: input.medicoId,
      medicamento: input.medicamento.trim(),
      presentacion: input.presentacion?.trim() || null,
      dosis: input.dosis.trim(),
      frecuencia: input.frecuencia?.trim() || input.duracion?.trim() || 'Según indicación',
      duracion: input.duracion?.trim() || null,
      cantidadTotal: input.cantidadTotal?.trim() || null,
      indicaciones: input.indicaciones?.trim() || null,
      fechaInicio,
      fechaFin,
      estado: recetaEstadoEnum.enumValues[1], // 'emitida'
      hashVerificacion: hash,
    })
    .returning();

  return nueva;
}

/**
 * Renueva una receta: marca la anterior como 'renovada'
 * y crea una nueva con la misma prescripción y +30 días.
 * @param id
 * @param medicoId
 */
export async function renovarReceta(id: string, medicoId?: string | null) {
  const actual = await obtenerReceta(id);
  if (!actual) {
    throw new Error('Receta no encontrada');
  }
  if (['anulada', 'renovada', 'historial'].includes(actual.estado)) {
    throw new Error(`No se puede renovar una receta en estado "${actual.estado}"`);
  }

  const fechaInicio = getHoyISO();
  const fechaFin = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const nuevaId = randomUUID();

  const hash = generarHashVerificacion({
    id: nuevaId,
    pacienteId: actual.pacienteId,
    medicamento: actual.medicamento,
    dosis: actual.dosis,
    fechaInicio,
  });

  const [nueva] = await db.transaction(async (tx) => {
    await tx
      .update(recetas)
      .set({ estado: 'renovada', updatedAt: new Date() })
      .where(eq(recetas.id, id));

    return tx
      .insert(recetas)
      .values({
        pacienteId: actual.pacienteId,
        medicoId: medicoId ?? actual.medicoId,
        turnoId: actual.turnoId,
        medicamento: actual.medicamento,
        presentacion: actual.presentacion,
        dosis: actual.dosis,
        frecuencia: actual.frecuencia,
        duracion: actual.duracion,
        cantidadTotal: actual.cantidadTotal,
        indicaciones: actual.indicaciones,
        fechaInicio,
        fechaFin,
        estado: recetaEstadoEnum.enumValues[1], // 'emitida'
        recetaAnteriorId: actual.id,
        hashVerificacion: hash,
      })
      .returning();
  });

  return nueva;
}

/**
 * Actualiza una receta (regenera hash si cambian datos sensibles).
 * @param id
 * @param input
 */
export async function actualizarReceta(id: string, input: UpdateRecetaInput) {
  const camposSensibles = ['medicamento', 'dosis', 'pacienteId', 'fechaInicio'];
  const tieneCambioSensible = camposSensibles.some((k) => k in input);

  const updateData: Record<string, unknown> = {
    ...input,
    updatedAt: new Date(),
  };

  // Mapear estado de visualización al enum real de la BD
  if (input.estado) {
    updateData.estado = estadoDisplayToDb(input.estado);
  }

  // Si se "reactiva", renovar fechas
  if (input.estado === 'activa') {
    updateData.fechaInicio = getHoyISO();
    updateData.fechaFin = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  }

  const [actualizada] = await db
    .update(recetas)
    .set(updateData)
    .where(eq(recetas.id, id))
    .returning();

  // Regenerar hash si cambió algo sensible
  if (tieneCambioSensible) {
    const hash = generarHashVerificacion({
      id: actualizada.id,
      pacienteId: actualizada.pacienteId,
      medicamento: actualizada.medicamento,
      dosis: actualizada.dosis,
      fechaInicio: actualizada.fechaInicio,
    });

    const [conHash] = await db
      .update(recetas)
      .set({ hashVerificacion: hash })
      .where(eq(recetas.id, id))
      .returning();

    return conHash;
  }

  return actualizada;
}

// ─── Exportación ────────────────────────────────────────────

export interface RecetaExportRow {
  Paciente: string;
  Medicamento: string;
  Presentacion: string;
  Dosis: string;
  Frecuencia: string;
  Duracion: string;
  Cantidad: string;
  Indicaciones: string;
  Estado: string;
  'Fecha Inicio': string;
  'Fecha Fin': string;
  'Fecha Creación': string;
  'Código Verificación': string;
}

/**
 * Prepara datos planos para exportación.
 * @param params
 * @param params.estado
 * @param params.medicoId
 * @param params.pacienteId
 */
export async function getRecetasForExport(params: {
  estado?: EstadoReceta;
  medicoId?: string | null;
  pacienteId?: string | null;
}): Promise<RecetaExportRow[]> {
  const { estado, medicoId, pacienteId } = params;

  const scope = and(
    medicoId ? eq(recetas.medicoId, medicoId) : undefined,
    pacienteId ? eq(recetas.pacienteId, pacienteId) : undefined,
  );

  const rows = await db
    .select({
      id: recetas.id,
      pacienteNombre: pacientes.nombre,
      pacienteApellido: pacientes.apellido,
      medicamento: recetas.medicamento,
      presentacion: recetas.presentacion,
      dosis: recetas.dosis,
      frecuencia: recetas.frecuencia,
      duracion: recetas.duracion,
      cantidadTotal: recetas.cantidadTotal,
      indicaciones: recetas.indicaciones,
      estado: recetas.estado,
      fechaInicio: recetas.fechaInicio,
      fechaFin: recetas.fechaFin,
      createdAt: recetas.createdAt,
      hashVerificacion: recetas.hashVerificacion,
    })
    .from(recetas)
    .leftJoin(pacientes, eq(recetas.pacienteId, pacientes.id))
    .where(buildEstadoWhere(scope, estado))
    .orderBy(desc(recetas.createdAt));

  return rows.map((r) => ({
    Paciente: `${r.pacienteNombre || ''} ${r.pacienteApellido || ''}`.trim() || '—',
    Medicamento: r.medicamento,
    Presentacion: r.presentacion || '—',
    Dosis: r.dosis,
    Frecuencia: r.frecuencia || '—',
    Duracion: r.duracion || '—',
    Cantidad: r.cantidadTotal || '—',
    Indicaciones: r.indicaciones || '—',
    Estado: ESTADO_DISPLAY_LABELS[mapEstadoDisplay(r.estado, r.fechaFin)],
    'Fecha Inicio': r.fechaInicio,
    'Fecha Fin': r.fechaFin || '—',
    'Fecha Creación': r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '—',
    'Código Verificación': r.hashVerificacion ? `${r.hashVerificacion.substring(0, 12)}...` : '—',
  }));
}

/**
 * Genera buffer Excel (.xlsx) desde datos exportables.
 * @param data
 */
export function generarExcelRecetas(data: RecetaExportRow[]): Buffer {
  // Usamos require para evitar problemas de tipos con xlsx
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const XLSX = require('xlsx');

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Ajustar ancho de columnas
  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch:
      Math.max(key.length, ...data.map((r) => String(r[key as keyof typeof r] ?? '').length)) + 2,
  }));
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Recetas');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/**
 * Genera HTML formateado para exportación PDF (imprimible).
 * @param data
 * @param titulo
 */
export function generarHTMLRecetasPDF(data: RecetaExportRow[], titulo?: string): string {
  const nombreOrg = process.env.ORGANIZATION_NAME || 'Consultorio Médico';
  const fecha = new Date().toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const filas = data
    .map(
      (r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(r.Paciente)}</td>
      <td><strong>${escapeHtml(r.Medicamento)}</strong></td>
      <td>${escapeHtml(r.Dosis)}</td>
      <td>${escapeHtml(r.Estado)}</td>
      <td>${escapeHtml(r['Fecha Inicio'])}</td>
      <td>${escapeHtml(r['Fecha Fin'])}</td>
    </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${titulo || 'Recetas'} - ${nombreOrg}</title>
<style>
  @page { margin: 20mm; size: A4 landscape; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Arial', sans-serif; color: #1a1a1a; font-size: 11px; }
  .header { text-align: center; padding-bottom: 15px; border-bottom: 2px solid #2563eb; margin-bottom: 20px; }
  .header h1 { font-size: 22px; color: #2563eb; margin-bottom: 4px; }
  .header p { font-size: 12px; color: #666; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #2563eb; color: white; padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
  td { padding: 6px; border-bottom: 1px solid #e5e5e5; }
  tr:nth-child(even) { background: #f9fafb; }
  .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; font-size: 10px; color: #999; }
  .print-btn { text-align: center; margin-top: 20px; }
  .print-btn button { padding: 10px 30px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <h1>${nombreOrg}</h1>
    <p>${titulo || 'Reporte de Recetas'} — ${fecha}</p>
    <p>Total: ${data.length} recetas</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Paciente</th>
        <th>Medicamento</th>
        <th>Dosis</th>
        <th>Estado</th>
        <th>Inicio</th>
        <th>Vence</th>
      </tr>
    </thead>
    <tbody>
      ${filas}
    </tbody>
  </table>
  <div class="footer">
    <strong>${nombreOrg}</strong> &nbsp;·&nbsp; Documento generado el ${fecha}
  </div>
  <div class="print-btn">
    <button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
    <p style="font-size:11px;color:#888;margin-top:6px;">Seleccioná "Guardar como PDF" en el diálogo de impresión</p>
  </div>
</body>
</html>`;
}

/**
 * Genera datos de pacientes para exportación.
 */
interface PacienteExportSource {
  nombre: string;
  apellido: string;
  telefono?: string | null;
  email?: string | null;
  obraSocial?: string | null;
  tags?: string[] | null;
  ultimoTurno?: string | Date | null;
  totalTurnos?: number | null;
}

/**
 *
 * @param params
 * @param params.search
 * @param params.medicoId
 * @param params.sucursalId
 */
export async function getPacientesForExport(params: {
  search?: string;
  medicoId?: string | null;
  sucursalId?: string | null;
}) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { pacientesService } = require('./pacientes');
  const result = await pacientesService.list(
    params.search,
    10000,
    0,
    params.sucursalId,
    params.medicoId,
  );

  return result.data.map((p: PacienteExportSource) => ({
    Nombre: `${p.nombre} ${p.apellido}`,
    Teléfono: p.telefono || '—',
    Email: p.email || '—',
    'Obra Social': p.obraSocial || '—',
    Tags: Array.isArray(p.tags) ? p.tags.join(', ') : '—',
    'Último Turno': p.ultimoTurno ? new Date(p.ultimoTurno).toISOString().split('T')[0] : '—',
    'Total Turnos': p.totalTurnos ?? 0,
  }));
}

export const recetasService = {
  listar: listarRecetas,
  obtener: obtenerReceta,
  crear: crearReceta,
  renovar: renovarReceta,
  actualizar: actualizarReceta,
  generarHash: generarHashVerificacion,
  verificarHash,
  getForExport: getRecetasForExport,
  generarExcel: generarExcelRecetas,
  generarHTMLPDF: generarHTMLRecetasPDF,
  getPacientesForExport,
};
