/**
 * API Keys — Gestión desde el dashboard
 *
 * GET:  Listar keys del tenant actual
 * POST: Crear una nueva API key
 * DELETE /api/api-keys/:id: Revocar una API key
 *
 * Protegido por sesión de dashboard (admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { createApiKey, listApiKeys, deleteApiKey, API_SCOPES } from '@/lib/public-api-auth';

const VALID_SCOPES = Object.values(API_SCOPES);

const createApiKeySchema = z.object({
  nombre: z.string().min(1).max(100),
  scopes: z
    .array(z.enum(VALID_SCOPES as [string, ...string[]]))
    .optional()
    .default(VALID_SCOPES),
  expiresAt: z.string().datetime().optional(),
});

// Session helper with strict user.id check
async function getSession(): Promise<{
  user: {
    id: string;
    role: string;
    plan: string;
    name: string;
    email: string;
    tenantId?: string;
  };
} | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session as {
    user: {
      id: string;
      role: string;
      plan: string;
      name: string;
      email: string;
      tenantId?: string;
    };
  };
}

// ─── GET: Listar API keys ────────────────────────────────────

/**
 * Lista las API keys del tenant actual.
 * @returns {Promise<NextResponse>} La respuesta JSON con las API keys.
 */
export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const tenantId = session.user.tenantId ?? '00000000-0000-0000-0000-000000000000';
  const keys = await listApiKeys(tenantId);

  return NextResponse.json({ apiKeys: keys });
}

// ─── POST: Crear API key ─────────────────────────────────────

/**
 * Crea una nueva API key para el tenant actual.
 * @param {NextRequest} request - La solicitud HTTP entrante.
 * @returns {Promise<NextResponse>} La respuesta JSON con la key creada.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const parsed = createApiKeySchema.parse(body);
  const expiresAt = parsed.expiresAt ? new Date(parsed.expiresAt) : undefined;

  try {
    const result = await createApiKey({
      nombre: parsed.nombre.trim(),
      scopes: parsed.scopes,
      createdBy: session.user.id,
      expiresAt,
      tenantId: session.user.tenantId,
    });

    // Devolver la key completa (única vez)
    return NextResponse.json(
      {
        id: result.id,
        fullKey: result.keyData.fullKey,
        keyPrefix: result.keyData.keyPrefix,
        nombre: parsed.nombre.trim(),
        scopes: parsed.scopes,
        advertencia: 'Guardá esta key. No se mostrará nuevamente.',
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: 'Error al crear API key' }, { status: 500 });
  }
}

// ─── DELETE: Eliminar API key ───────────────────────────────

/**
 * Elimina definitivamente una API key del tenant.
 * Reemplaza el soft-revoke (activa=false) por borrado físico,
 * para que las keys revocadas no queden para siempre en la lista.
 * @param {NextRequest} request - La solicitud HTTP entrante.
 * @returns {Promise<NextResponse>} Confirmación de eliminación o un error.
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get('id');

  if (!keyId) {
    return NextResponse.json({ error: 'ID de key requerido' }, { status: 400 });
  }

  try {
    await deleteApiKey(keyId, session.user.tenantId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error al eliminar key' }, { status: 500 });
  }
}
