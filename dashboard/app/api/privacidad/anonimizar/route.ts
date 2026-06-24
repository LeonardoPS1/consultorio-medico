/**
 * POST /api/privacidad/anonimizar
 *
 * Endpoint interno para que n8n (WF-09) ejecute la anonimización
 * post-período de retención de pacientes dados de baja.
 *
 * Anonimiza permanentemente los datos de pacientes cuyo deletedAt
 * superó el período de retención (90 días por defecto).
 *
 * @body { dias?: number } - Días de retención (default: 90)
 * @returns { anonimizados: number } - Cantidad de pacientes procesados
 */

import { NextRequest } from 'next/server';
import { apiHandler, success } from '@/lib/api-handler';
import {
  privacidadService,
  getPeriodoRetencionConfig,
  PERIODO_RETENCION_BAJA_DIAS,
} from '@/lib/services/privacidad';
import { verifyRequestSecret } from '@/lib/verify-webhook-secret';
import { withRateLimit } from '@/lib/rate-limit';

const postHandler = apiHandler(async (request: NextRequest) => {
  // Verificar webhook secret (timing-safe)
  if (!verifyRequestSecret(request)) {
    return success({ error: 'No autorizado' }, 401);
  }

  const body = await request.json().catch(() => ({}));
  // Usar el valor enviado, o el configurado en DB, o el default (90)
  const dias = body.dias ?? (await getPeriodoRetencionConfig()) ?? PERIODO_RETENCION_BAJA_DIAS;

  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - dias);

  const anonimizados = await privacidadService.anonimizarPostRetencion(fechaLimite);

  return success({
    anonimizados,
    fechaLimite: fechaLimite.toISOString(),
    mensaje:
      anonimizados > 0
        ? `${anonimizados} paciente(s) anonimizado(s) post-retención`
        : 'No hay pacientes pendientes de anonimización',
  });
});

// Rate limit: 5 requests/min por IP (n8n llama cada 24h, esto es safety net)
export const POST = withRateLimit(postHandler, { maxRequests: 5, windowMs: 60_000 });
