import { notFound } from 'next/navigation';
import { PortalDashboardClient } from './portal-dashboard-client';

// ─── Types ────────────────────────────────────────────────

interface TurnoRow {
  id: string;
  fechaHora: string;
  estado: string;
  tipoConsulta: string;
  motivo: string | null;
  medicoNombre: string | null;
  duracionMinutos: number;
}

interface RecetaRow {
  id: string;
  medicamento: string;
  dosis: string;
  frecuencia: string;
  duracion: string | null;
  indicaciones: string | null;
  estado: string;
  fechaInicio: string;
  fechaFin: string | null;
  medicoNombre: string | null;
}

interface PortalData {
  paciente: {
    id: string;
    nombre: string;
    apellido: string;
    telefono: string;
    email: string | null;
    obraSocial: string | null;
  };
  turnos: TurnoRow[];
  recetas: RecetaRow[];
  stats: { totalTurnos: number; totalRecetas: number };
}

// ─── Data fetching ─────────────────────────────────────────

export const dynamic = 'force-dynamic';

async function getPortalData(telefono: string): Promise<PortalData | null> {
  try {
    const res = await fetch(
      `http://localhost:3000/api/portal?telefono=${encodeURIComponent(telefono)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

// ─── Page ──────────────────────────────────────────────────

export default async function PortalDashboardPage({
  params,
}: {
  params: { telefono: string };
}) {
  const telefono = decodeURIComponent(params.telefono);
  const data = await getPortalData(telefono);
  if (!data) notFound();

  return <PortalDashboardClient data={data} />;
}
