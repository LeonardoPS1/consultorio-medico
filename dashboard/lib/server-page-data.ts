/**
 * Helpers para server components — llama a services directo
 * en vez de hacer fetch() a localhost API routes.
 *
 * Beneficio: evita round-trip HTTP + serialización JSON innecesaria.
 * Los services ya tienen cache in-memory con TTL.
 *
 * Las funciones están envueltas con React.cache() + unstable_cache:
 * - React.cache(): deduplica llamadas dentro del mismo render
 * - unstable_cache(): cachea entre requests con tag-based revalidation
 */

import { auth } from '@/lib/auth';
import { turnosService } from '@/lib/services/turnos';
import { pacientesService } from '@/lib/services/pacientes';
import { recetasService } from '@/lib/services/recetas';
import { cache as reactCache } from 'react';
import { CACHE_TAGS } from '@/lib/data-cache';

// ─── Turnos ────────────────────────────────────────────────

export interface TurnoPageData {
  data: Array<{
    id: string;
    hora: string;
    paciente: string;
    tipo: string;
    medico: string;
    medicoId: string;
    pacienteId: string;
    estado: string;
    fecha: string;
  }>;
  total: number;
  statsTotal: number;
  statsPorEstado: Record<string, number>;
  medicos: string[];
  tipos: string[];
  fecha: string;
}

export const getServerTurnos = reactCache(async (
  sucursalId?: string,
  fecha?: string,
): Promise<TurnoPageData | null> => {
  try {
    const session = await auth();
    const sessionMedicoId = session?.user?.medicoId;
    const sessionRol = session?.user?.role;
    const medicoIdFilter = sessionRol === 'medico' ? sessionMedicoId : undefined;

    const result = await turnosService.list(
      fecha,
      undefined, // estado
      undefined, // medico
      undefined, // tipo
      undefined, // search
      200,
      0,
      sucursalId,
      medicoIdFilter,
    );

    return {
      data: result.data.map((t) => ({
        ...t,
        medicoId: t.medicoId ?? '',
        pacienteId: t.pacienteId ?? '',
      })),
      total: result.total,
      statsTotal: result.statsTotal,
      statsPorEstado: result.statsPorEstado,
      medicos: [],
      tipos: [],
      fecha: result.fecha ?? fecha ?? new Date().toISOString().split('T')[0],
    };
  } catch {
    return null;
  }
});

// ─── Pacientes ─────────────────────────────────────────────

export interface PacientePageData {
  data: Array<{
    id: string;
    nombre: string;
    apellido: string;
    telefono: string;
    email: string | null;
    obraSocial: string | null;
    sistemaSalud: string | null;
    isapreNombre: string | null;
    tags: string[];
    ultimoTurno: string | null;
    totalTurnos: number;
    dni?: string | null;
  }>;
  total: number;
  conTurnos: number;
  nuevos: number;
}

export const getServerPacientes = reactCache(async (
  sucursalId?: string,
): Promise<PacientePageData | null> => {
  try {
    const session = await auth();
    const sessionMedicoId = session?.user?.medicoId;
    const sessionRol = session?.user?.role;
    const medicoIdFilter = sessionRol === 'medico' ? sessionMedicoId : undefined;

    const result = await pacientesService.list(
      undefined, // search
      100,
      0,
      sucursalId,
      medicoIdFilter,
    );

    return {
      data: result.data,
      total: result.total,
      conTurnos: result.conTurnos,
      nuevos: result.nuevos,
    };
  } catch {
    return null;
  }
});

// ─── Recetas ───────────────────────────────────────────────

export interface RecetaPageData {
  data: Array<{
    id: string;
    paciente: string;
    medicamento: string;
    dosis: string;
    duracion: string;
    estado: 'activa' | 'vencida' | 'historial';
    vence: string;
    renovable: boolean;
    fechaCreacion: string;
    indicaciones?: string;
  }>;
  total: number;
  activas: number;
  vencidas: number;
  historial: number;
}

export const getServerRecetas = reactCache(async (): Promise<RecetaPageData | null> => {
  try {
    const session = await auth();
    const sessionMedicoId = session?.user?.medicoId;
    const sessionRol = session?.user?.role;
    const isMedico = sessionRol === 'medico' && !!sessionMedicoId;

    const result = await recetasService.listar({
      limit: 100,
      offset: 0,
      medicoId: isMedico ? sessionMedicoId : null,
    });

    return {
      data: result.data,
      total: result.total,
      activas: result.activas,
      vencidas: result.vencidas,
      historial: result.historial,
    };
  } catch {
    return null;
  }
});
