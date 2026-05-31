import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { PacienteDetalleClient } from './paciente-detalle-client';

// ─── Types ────────────────────────────────────────────────

interface TurnoRow {
  id: string;
  fechaHora: string;
  estado: string;
  tipoConsulta: string;
  motivo: string | null;
  medicoNombre: string | null;
  duracionMinutos: number;
  notasMedico: string | null;
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

interface HistorialRow {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  diagnosticoCodigo: string | null;
  diagnosticoDescripcion: string | null;
  fecha: string;
}

interface PacienteDetalle {
  paciente: {
    id: string;
    nombre: string;
    apellido: string;
    telefono: string;
    email: string | null;
    dni: string | null;
    fechaNacimiento: string | null;
    direccion: string | null;
    obraSocial: string | null;
    numeroAfiliado: string | null;
    alergias: string | null;
    medicacionCronica: string | null;
    notasMedicas: string | null;
    tags: string[];
    consentimientoWhatsapp: boolean;
    createdAt: string;
  };
  turnos: TurnoRow[];
  recetas: RecetaRow[];
  historial: HistorialRow[];
  ultimaConversacion: { id: string; estado: string } | null;
  stats: {
    totalTurnos: number;
    totalRecetas: number;
    totalHistorial: number;
    totalNotasSoap: number;
    turnosPorEstado: Record<string, number>;
    recetasPorEstado: Record<string, number>;
  };
  bajaSolicitadaAt?: string | null;
  bajaConfirmada?: boolean;
}

// ─── Data fetching ─────────────────────────────────────────

export const dynamic = 'force-dynamic';

async function getPacienteDetalle(id: string): Promise<PacienteDetalle | null> {
  try {
    const headersList = headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = host === 'localhost:3000' || host === '127.0.0.1:3000' ? 'http' : 'https';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    const res = await fetch(
      `${baseUrl}/api/pacientes/${id}/detalle`,
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

export default async function PacienteDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getPacienteDetalle(params.id);
  if (!data) notFound();

  const { paciente, turnos, recetas, historial, ultimaConversacion, stats, bajaSolicitadaAt, bajaConfirmada } = data;

  return <PacienteDetalleClient
    paciente={paciente}
    turnos={turnos}
    recetas={recetas}
    historial={historial}
    ultimaConversacion={ultimaConversacion}
    stats={stats}
    bajaSolicitadaAt={bajaSolicitadaAt}
    bajaConfirmada={bajaConfirmada}
  />;
}
