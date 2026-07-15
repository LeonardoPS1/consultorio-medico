/**
 * GET /api/portal/auth/status — Estado del portal + pacientes de prueba
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pacientes } from '@/drizzle/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

export async function GET() {
  const bypass = process.env.PORTAL_BYPASS === 'true';
  const isDev = process.env.NODE_ENV !== 'production';
  const bypassHabilitado = bypass || isDev;

  let pacientesData: { id: string; nombre: string; apellido: string; telefono: string }[] = [];

  if (bypassHabilitado) {
    const rows = await db
      .select({
        id: pacientes.id,
        nombre: pacientes.nombre,
        apellido: pacientes.apellido,
        telefono: pacientes.telefono,
      })
      .from(pacientes)
      .where(and(sql`${pacientes.deletedAt} IS NULL`))
      .orderBy(desc(pacientes.updatedAt))
      .limit(20);
    pacientesData = rows.map((p) => ({
      id: p.id,
      nombre: p.nombre ?? '',
      apellido: p.apellido ?? '',
      telefono: p.telefono ?? '',
    }));
  }

  return NextResponse.json({
    bypass: bypassHabilitado,
    bypassActivo: bypassHabilitado,
    ambiente: isDev ? 'desarrollo' : 'produccion',
    pacientes: bypassHabilitado ? pacientesData : [],
  });
}
