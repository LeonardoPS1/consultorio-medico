import { eq, desc, and, sql } from 'drizzle-orm';
import { historialMedico, notasSoap, pacientes } from '@/drizzle/schema';
import { db } from '@/lib/db';

/**
 * Origen del registro clínico: historial clásico o Nota SOAP estructurada.
 */
export type HistorialOrigen = 'historial' | 'soap';

/**
 * Item del historial clínico unificado (historial_medico + notas_soap).
 */
export interface HistorialItem {
  id: string;
  origen: HistorialOrigen;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  diagnosticoCodigo: string | null;
  diagnosticoDescripcion: string | null;
  subjetivo: string | null;
  objetivo: string | null;
  assessment: string | null;
  plan: string | null;
  fecha: string;
  pacienteId: string;
  pacienteNombre: string;
  pacienteTelefono: string;
}

export interface ListarHistorialParams {
  search?: string;
  tipo?: string;
  origen?: HistorialOrigen | '';
  from?: string;
  to?: string;
  pacienteId?: string;
  page?: number;
  limit?: number;
}

export interface ListarHistorialResult {
  data: HistorialItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function toIso(v: Date | string | null): string {
  if (!v) return '';
  return v instanceof Date ? v.toISOString() : String(v);
}

const nombrePaciente = sql<string>`CONCAT(${pacientes.nombre}, ' ', ${pacientes.apellido})`;

/**
 * Consulta unificada del historial clínico. Une registros de `historial_medico`
 * y Notas SOAP (`notas_soap`), ordena por fecha descendente y pagina en JS
 * (evita complejidad de union tipada con Drizzle). Filtros: búsqueda por
 * nombre de paciente, tipo, origen, rango de fechas y paciente específico.
 * @param params
 */
export async function listarHistorial(
  params: ListarHistorialParams = {},
): Promise<ListarHistorialResult> {
  const { tipo = '', origen = '', page = 1, limit = 30 } = params;

  const size = Math.min(200, Math.max(1, Number(limit) || 30));
  const safePage = Math.max(1, Number(page) || 1);
  const useHistorial = origen !== 'soap';
  const useSoap = origen !== 'historial';

  const merged: HistorialItem[] = [];

  if (useHistorial) {
    const rows = await db
      .select({
        id: historialMedico.id,
        tipo: historialMedico.tipo,
        titulo: historialMedico.titulo,
        descripcion: historialMedico.descripcion,
        diagnosticoCodigo: historialMedico.diagnosticoCodigo,
        diagnosticoDescripcion: historialMedico.diagnosticoDescripcion,
        fecha: historialMedico.createdAt,
        pacienteId: historialMedico.pacienteId,
        pacienteNombre: nombrePaciente,
        pacienteTelefono: pacientes.telefono,
      })
      .from(historialMedico)
      .innerJoin(pacientes, eq(historialMedico.pacienteId, pacientes.id))
      .where(
        and(
          ...buildFiltroHistorial(params),
          tipo ? eq(historialMedico.tipo, sql`${tipo}::historial_tipo`) : undefined,
        ),
      )
      .orderBy(desc(historialMedico.createdAt))
      .limit(size);

    for (const r of rows) {
      merged.push({
        id: `h_${r.id}`,
        origen: 'historial',
        tipo: r.tipo,
        titulo: r.titulo,
        descripcion: r.descripcion,
        diagnosticoCodigo: r.diagnosticoCodigo,
        diagnosticoDescripcion: r.diagnosticoDescripcion,
        subjetivo: null,
        objetivo: null,
        assessment: null,
        plan: null,
        fecha: toIso(r.fecha),
        pacienteId: r.pacienteId,
        pacienteNombre: r.pacienteNombre,
        pacienteTelefono: r.pacienteTelefono ?? '',
      });
    }
  }

  if (useSoap) {
    const rows = await db
      .select({
        id: notasSoap.id,
        subjetivo: notasSoap.subjetivo,
        objetivo: notasSoap.objetivo,
        assessment: notasSoap.assessment,
        plan: notasSoap.plan,
        cie10Codigo: notasSoap.cie10Codigo,
        fecha: notasSoap.createdAt,
        pacienteId: notasSoap.pacienteId,
        pacienteNombre: nombrePaciente,
        pacienteTelefono: pacientes.telefono,
      })
      .from(notasSoap)
      .innerJoin(pacientes, eq(notasSoap.pacienteId, pacientes.id))
      .where(and(...buildFiltroSoap(params)))
      .orderBy(desc(notasSoap.createdAt))
      .limit(size);

    for (const r of rows) {
      merged.push({
        id: `s_${r.id}`,
        origen: 'soap',
        tipo: 'evolucion',
        titulo: 'Nota SOAP',
        descripcion: null,
        diagnosticoCodigo: r.cie10Codigo,
        diagnosticoDescripcion: null,
        subjetivo: r.subjetivo,
        objetivo: r.objetivo,
        assessment: r.assessment,
        plan: r.plan,
        fecha: toIso(r.fecha),
        pacienteId: r.pacienteId,
        pacienteNombre: r.pacienteNombre,
        pacienteTelefono: r.pacienteTelefono ?? '',
      });
    }
  }

  merged.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  const total = merged.length;
  const totalPages = Math.ceil(total / size);
  const start = (safePage - 1) * size;
  return {
    data: merged.slice(start, start + size),
    total,
    page: safePage,
    limit: size,
    totalPages,
  };
}

/**
 * Condiciones de filtro para historial_medico (búsqueda, fechas, paciente).
 * @param params
 */
function buildFiltroHistorial(params: ListarHistorialParams): ReturnType<typeof and>[] {
  const { search = '', from = '', to = '', pacienteId } = params;
  const conds: ReturnType<typeof and>[] = [];
  if (search) {
    conds.push(
      sql`(LOWER(${pacientes.nombre}) LIKE ${`%${search.toLowerCase()}%`} OR LOWER(${pacientes.apellido}) LIKE ${`%${search.toLowerCase()}%`})`,
    );
  }
  if (from) conds.push(sql`${historialMedico.createdAt} >= ${from}::timestamp`);
  if (to) conds.push(sql`${historialMedico.createdAt} <= ${to}::timestamp + interval '1 day'`);
  if (pacienteId) conds.push(eq(historialMedico.pacienteId, sql`${pacienteId}::uuid`));
  return conds;
}

/**
 * Condiciones de filtro para notas_soap (búsqueda, fechas, paciente).
 * @param params
 */
function buildFiltroSoap(params: ListarHistorialParams): ReturnType<typeof and>[] {
  const { search = '', from = '', to = '', pacienteId } = params;
  const conds: ReturnType<typeof and>[] = [];
  if (search) {
    conds.push(
      sql`(LOWER(${pacientes.nombre}) LIKE ${`%${search.toLowerCase()}%`} OR LOWER(${pacientes.apellido}) LIKE ${`%${search.toLowerCase()}%`})`,
    );
  }
  if (from) conds.push(sql`${notasSoap.createdAt} >= ${from}::timestamp`);
  if (to) conds.push(sql`${notasSoap.createdAt} <= ${to}::timestamp + interval '1 day'`);
  if (pacienteId) conds.push(eq(notasSoap.pacienteId, sql`${pacienteId}::uuid`));
  return conds;
}

/**
 * Valor del archivo CSV (escape simple de comillas y saltos).
 * @param v
 */
export function csvEscape(v: string | null | undefined): string {
  if (v === null || v === undefined) return '';
  return `"${String(v).replace(/"/g, '""')}"`;
}

/**
 * Convierte una lista de ítems del historial a CSV con cabecera en español.
 * @param items
 */
export function toCsv(items: HistorialItem[]): string {
  const header = ['origen', 'fecha', 'paciente', 'tipo', 'titulo', 'descripcion', 'diagnostico'];
  const rows = items.map((i) =>
    [
      i.origen,
      i.fecha,
      i.pacienteNombre,
      i.tipo,
      i.titulo,
      i.descripcion,
      i.diagnosticoCodigo
        ? `${i.diagnosticoCodigo} - ${i.diagnosticoDescripcion ?? ''}`.trim()
        : '',
    ]
      .map((c) => csvEscape(c))
      .join(','),
  );
  return [header].concat(rows).join('\n');
}
