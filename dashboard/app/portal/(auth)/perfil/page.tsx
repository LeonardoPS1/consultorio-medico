/**
 * Portal Perfil — Editar datos del perfil del paciente
 * Server component con DB directo (no self-fetch).
 */

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { pacientes } from '@/drizzle/schema';
import { db } from '@/lib/db';
import { getPortalSession } from '@/lib/portal-auth';
import PortalPerfilClient from './portal-perfil-client';

export const dynamic = 'force-dynamic';

interface PacienteData {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  email?: string;
  rut?: string;
  obraSocial?: string;
  sistemaSalud?: string;
  isapreNombre?: string;
  regionId?: string;
  comunaId?: string;
  region?: string;
  comuna?: string;
  consentimientoWhatsapp?: boolean;
  consentimientoEmail?: boolean;
}

/**
 *
 */
export default async function PortalPerfilPage() {
  const session = await getPortalSession();
  if (!session) redirect('/portal');

  const [paciente] = await db
    .select({
      nombre: pacientes.nombre,
      apellido: pacientes.apellido,
      telefono: pacientes.telefono,
      email: pacientes.email,
      rut: pacientes.rut,
      obraSocial: pacientes.obraSocial,
      sistemaSalud: pacientes.sistemaSalud,
      isapreNombre: pacientes.dni,
      regionId: pacientes.regionId,
      comunaId: pacientes.comunaId,
      region: pacientes.region,
      comuna: pacientes.comuna,
      consentimientoWhatsapp: pacientes.consentimientoWhatsapp,
      consentimientoEmail: pacientes.consentimientoEmail,
    })
    .from(pacientes)
    .where(eq(pacientes.id, session.pacienteId))
    .limit(1);

  const clean = paciente
    ? Object.fromEntries(
        Object.entries(paciente).map(([k, v]) => [k, v ?? undefined]),
      ) as PacienteData
    : {};

  return <PortalPerfilClient paciente={clean} />;
}
