import { RecetasClient } from './recetas-client';
import { PageHeader } from '@/components/page-header';

// ─── Types ────────────────────────────────────────────────

interface Receta {
  id: string;
  paciente: string;
  medicamento: string;
  dosis: string;
  duracion: string;
  estado: 'activa' | 'vencida' | 'historial';
  vence: string;
  renovable: boolean;
  fechaCreacion: string;
  indicaciones?: string;
}

interface RecetasApiResponse {
  data: Receta[];
  total: number;
  activas: number;
  vencidas: number;
  historial: number;
}

// ─── Data fetching ─────────────────────────────────────────

export const dynamic = 'force-dynamic';

async function getRecetas(): Promise<RecetasApiResponse | null> {
  try {
    const res = await fetch(
      'http://localhost:3000/api/recetas?limit=100&offset=0',
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Page ──────────────────────────────────────────────────

export default async function RecetasPage() {
  const apiData = await getRecetas();

  const activas = apiData?.activas ?? 0;
  const vencidas = apiData?.vencidas ?? 0;
  const historial = apiData?.historial ?? 0;
  const recetas = apiData?.data ?? [];

  return (
    <div className="space-y-6 animate-in">
      <PageHeader title="Recetas" description="Recetas activas, vencidas y renovaciones" />

      {/* Estadísticas (server-rendered) */}
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
  <div className="rounded-lg bg-emerald-500/5 p-3 text-center">
    <p className="text-xl sm:text-2xl font-bold text-emerald-600">{activas}</p>
    <p className="text-xs text-muted-foreground">Activas</p>
  </div>
  <div className="rounded-lg bg-red-500/5 p-3 text-center">
    <p className="text-xl sm:text-2xl font-bold text-red-600">{vencidas}</p>
    <p className="text-xs text-muted-foreground">Vencidas</p>
  </div>
  <div className="rounded-lg bg-blue-500/5 p-3 text-center">
    <p className="text-xl sm:text-2xl font-bold text-blue-600">{historial}</p>
    <p className="text-xs text-muted-foreground">Historial</p>
  </div>
</div>

      {/* Tabs + lista + acciones + modal (client) */}
      <RecetasClient initialRecetas={recetas} />
    </div>
  );
}
