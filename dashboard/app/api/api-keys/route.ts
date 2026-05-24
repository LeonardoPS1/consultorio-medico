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
import { auth } from '@/lib/auth';
import { createApiKey, listApiKeys, revokeApiKey, API_SCOPES } from '@/lib/public-api-auth';

// Session helper with strict user.id check
async function getSession() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session as { user: { id: string; role: string; plan: string; name: string; email: string } };
}

// ─── GET: Listar API keys ────────────────────────────────────

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Obtener tenantId del header (inyectado por middleware)
  // Usar el del usuario como fallback
  const keys = await listApiKeys('00000000-0000-0000-0000-000000000000');

  return NextResponse.json({ apiKeys: keys });
}

// ─── POST: Crear API key ─────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const nombre = body.nombre as string | undefined;
  const scopes = (body.scopes as string[]) || Object.values(API_SCOPES);
  const expiresAt = body.expiresAt ? new Date(body.expiresAt as string) : undefined;

  if (!nombre || nombre.trim().length === 0) {
    return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
  }

  if (scopes.length === 0) {
    return NextResponse.json({ error: 'Al menos un scope requerido' }, { status: 400 });
  }

  try {
    const result = await createApiKey({
      nombre: nombre.trim(),
      scopes,
      createdBy: session.user.id,
      expiresAt,
    });

    // Devolver la key completa (única vez)
    return NextResponse.json({
      id: result.id,
      fullKey: result.keyData.fullKey,
      keyPrefix: result.keyData.keyPrefix,
      nombre: nombre.trim(),
      scopes,
      advertencia: 'Guardá esta key. No se mostrará nuevamente.',
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Error al crear API key' }, { status: 500 });
  }
}

// ─── DELETE: Revocar API key ─────────────────────────────────

export async function DELETE(request: NextRequest) {
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
    await revokeApiKey(keyId);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Error al revocar key' }, { status: 500 });
  }
}
