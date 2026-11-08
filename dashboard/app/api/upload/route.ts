import { writeFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { safeError } from '@/lib/logger';
import { getPortalSession } from '@/lib/portal-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { getUploadDir } from '@/lib/upload-dir';

/** MIME types accepted per source, mapped to the extension we store them under. */
const ALLOWED_DASHBOARD: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

const ALLOWED_PORTAL: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

const MAX_SIZE_DASHBOARD = 5 * 1024 * 1024;
const MAX_SIZE_PORTAL = 20 * 1024 * 1024;

/** Uploads allowed per user inside the rate-limit window. */
const UPLOAD_RATE_LIMIT = { maxRequests: 30, windowMs: 10 * 60 * 1000 };

/**
 * Verifies that the payload actually looks like the declared MIME type.
 * Guards against a file being renamed/relabelled to sneak past the allowlist.
 * @param bytes File contents.
 * @param mime Declared MIME type (already validated against the allowlist).
 * @returns True when the signature matches the declared type.
 */
function coincideMagicBytes(bytes: Buffer, mime: string): boolean {
  const head = bytes.subarray(0, 16);

  switch (mime) {
    case 'image/jpeg':
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case 'image/png':
      return (
        head[0] === 0x89 &&
        head[1] === 0x50 &&
        head[2] === 0x4e &&
        head[3] === 0x47 &&
        head[4] === 0x0d &&
        head[5] === 0x0a &&
        head[6] === 0x1a &&
        head[7] === 0x0a
      );
    case 'image/gif':
      return bytes.subarray(0, 4).toString('ascii') === 'GIF8';
    case 'image/webp':
      return (
        bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
        bytes.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    case 'application/pdf':
      return bytes.subarray(0, 4).toString('ascii') === '%PDF';
    case 'image/svg+xml': {
      // Textual format: must start like markup and contain an <svg> root early on.
      const inicio = bytes.subarray(0, 64).toString('utf8').replace(/^\uFEFF/, '').trimStart();
      const muestra = bytes.subarray(0, 4096).toString('utf8').toLowerCase();
      return inicio.startsWith('<') && muestra.includes('<svg');
    }
    default:
      return false;
  }
}

/**
 * Receives a file, validates type/size/signature and stores it under the uploads
 * directory. Only the authenticated owner can later read it back through
 * `/api/uploads/[slug]`.
 * @param request Multipart request with fields `file` and optional `source`.
 * @returns `{ url, filename, userId }` on success.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const source = (formData.get('source') as string) || 'dashboard';

    let userId: string | null = null;
    if (source === 'portal') {
      const portalSession = await getPortalSession();
      if (!portalSession?.pacienteId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      userId = portalSession.pacienteId;
    } else {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      userId = session.user.id;
    }

    const { allowed, resetAt } = await checkRateLimit(`upload:${userId}`, UPLOAD_RATE_LIMIT);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Demasiadas subidas de archivos. Intenta más tarde.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)) },
        },
      );
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }

    const allowedTypes = source === 'portal' ? ALLOWED_PORTAL : ALLOWED_DASHBOARD;
    const ext = allowedTypes[file.type];
    if (!ext) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido.' }, { status: 400 });
    }

    const maxSize = source === 'portal' ? MAX_SIZE_PORTAL : MAX_SIZE_DASHBOARD;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error:
            source === 'portal'
              ? 'El archivo es muy grande. Máximo 20MB.'
              : 'La imagen es muy grande. Máximo 5MB.',
        },
        { status: 400 },
      );
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'El archivo está vacío.' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (!coincideMagicBytes(bytes, file.type)) {
      return NextResponse.json(
        { error: 'El contenido del archivo no coincide con su tipo.' },
        { status: 400 },
      );
    }

    const uploadDir = getUploadDir();
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    await writeFile(path.join(uploadDir, filename), bytes);

    return NextResponse.json({
      url: `/api/uploads/${filename}`,
      filename,
      userId,
    });
  } catch (error) {
    // Detail goes to the server log only; the client gets a generic message.
    safeError('[Upload] Error al guardar archivo:', error);
    return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 });
  }
}
