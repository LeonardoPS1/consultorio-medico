import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { turnosService } from '@/lib/services/turnos';
import { AtencionClient, type Turno, type TurnoEstado } from './atencion-client';

export const dynamic = 'force-dynamic';

export default async function AtencionPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const hoy = new Date().toISOString().split('T')[0];

  const [turnosHoy, turnosEnAtencion] = await Promise.all([
    turnosService.list(hoy, undefined, undefined, undefined, undefined, 100, 0, undefined, undefined),
    turnosService.list(undefined, 'en_atencion', undefined, undefined, undefined, 100, 0, undefined, undefined),
  ]);

  const todosIds = new Set<string>();
  const merged: Turno[] = [...(turnosHoy?.data || []), ...(turnosEnAtencion?.data || [])]
    .filter((t) => {
      if (todosIds.has(t.id)) return false;
      todosIds.add(t.id);
      return true;
    })
    .map((t) => ({
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

  return <AtencionClient initialTurnos={merged} />;
}
