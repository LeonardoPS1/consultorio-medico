/**
 * GET  /api/ia/settings — Obtener configuración del asistente IA flotante.
 * PUT /api/ia/settings — Actualizar configuración del asistente IA flotante.
 *
 * Admin only — actualiza solo los campos del asistente en tenants.config_ia.
 * Los campos del bot de WhatsApp (prompt, maxTokens, temperatura) no se tocan acá.
 */

import { NextRequest } from 'next/server';
import { apiHandler, success, fail } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';
import { requireAuth } from '@/lib/api-auth';
import { parseBody } from '@/lib/validations';
import { db } from '@/lib/db';
import { tenants } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { ConfigIa } from '@/drizzle/schema';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

const DEFAULT_ASISTENTE_CONFIG = {
  asistenteHabilitado: true,
  modoDefault: 'silencioso' as const,
  sugerenciasHabilitadas: {
    conversaciones: true,
    pacientes: true,
    turnos: true,
    recetas: true,
  },
  promptAsistente:
    'Sos el asistente IA del consultorio médico. Ayudás al médico con información rápida, sugerencias de respuestas para pacientes, resúmenes de historiales y recordatorios de turnos. Respondés en español neutro chileno, de forma concisa y profesional. Si no sabés algo, decilo honestamente. Nunca inventas datos médicos.',
  maxTokensAsistente: 400,
  temperaturaAsistente: 0.3,
};

const putBodySchema = z.object({
  asistenteHabilitado: z.boolean().optional(),
  modoDefault: z.enum(['silencioso', 'sugerente', 'activo']).optional(),
  sugerenciasHabilitadas: z
    .object({
      conversaciones: z.boolean().optional(),
      pacientes: z.boolean().optional(),
      turnos: z.boolean().optional(),
      recetas: z.boolean().optional(),
    })
    .optional(),
  promptAsistente: z.string().min(10).max(2000).optional(),
  maxTokensAsistente: z.number().int().min(50).max(2000).optional(),
  temperaturaAsistente: z.number().min(0).max(2).optional(),
});

// ─── GET ─────────────────────────────────────────────────────

export const GET = apiHandler(async () => {
  const session = await requireAuth();

  const [tenant] = await db
    .select({ configIa: tenants.configIa })
    .from(tenants)
    .where(eq(tenants.id, DEFAULT_TENANT_ID))
    .limit(1);

  const configIa = (
    tenant?.configIa && typeof tenant.configIa === 'object' && 'prompt' in tenant.configIa
      ? tenant.configIa
      : {}
  ) as Partial<ConfigIa>;

  // Extraer solo los campos del asistente
  const asistenteConfig = {
    asistenteHabilitado: configIa.asistenteHabilitado ?? DEFAULT_ASISTENTE_CONFIG.asistenteHabilitado,
    modoDefault: configIa.modoDefault ?? DEFAULT_ASISTENTE_CONFIG.modoDefault,
    sugerenciasHabilitadas: {
      ...DEFAULT_ASISTENTE_CONFIG.sugerenciasHabilitadas,
      ...(configIa.sugerenciasHabilitadas || {}),
    },
    promptAsistente: configIa.promptAsistente ?? DEFAULT_ASISTENTE_CONFIG.promptAsistente,
    maxTokensAsistente: configIa.maxTokensAsistente ?? DEFAULT_ASISTENTE_CONFIG.maxTokensAsistente,
    temperaturaAsistente: configIa.temperaturaAsistente ?? DEFAULT_ASISTENTE_CONFIG.temperaturaAsistente,
  };

  return success({ config: asistenteConfig });
});

// ─── PUT ─────────────────────────────────────────────────────

export const PUT = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') fail('No autorizado', 403);

  const body = await parseBody(request, putBodySchema);

  const [tenant] = await db
    .select({ configIa: tenants.configIa })
    .from(tenants)
    .where(eq(tenants.id, DEFAULT_TENANT_ID))
    .limit(1);

  const current = (
    tenant?.configIa && typeof tenant.configIa === 'object' && 'prompt' in tenant.configIa
      ? tenant.configIa
      : {}
  ) as Partial<ConfigIa>;

  // Merge: solo actualizar campos del asistente, preservar los del bot WhatsApp
  const merged: ConfigIa = {
    prompt: current.prompt || 'Sos el asistente virtual del consultorio médico.',
    maxTokens: current.maxTokens ?? 300,
    temperatura: current.temperatura ?? 0.3,
    asistenteHabilitado: body.asistenteHabilitado ?? current.asistenteHabilitado ?? true,
    modoDefault: body.modoDefault ?? current.modoDefault ?? 'silencioso',
    sugerenciasHabilitadas: {
      ...DEFAULT_ASISTENTE_CONFIG.sugerenciasHabilitadas,
      ...(current.sugerenciasHabilitadas || {}),
      ...(body.sugerenciasHabilitadas || {}),
    },
    promptAsistente: body.promptAsistente ?? current.promptAsistente ?? DEFAULT_ASISTENTE_CONFIG.promptAsistente,
    maxTokensAsistente: body.maxTokensAsistente ?? current.maxTokensAsistente ?? 400,
    temperaturaAsistente: body.temperaturaAsistente ?? current.temperaturaAsistente ?? 0.3,
  };

  await db.update(tenants).set({ configIa: merged }).where(eq(tenants.id, DEFAULT_TENANT_ID));

  return success({
    config: {
      asistenteHabilitado: merged.asistenteHabilitado,
      modoDefault: merged.modoDefault,
      sugerenciasHabilitadas: merged.sugerenciasHabilitadas,
      promptAsistente: merged.promptAsistente,
      maxTokensAsistente: merged.maxTokensAsistente,
      temperaturaAsistente: merged.temperaturaAsistente,
    },
    message: 'Configuración del asistente IA actualizada',
  });
});
