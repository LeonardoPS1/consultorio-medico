/**
 * Derivaciones — Página principal
 *
 * Server Component: carga datos server-side, verifica acceso por plan,
 * y pasa todo al Client Component island para interactividad.
 */

export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { canAccess } from '@/lib/features';
import { derivacionesService } from '@/lib/services/derivaciones';
import { DerivacionesClient } from './derivaciones-client';

interface DerivacionItem {
  id: string;
  pacienteId: string;
  medicoOrigenId: string;
  medicoDestinoId: string | null;
  especialidad: string;
  motivo: string;
  diagnostico: string | null;
  cie10Codigo: string | null;
  gravedad: 'normal' | 'prioritaria' | 'urgente';
  estado: 'pendiente' | 'aceptada' | 'rechazada' | 'completada';
  notasOrigen: string | null;
  notasDestino: string | null;
  fechaRespuesta: string | null;
  createdAt: string;
  pacienteNombre: string;
  pacienteTelefono: string | null;
  medicoOrigenNombre: string;
  medicoDestinoNombre: string | null;
}

interface MedicoOption {
  id: string;
  nombre: string;
  especialidad: string;
}

interface StatsData {
  total: number;
  porEstado: Record<string, number>;
  porGravedad: Record<string, number>;
}

function serializeDate(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val instanceof Date) return val.toISOString();
  return String(val ?? '');
}

async function getInitialData(): Promise<{
  data: DerivacionItem[];
  total: number;
  stats: StatsData | null;
  medicos: MedicoOption[];
  canView: boolean;
}> {
  try {
    const session = await auth();
    const userPlan = session?.user?.plan ?? 'free';
    const view = canAccess(userPlan, 'derivaciones');

    if (!view) {
      return { data: [], total: 0, stats: null, medicos: [], canView: false };
    }

    const [listResult, statsResult, medicosResult] = await Promise.all([
      derivacionesService.list({ limit: 50 }),
      derivacionesService.getStats(),
      derivacionesService.getMedicos(),
    ]);

    return {
      data: listResult.data.map((d: Record<string, unknown>) => ({
        id: String(d.id ?? ''),
        pacienteId: String(d.pacienteId ?? ''),
        medicoOrigenId: String(d.medicoOrigenId ?? ''),
        medicoDestinoId: d.medicoDestinoId ? String(d.medicoDestinoId) : null,
        especialidad: String(d.especialidad ?? ''),
        motivo: String(d.motivo ?? ''),
        diagnostico: d.diagnostico ? String(d.diagnostico) : null,
        cie10Codigo: d.cie10Codigo ? String(d.cie10Codigo) : null,
        gravedad: (d.gravedad ?? 'normal') as DerivacionItem['gravedad'],
        estado: (d.estado ?? 'pendiente') as DerivacionItem['estado'],
        notasOrigen: d.notasOrigen ? String(d.notasOrigen) : null,
        notasDestino: d.notasDestino ? String(d.notasDestino) : null,
        fechaRespuesta: d.fechaRespuesta ? serializeDate(d.fechaRespuesta) : null,
        createdAt: serializeDate(d.createdAt),
        pacienteNombre: String(d.pacienteNombre ?? ''),
        pacienteTelefono: d.pacienteTelefono ? String(d.pacienteTelefono) : null,
        medicoOrigenNombre: String(d.medicoOrigenNombre ?? ''),
        medicoDestinoNombre: d.medicoDestinoNombre ? String(d.medicoDestinoNombre) : null,
      })),
      total: Number(listResult.total ?? 0),
      stats: statsResult as StatsData | null,
      medicos: (medicosResult as MedicoOption[]).map((m) => ({
        id: m.id,
        nombre: m.nombre,
        especialidad: m.especialidad,
      })),
      canView: true,
    };
  } catch {
    return { data: [], total: 0, stats: null, medicos: [], canView: false };
  }
}

export default async function DerivacionesPage() {
  const initial = await getInitialData();

  return (
    <DerivacionesClient
      initialData={initial.data}
      initialTotal={initial.total}
      initialStats={initial.stats}
      initialMedicos={initial.medicos}
      canView={initial.canView}
    />
  );
}
