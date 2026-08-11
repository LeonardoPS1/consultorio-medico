import { getEffectiveSession } from '@/lib/auth-effective';
import { redirect } from 'next/navigation';
import { turnosService } from '@/lib/services/turnos';
import { AtencionClient, type Turno, type TurnoEstado } from './atencion-client';

export const dynamic = 'force-dynamic';

export default async function AtencionPage() {
  const session = await getEffectiveSession();
  if (!session) redirect('/login');

  let merged: Turno[] = [];
  try {
    const turnosAtencion = await turnosService.listParaAtencion();

    merged = (turnosAtencion || []).map((t) => ({
      id: t.id,
      hora: t.hora,
      fecha: t.fecha,
      paciente: t.paciente,
      pacienteId: t.pacienteId ?? undefined,
      tipo: t.tipo,
      tipoConsulta: t.tipoConsulta ?? undefined,
      medico: t.medico,
      medicoId: t.medicoId ?? undefined,
      estado: t.estado as TurnoEstado,
      inicioAtencionAt: t.inicioAtencionAt,
      linkVideollamada: t.linkVideollamada ?? undefined,
    }));
  } catch (e) {
    console.error('[AtencionPage] Error al cargar turnos:', e);
  }

  return <AtencionClient initialTurnos={merged} />;
}
