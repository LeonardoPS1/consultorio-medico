import { NextRequest } from 'next/server';
import { apiHandler, success, ok } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody, updateHorariosSchema } from '@/lib/validations';
import { db } from '@/lib/db';
import { horariosAtencion } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const GET = apiHandler(async () => {
  await requireAuth();

  let horarios = await db.select().from(horariosAtencion).orderBy(horariosAtencion.dia);

  if (horarios.length === 0) {
    horarios = DIAS_SEMANA.map((dia, i) => ({
      id: '',
      dia,
      activo: i < 6,
      tipo: 'corrido',
      inicio: '09:00',
      fin: i < 5 ? '18:00' : '13:00',
      inicio2: null,
      fin2: null,
      tenantId: '00000000-0000-0000-0000-000000000000',
      sucursalId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  return success(horarios);
});

export const PUT = apiHandler(async (request: NextRequest) => {
  await requireAuth();

  const horarios = await parseBody(request, updateHorariosSchema);

  for (const h of horarios) {
    // updateHorariosSchema solo valida dia/activo/inicio/fin desde el cliente,
    // pero la DB soporta tipo/inicio2/fin2 para horarios partidos.
    const row = h as typeof h & { tipo?: string; inicio2?: string | null; fin2?: string | null };
    const existing = await db
      .select()
      .from(horariosAtencion)
      .where(eq(horariosAtencion.dia, row.dia))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(horariosAtencion)
        .set({
          activo: row.activo,
          tipo: row.tipo || 'corrido',
          inicio: row.inicio ?? undefined,
          fin: row.fin ?? undefined,
          inicio2: row.tipo === 'partido' ? row.inicio2 || null : null,
          fin2: row.tipo === 'partido' ? row.fin2 || null : null,
          updatedAt: new Date(),
        })
        .where(eq(horariosAtencion.dia, row.dia));
    } else {
      await db.insert(horariosAtencion).values({
        dia: row.dia,
        activo: row.activo,
        tipo: row.tipo || 'corrido',
        inicio: row.inicio ?? undefined,
        fin: row.fin ?? undefined,
        inicio2: row.tipo === 'partido' ? row.inicio2 || null : null,
        fin2: row.tipo === 'partido' ? row.fin2 || null : null,
      });
    }
  }

  return ok({ ok: true });
});
