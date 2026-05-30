import { cookies } from 'next/headers';
import { TurnosClient } from './turnos-client';
import { PageHeader } from '@/components/page-header';

// ─── Types ────────────────────────────────────────────────

interface TurnoData {
  id: string;
  hora: string;
  paciente: string;
  tipo: string;
  medico: string;
  medicoId: string;
  pacienteId: string;
  estado: string;
  fecha: string;
}

interface TurnosApiResponse {
  data: TurnoData[];
  total: number;
  statsTotal: number;
  statsPorEstado: Record<string, number>;
  medicos: string[];
  tipos: string[];
  fecha: string;
}

// ─── Data fetching ─────────────────────────────────────────

export const dynamic = 'force-dynamic';

async function getTurnos(sucursalId?: string, fecha?: string): Promise<TurnosApiResponse | null> {
  try {
    const params = new URLSearchParams();
    if (fecha) params.set('fecha', fecha);
    params.set('limit', '200');
    if (sucursalId) params.set('sucursalId', sucursalId);

    const res = await fetch(
      `http://localhost:3000/api/turnos?${params.toString()}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────

const COLORES_ESTADO: Record<string, string> = {
  pendiente: '#F59E0B',
  confirmada: '#10B981',
  en_atencion: '#3B82F6',
  atendido: '#6B7280',
  cancelada: '#EF4444',
  no_asistio: '#8B5CF6',
  completada: '#10B981',
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
  const apiData = await getTurnos(sucursalId);

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
            <span className="text-muted-foreground text-xs">
              {LABELS_ESTADO[estado] || estado}
            </span>
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
