import { db } from '@/lib/db';
import { recetas, pacientes, medicos } from '@/drizzle/schema';
import { eq, and, sql, count, desc } from 'drizzle-orm';
import { createHash, randomUUID } from 'crypto';

// ─── Tipos ─────────────────────────────────────────────────

export type EstadoReceta = 'activa' | 'vencida' | 'historial';

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

const SECRET = process.env.RECETA_HASH_SECRET || 'consultorio-medico-receta-secret-2026';

// ─── Hash de verificación ───────────────────────────────────

/**
 * Genera un hash SHA-256 único para la receta.
 * Se usa como firma digital verificable vía QR.
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
    SECRET,
  ].join('||');
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Verifica que el hash de una receta sea válido.
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
 */
export async function listarRecetas(params: {
  estado?: string;
  limit?: number;
  offset?: number;
  medicoId?: string | null;
}): Promise<RecetaListResult> {
  const { estado, limit = 100, offset = 0, medicoId } = params;

  const scope = medicoId ? eq(recetas.medicoId, medicoId) : undefined;

  const whereBase = (estadoFiltro?: string) =>
    and(
      estadoFiltro ? eq(recetas.estado, estadoFiltro) : undefined,
      scope,
    );

  const whereList = and(
    estado ? eq(recetas.estado, estado) : undefined,
    scope,
  );

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
      renovable: sql<boolean>`${recetas.recetaAnteriorId} IS NOT NULL`,
      createdAt: recetas.createdAt,
      hashVerificacion: recetas.hashVerificacion,
    })
    .from(recetas)
    .leftJoin(pacientes, eq(recetas.pacienteId, pacientes.id))
    .where(whereList)
    .orderBy(desc(recetas.createdAt))
    .limit(limit)
    .offset(offset);

  const data: RecetaItem[] = lista.map((r) => ({
    id: r.id,
    pacienteId: r.pacienteId,
    paciente: `${r.pacienteNombre || ''} ${r.pacienteApellido || ''}`.trim() || 'Paciente',
    medicamento: r.medicamento,
    dosis: r.dosis,
    duracion: r.duracion || r.frecuencia,
    estado: r.estado as EstadoReceta,
    indicaciones: r.indicaciones || undefined,
    vence: r.fechaFin || r.fechaInicio,
    fechaCreacion: r.createdAt
      ? new Date(r.createdAt).toISOString().split('T')[0]
      : '',
    renovable: r.renovable,
    hashVerificacion: r.hashVerificacion,
  }));

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
 */
export async function crearReceta(input: CreateRecetaInput) {
  if (!input.medicoId) {
    throw new Error('Se requiere un médico para crear la receta');
  }

  const fechaInicio = new Date().toISOString().split('T')[0];
  const fechaFin = new Date(Date.now() + 30 * 86400000)
    .toISOString()
    .split('T')[0];

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
      id,
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
      estado: 'activa',
      hashVerificacion: hash,
    })
    .returning();

  return nueva;
}

/**
 * Actualiza una receta (regenera hash si cambian datos sensibles).
 */
export async function actualizarReceta(
  id: string,
  input: UpdateRecetaInput,
) {
  const camposSensibles = ['medicamento', 'dosis', 'pacienteId', 'fechaInicio'];
  const tieneCambioSensible = camposSensibles.some(
    (k) => k in input,
  );

  const updateData: Record<string, any> = {
    ...input,
    updatedAt: new Date(),
  };

  // Si se renueva, actualizar fechas
  if (input.estado === 'activa') {
    updateData.fechaInicio = new Date().toISOString().split('T')[0];
    updateData.fechaFin = new Date(Date.now() + 30 * 86400000)
      .toISOString()
      .split('T')[0];
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
 */
export async function getRecetasForExport(params: {
  estado?: string;
  medicoId?: string | null;
}): Promise<RecetaExportRow[]> {
  const { estado, medicoId } = params;

  const scope = medicoId ? eq(recetas.medicoId, medicoId) : undefined;
  const whereEstado = estado ? eq(recetas.estado, estado) : undefined;

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
    .where(and(whereEstado, scope))
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
    Estado: r.estado,
    'Fecha Inicio': r.fechaInicio,
    'Fecha Fin': r.fechaFin || '—',
    'Fecha Creación': r.createdAt
      ? new Date(r.createdAt).toISOString().split('T')[0]
      : '—',
    'Código Verificación': r.hashVerificacion
      ? `${r.hashVerificacion.substring(0, 12)}...`
      : '—',
  }));
}

/**
 * Genera buffer Excel (.xlsx) desde datos exportables.
 */
export function generarExcelRecetas(data: RecetaExportRow[]): Buffer {
  // Usamos require para evitar problemas de tipos con xlsx
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const XLSX = require('xlsx');

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Ajustar ancho de columnas
  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(
      key.length,
      ...data.map((r) => String((r as any)[key] || '').length),
    ) + 2,
  }));
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Recetas');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/**
 * Genera HTML formateado para exportación PDF (imprimible).
 */
export function generarHTMLRecetasPDF(
  data: RecetaExportRow[],
  titulo?: string,
): string {
  const nombreOrg = process.env.ORGANIZATION_NAME || 'Consultorio Médico';
  const fecha = new Date().toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const filas = data
    .map(
      (r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.Paciente}</td>
      <td><strong>${r.Medicamento}</strong></td>
      <td>${r.Dosis}</td>
      <td>${r.Estado}</td>
      <td>${r['Fecha Inicio']}</td>
      <td>${r['Fecha Fin']}</td>
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
export async function getPacientesForExport(params: {
  search?: string;
  medicoId?: string | null;
  sucursalId?: string | null;
}) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { pacientesService } = require('./pacientes');
  const result = await pacientesService.list({
    limit: 10000,
    offset: 0,
    search: params.search,
    medicoId: params.medicoId,
    sucursalId: params.sucursalId,
  });

  return result.data.map((p: any) => ({
    Nombre: `${p.nombre} ${p.apellido}`,
    Teléfono: p.telefono || '—',
    Email: p.email || '—',
    'Obra Social': p.obraSocial || '—',
    Tags: Array.isArray(p.tags) ? p.tags.join(', ') : '—',
    'Último Turno': p.ultimoTurno
      ? new Date(p.ultimoTurno).toISOString().split('T')[0]
      : '—',
    'Total Turnos': p.totalTurnos ?? 0,
  }));
}

export const recetasService = {
  listar: listarRecetas,
  obtener: obtenerReceta,
  crear: crearReceta,
  actualizar: actualizarReceta,
  generarHash: generarHashVerificacion,
  verificarHash,
  getForExport: getRecetasForExport,
  generarExcel: generarExcelRecetas,
  generarHTMLPDF: generarHTMLRecetasPDF,
  getPacientesForExport,
};
