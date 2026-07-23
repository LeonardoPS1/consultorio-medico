/**
 * Consentimientos — Página principal
 *
 * Server Component: carga datos server-side, verifica acceso por plan,
 * y pasa todo al Client Component island para interactividad.
 */

export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { canAccess } from '@/lib/features';
import { consentimientosService } from '@/lib/services/consentimientos';
import { ConsentimientosClient } from './consentimientos-client';

interface ConsentimientoItem {
  id: string;
  pacienteId: string;
  tipo: string;
  titulo: string;
  fechaFirma: string | null;
  nombrePaciente: string;
  rutPaciente: string | null;
  ipFirma: string | null;
  documentoPdf: string | null;
  medicoId: string | null;
  createdAt: string;
  pacienteNombre: string;
  medicoNombre: string;
}

interface ConsentimientoStats {
  total: number;
  porTipo: Record<string, number>;
}

function serializeDate(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val instanceof Date) return val.toISOString();
  return String(val ?? '');
}

async function getInitialData(): Promise<{
  data: ConsentimientoItem[];
  total: number;
  stats: ConsentimientoStats | null;
  canView: boolean;
}> {
  try {
    const session = await auth();
    const userPlan = session?.user?.plan ?? 'free';
    const isAdmin = session?.user?.role === 'admin';
    const view = isAdmin || canAccess(userPlan, 'consentimiento-informado');

    if (!view) {
      return { data: [], total: 0, stats: null, canView: false };
    }

    const [listResult, statsResult] = await Promise.all([
      consentimientosService.list({ limit: 50 }),
      consentimientosService.getStats(),
    ]);

    return {
      data: listResult.data.map((d: Record<string, unknown>) => ({
        id: String(d.id ?? ''),
        pacienteId: String(d.pacienteId ?? ''),
        tipo: String(d.tipo ?? ''),
        titulo: String(d.titulo ?? ''),
        fechaFirma: d.fechaFirma ? serializeDate(d.fechaFirma) : null,
        nombrePaciente: String(d.nombrePaciente ?? ''),
        rutPaciente: d.rutPaciente ? String(d.rutPaciente) : null,
        ipFirma: d.ipFirma ? String(d.ipFirma) : null,
        documentoPdf: d.documentoPdf ? String(d.documentoPdf) : null,
        medicoId: d.medicoId ? String(d.medicoId) : null,
        createdAt: serializeDate(d.createdAt),
        pacienteNombre: String(d.pacienteNombre ?? ''),
        medicoNombre: String(d.medicoNombre ?? ''),
      })),
      total: Number(listResult.total ?? 0),
      stats: statsResult as ConsentimientoStats | null,
      canView: true,
    };
  } catch {
    return { data: [], total: 0, stats: null, canView: false };
  }
}

export default async function ConsentimientosPage() {
  const initial = await getInitialData();

  return (
    <ConsentimientosClient
      initialData={initial.data}
      initialTotal={initial.total}
      initialStats={initial.stats}
      canView={initial.canView}
    />
  );
}
