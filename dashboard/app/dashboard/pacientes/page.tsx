import { PacientesClient } from './pacientes-client';

// ─── Types ────────────────────────────────────────────────

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string | null;
  obraSocial: string | null;
  tags: string[];
  ultimoTurno: string | null;
  totalTurnos: number;
}

interface PacientesApiResponse {
  data: Paciente[];
  total: number;
  conTurnos: number;
  nuevos: number;
}

// ─── Data fetching ─────────────────────────────────────────

export const dynamic = 'force-dynamic';

async function getPacientes(): Promise<PacientesApiResponse | null> {
  try {
    const res = await fetch(
      'http://localhost:3000/api/pacientes?limit=100&offset=0',
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Page ──────────────────────────────────────────────────

export default async function PacientesPage() {
  const apiData = await getPacientes();

  const pacientes = apiData?.data ?? [];
  const total = apiData?.total ?? 0;
  const conTurnos = apiData?.conTurnos ?? 0;
  const nuevos = apiData?.nuevos ?? 0;

  return (
    <div className="space-y-6 animate-in">
      {/* Header (server-rendered) */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pacientes</h2>
          <p className="text-muted-foreground">
            Historial y datos de tus pacientes
          </p>
        </div>
      </div>

      {/* Estadísticas (server-rendered) */}
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
  <div className="rounded-lg bg-primary/5 p-3 text-center">
    <p className="text-xl sm:text-2xl font-bold text-primary">{total}</p>
    <p className="text-xs text-muted-foreground">Total pacientes</p>
  </div>
  <div className="rounded-lg bg-emerald-500/5 p-3 text-center">
    <p className="text-xl sm:text-2xl font-bold text-emerald-600">{conTurnos}</p>
    <p className="text-xs text-muted-foreground">Con turnos</p>
  </div>
  <div className="rounded-lg bg-amber-500/5 p-3 text-center">
    <p className="text-xl sm:text-2xl font-bold text-amber-600">{nuevos}</p>
    <p className="text-xs text-muted-foreground">Nuevos</p>
  </div>
</div>

      {/* Lista + búsqueda + modal (client) */}
      <PacientesClient initialPacientes={pacientes} />
    </div>
  );
}
