/**
 * Solicitudes de datos — Página principal (admin/médico)
 *
 * Server Component: verifica rol admin/médico y carga las solicitudes de
 * eliminación pendientes del tenant. Pasa todo al Client Component island.
 */

export const dynamic = 'force-dynamic';

import { getEffectiveSession } from '@/lib/auth-effective';
import { db } from '@/lib/db';
import { pacientes, solicitudesDatos } from '@/drizzle/schema';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { MisDatosClient } from './mis-datos-client';

interface SolicitudItem {
  id: string;
  tipo: string;
  estado: string;
  createdAt: string;
  pacienteNombre: string;
  pacienteApellido: string;
  pacienteEmail: string | null;
  pacienteTelefono: string;
}

function serializeDate(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val instanceof Date) return val.toISOString();
  return String(val ?? '');
}

async function getInitialData(): Promise<{
  data: SolicitudItem[];
  canView: boolean;
}> {
  try {
    const session = await getEffectiveSession();
    const role = session?.user?.role;
    const view = role === 'admin' || role === 'medico' || role === 'secretaria' || role === 'recepcionista';

    if (!view) {
      return { data: [], canView: false };
    }

    const rows = await db
      .select({
        id: solicitudesDatos.id,
        tipo: solicitudesDatos.tipo,
        estado: solicitudesDatos.estado,
        createdAt: solicitudesDatos.createdAt,
        pacienteNombre: pacientes.nombre,
        pacienteApellido: pacientes.apellido,
        pacienteEmail: pacientes.email,
        pacienteTelefono: pacientes.telefono,
      })
      .from(solicitudesDatos)
      .innerJoin(pacientes, eq(solicitudesDatos.pacienteId, pacientes.id))
      .where(
        and(
          eq(solicitudesDatos.tenantId, session?.user?.tenantId || '00000000-0000-0000-0000-000000000000'),
          eq(solicitudesDatos.tipo, 'eliminacion'),
          isNull(pacientes.deletedAt),
        ),
      )
      .orderBy(desc(solicitudesDatos.createdAt))
      .limit(100);

    return {
      data: rows.map((d) => ({
        id: d.id,
        tipo: d.tipo,
        estado: d.estado,
        createdAt: serializeDate(d.createdAt),
        pacienteNombre: d.pacienteNombre,
        pacienteApellido: d.pacienteApellido,
        pacienteEmail: d.pacienteEmail,
        pacienteTelefono: d.pacienteTelefono,
      })),
      canView: true,
    };
  } catch {
    return { data: [], canView: false };
  }
}

export default async function MisDatosPage() {
  const initial = await getInitialData();

  return <MisDatosClient initialData={initial.data} canView={initial.canView} />;
}
