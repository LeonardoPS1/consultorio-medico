import { cookies } from 'next/headers';
import { PacientesClient } from './pacientes-client';
import { PageHeader } from '@/components/page-header';
import { getServerPacientes } from '@/lib/server-page-data';

// ─── Data fetching ─────────────────────────────────────────

export const dynamic = 'force-dynamic';

// ─── Page ──────────────────────────────────────────────────

export default async function PacientesPage() {
  const cookieStore = await cookies();
  const sucursalId = cookieStore.get('sucursal_activa')?.value;
  const apiData = await getServerPacientes(sucursalId);

  const pacientes = apiData?.data ?? [];
  const total = apiData?.total ?? 0;
  const conTurnos = apiData?.conTurnos ?? 0;
  const nuevos = apiData?.nuevos ?? 0;

  return (
    <div className="space-y-6 animate-in">
      <PageHeader title="Pacientes" description="Historial y datos de tus pacientes" />

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
      <PacientesClient initialPacientes={pacientes} initialTotal={total} />
    </div>
  );
}
