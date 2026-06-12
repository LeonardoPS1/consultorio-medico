/**
 * Lista de Espera — Página principal
 *
 * Server Component: carga datos de la API y renderiza KPIs + pasa datos al cliente.
 */

export const dynamic = 'force-dynamic';

import { ListChecks, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { ListaEsperaClient } from './lista-espera-client';
import { PageHeader } from '@/components/page-header';
import { waitlistService } from '@/lib/services/waitlist';

interface WaitlistItem {
  id: string;
  pacienteId: string;
  medicoId: string;
  fechaInscripcion: Date;
  estado: string;
  notas: string | null;
  pacienteNombre: string | null;
  pacienteApellido: string | null;
  pacienteTelefono: string | null;
  medicoNombre: string | null;
}

async function getWaitlist(): Promise<WaitlistItem[]> {
  try {
    return await waitlistService.listar(undefined, 'activa');
  } catch {
    return [];
  }
}

export default async function ListaEsperaPage() {
  const items = await getWaitlist();

  const total = items.length;
  const pacientesUnicos = new Set(items.map((i) => i.pacienteId)).size;
  const medicosUnicos = new Set(items.map((i) => i.medicoId)).size;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader title="Lista de Espera" />

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <ListChecks className="h-4 w-4" />
            En espera
          </div>
          <p className="text-2xl font-bold mt-1">{total}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Clock className="h-4 w-4" />
            Pacientes únicos
          </div>
          <p className="text-2xl font-bold mt-1">{pacientesUnicos}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <CheckCircle2 className="h-4 w-4" />
            Médicos involucrados
          </div>
          <p className="text-2xl font-bold mt-1">{medicosUnicos}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <XCircle className="h-4 w-4" />
            Sin oferta activa
          </div>
          <p className="text-2xl font-bold mt-1">{total}</p>
        </div>
      </div>

      {/* Tabla interactiva */}
      <ListaEsperaClient initialItems={items} />
    </div>
  );
}
