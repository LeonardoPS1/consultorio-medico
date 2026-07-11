import { cookies } from 'next/headers';
import { TurnosClient } from './turnos-client';
import { PageHeader } from '@/components/page-header';
import { getServerTurnos } from '@/lib/server-page-data';

// ─── Data fetching ─────────────────────────────────────────

export const dynamic = 'force-dynamic';

// ─── Helpers ──────────────────────────────────────────────

const COLORES_ESTADO: Record<string, string> = {
  pendiente: 'hsl(var(--turno-pendiente))',
  confirmada: 'hsl(var(--turno-confirmada))',
  en_atencion: 'hsl(var(--turno-en-atencion))',
  atendido: 'hsl(var(--turno-atendido))',
  cancelada: 'hsl(var(--turno-cancelada))',
  no_asistio: 'hsl(var(--turno-no-asistio))',
  completada: 'hsl(var(--turno-completada))',
};

const LABELS_ESTADO: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  en_atencion: 'En atención',
  atendido: 'Atendido',
  cancelada: 'Cancelada',
  no_asistio: 'No asistió',
  completada: 'Completada',
};

// ─── Page ──────────────────────────────────────────────────

export default async function TurnosPage() {
  const cookieStore = cookies();
  const sucursalId = cookieStore.get('sucursal_activa')?.value;
  const apiData = await getServerTurnos(sucursalId);

  const turnos = apiData?.data ?? [];
  const statsPorEstado = apiData?.statsPorEstado ?? {};
  const statsTotal = apiData?.statsTotal ?? 0;
  const medicos = apiData?.medicos ?? [];
  const tipos = apiData?.tipos ?? [];
  const fechaStr = apiData?.fecha ?? new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 animate-in">
      <PageHeader title="Turnos" description="Gestioná los turnos de tus pacientes" />

      {/* Stats del día (server-rendered) */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-sm">
          <span className="font-semibold text-foreground">{statsTotal}</span>
          <span className="text-muted-foreground">turnos hoy</span>
        </div>
        {Object.entries(statsPorEstado).map(([estado, count]) => (
          <div
            key={estado}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-sm"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: COLORES_ESTADO[estado] || '#999' }}
            />
            <span className="font-medium">{count}</span>
            <span className="text-muted-foreground text-xs">{LABELS_ESTADO[estado] || estado}</span>
          </div>
        ))}
      </div>

      {/* TurnosClient: maneja navegación fecha, filtros, vista, CRUD, modales */}
      <TurnosClient
        initialTurnos={turnos}
        initialMedicos={medicos}
        initialTipos={tipos}
        initialFecha={fechaStr}
      />
    </div>
  );
}
