/**
 * Portal Privacidad — Registro de accesos a la ficha del paciente.
 * Muestra quién accedió a su información y cuándo, en lenguaje simple.
 * Server component con DB directo (no self-fetch).
 */

import { eq, desc, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { auditoriaAccesos } from '@/drizzle/schema';
import { db } from '@/lib/db';
import { getPortalSession } from '@/lib/portal-auth';
import PortalPrivacidadClient from './portal-privacidad-client';

export const dynamic = 'force-dynamic';

interface AccesoEntry {
  id: string;
  fecha: string;
  usuario: string;
  accion: string;
  tipo: 'view' | 'export' | 'other';
  detalle: string | null;
}

const ACCIONES_SIMPLES: Record<string, { texto: string; tipo: 'view' | 'export' | 'other' }> = {
  view: { texto: 'Consulta de tu ficha', tipo: 'view' },
  export: { texto: 'Exportación de tus datos', tipo: 'export' },
};

function accionLegible(accion: string): { texto: string; tipo: 'view' | 'export' | 'other' } {
  if (accion === 'view') return ACCIONES_SIMPLES.view;
  if (accion === 'export') return ACCIONES_SIMPLES.export;
  if (accion.startsWith('ARCO_')) return { texto: 'Solicitud de tus derechos ARCO', tipo: 'other' };
  if (accion === 'SOLICITUD_BAJA') return { texto: 'Solicitud de baja', tipo: 'other' };
  if (accion === 'BAJA_CONFIRMADA') return { texto: 'Baja confirmada', tipo: 'other' };
  return { texto: 'Acceso a tus datos', tipo: 'other' };
}

/**
 *
 */
export default async function PortalPrivacidadPage() {
  const session = await getPortalSession();
  if (!session) redirect('/portal');

  const registros = await db
    .select({
      id: auditoriaAccesos.id,
      fecha: sql<string>`${auditoriaAccesos.createdAt}::text`,
      usuario: sql<string>`COALESCE(${auditoriaAccesos.usuarioNombre}, ${auditoriaAccesos.usuarioEmail}, 'Personal del consultorio')`,
      accion: auditoriaAccesos.accion,
      detalle: auditoriaAccesos.detalle,
    })
    .from(auditoriaAccesos)
    .where(eq(auditoriaAccesos.entidadId, session.pacienteId))
    .orderBy(desc(auditoriaAccesos.createdAt))
    .limit(50);

  const accesos: AccesoEntry[] = registros.map((r) => {
    const legible = accionLegible(r.accion);
    return {
      id: r.id,
      fecha: r.fecha,
      usuario: r.usuario,
      accion: legible.texto,
      tipo: legible.tipo,
      detalle: r.detalle,
    };
  });

  return (
    <PortalPrivacidadClient
      accesos={accesos}
      pacienteNombre={`${session.nombre} ${session.apellido}`}
    />
  );
}
