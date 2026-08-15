import { NextRequest, NextResponse } from 'next/server';
import { workflowLogs } from '@/drizzle/schema';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/lib/db';
import { calcularOcupacionTenant, calcularOcupacionFranjas } from '@/lib/services/ocupacion-franjas';

export const dynamic = 'force-dynamic';

const WF_ID = 'WF-16-ocupacion';
const WF_NAME = 'Workflow 16: Análisis de ocupación y benchmark nocturno';

/**
 * POST /api/internal/ocupacion/calcular - Endpoint interno para job nocturno (WF-16).
 * Valida header x-internal-key, calcula la ocupación (on-demand, sin persistir)
 * y loggea el resultado en workflow_logs. Acepta opcional tenantId/sucursalId/sem.
 *
 * Construido a modo de warm-up/verificación: el heatmap real que consume el
 * dashboard se calcula on-demand en GET /api/reportes/ocupacion.
 *
 * Respuesta plana: { mensaje, franzas, totalTurnos, errores }
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const internalKey = request.headers.get('x-internal-key');
  const expectedKey = process.env.INTERNAL_API_KEY;
  if (!expectedKey || internalKey !== expectedKey) {
    await db.insert(workflowLogs).values({
      workflowId: WF_ID,
      workflowName: WF_NAME,
      nivel: 'error',
      mensaje: 'Intento de acceso no autorizado al job de ocupación',
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    tenantId?: string;
    sucursalId?: string;
    semanas?: string | number;
  };
  const tenantId: string | undefined = body.tenantId;
  const sucursalId: string | undefined = body.sucursalId;
  const semanas = Number(body.semanas) || 12;

  let totalFranjas = 0;
  let totalTurnos = 0;
  let erroresMsg = '';

  try {
    if (tenantId) {
      const reporte = await calcularOcupacionTenant({ tenantId, sucursalId, semanas });
      totalFranjas = reporte.franjas.length;
      totalTurnos = reporte.totalTurnos;
    } else {
      const reporte = await calcularOcupacionFranjas({ sucursalId, semanas });
      totalFranjas = reporte.franjas.length;
      totalTurnos = reporte.totalTurnos;
    }
  } catch (error) {
    erroresMsg = error instanceof Error ? error.message : 'Error desconocido';
    await db.insert(workflowLogs).values({
      workflowId: WF_ID,
      workflowName: WF_NAME,
      nivel: 'error',
      mensaje: `Ocupación: error al calcular (${erroresMsg})`,
    });
    return NextResponse.json(
      { mensaje: `Ocupación: error al calcular (${erroresMsg})`, franjas: 0, totalTurnos: 0, errores: 1 },
      { status: 200 },
    );
  }

  await db.insert(workflowLogs).values({
    workflowId: WF_ID,
    workflowName: WF_NAME,
    nivel: 'info',
    mensaje: `Ocupación calculada: ${totalFranjas} franjas, ${totalTurnos} turnos analizados`,
    metadata: { tenantId: tenantId ?? null, semanas },
  });

  return NextResponse.json(
    { mensaje: `Ocupación analizada: ${totalFranjas} franjas, ${totalTurnos} turnos`, franjas: totalFranjas, totalTurnos, errores: 0 },
    { status: 200 },
  );
});
