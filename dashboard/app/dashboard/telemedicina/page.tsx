/**
 * Telemedicina — Página principal
 *
 * Server Component: carga turnos virtuales server-side y pasa datos al cliente.
 * El cliente maneja filtros interactivos y refetches según necesidad.
 */

export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { turnosService } from '@/lib/services/turnos';
import { TelemedicinaClient } from './telemedicina-client';

export interface TurnoVirtual {
  id: string;
  fecha: string;
  hora: string;
  paciente: string;
  pacienteId: string;
  tipo: string;
  tipoConsulta: 'telemedicina' | 'consulta' | 'control' | 'urgencia' | 'procedimiento' | 'otro';
  medico: string;
  medicoId: string;
  estado: string;
  linkVideollamada?: string;
  motivo?: string;
  duracionMinutos?: number;
  inicioAtencionAt?: string;
}

async function getVirtualTurnos(): Promise<TurnoVirtual[]> {
  try {
    const session = await auth();
    const medicoIdFilter = session?.user?.role === 'medico' ? session?.user?.medicoId : undefined;

    const result = await turnosService.list(
      undefined, // fecha
      undefined, // estado
      undefined, // medico
      'telemedicina', // tipo
      undefined, // search
      200,
      0,
      undefined, // sucursalId
      medicoIdFilter,
    );

    return result.data.map((t: Record<string, unknown>) => {
      const fechaRaw = t.fecha;
      const fechaStr = fechaRaw instanceof Date ? fechaRaw.toISOString() : String(fechaRaw ?? '');
      return {
        id: String(t.id ?? ''),
        fecha: fechaStr.split('T')[0],
        hora: String(t.hora ?? ''),
        paciente: String(t.paciente ?? ''),
        pacienteId: String(t.pacienteId ?? ''),
        tipo: String(t.tipo ?? ''),
        tipoConsulta: 'telemedicina' as const,
        medico: String(t.medico ?? ''),
        medicoId: String(t.medicoId ?? ''),
        estado: String(t.estado ?? ''),
        linkVideollamada: t.linkVideollamada ? String(t.linkVideollamada) : undefined,
        motivo: t.motivo ? String(t.motivo) : undefined,
        duracionMinutos: t.duracionMinutos ? Number(t.duracionMinutos) : undefined,
        inicioAtencionAt: t.inicioAtencionAt ? String(t.inicioAtencionAt) : undefined,
      };
    });
  } catch {
    return [];
  }
}

export default async function TelemedicinaPage() {
  const turnos = await getVirtualTurnos();

  return <TelemedicinaClient initialTurnos={turnos} />;
}
