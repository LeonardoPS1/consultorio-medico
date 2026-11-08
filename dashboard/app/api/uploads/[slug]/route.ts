import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPortalSession } from '@/lib/portal-auth';
import { puedeAccederArchivo } from '@/lib/upload-access';
import { getUploadDir } from '@/lib/upload-dir';

/** Extensions that may be served, mapped to their real content type. */
const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
};

/** Types that are safe to render inside the app (bitmap images only). */
const INLINE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/**
 * Serves a file from the uploads directory to its owner.
 *
 * Access requires an authenticated session (dashboard or patient portal) **and** a
 * record that references the file inside the caller's tenant. Denials always answer
 * 404 so a guessed file name never reveals whether the file exists.
 * @param request Incoming request (supports `?download=1`).
 * @param root0 Route params.
 * @param root0.params Promise with the file slug.
 * @returns The file stream or an error response.
 */
export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await paramsPromise;

    const dashboardSession = await auth();
    const portalSession = dashboardSession?.user?.id ? null : await getPortalSession();

    const userId = dashboardSession?.user?.id;
    const pacienteId = portalSession?.pacienteId;

    if (!userId && !pacienteId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const filename = slug;
    const download = request.nextUrl.searchParams.get('download') === '1';

    // Reject anything that could escape the uploads directory.
    if (
      !filename ||
      filename.includes('..') ||
      filename.includes('/') ||
      filename.includes('\\') ||
      filename.includes('\0')
    ) {
      return NextResponse.json({ error: 'Nombre de archivo inválido' }, { status: 400 });
    }

    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const contentType = CONTENT_TYPES[ext];
    if (!contentType) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

    const autorizado = await puedeAccederArchivo(filename, {
      tenantId: dashboardSession?.user?.tenantId ?? null,
      pacienteId: pacienteId ?? null,
    });

    if (!autorizado) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

    const filepath = path.join(getUploadDir(), filename);
    if (!existsSync(filepath)) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

    const buffer = await readFile(filepath);
    const safeName = filename.replace(/["\\\r\n]/g, '');

    // SVG stays inline so tenant logos keep rendering, but is sandboxed via CSP below.
    const inline =
      !download && (INLINE_TYPES.has(contentType) || contentType === 'image/svg+xml');

    const headers: Record<string, string> = {      'Content-Type': contentType,
      'Content-Length': String(buffer.byteLength),
      // Never let a shared/proxy cache store clinical documents.
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${safeName}"`,
      'Referrer-Policy': 'no-referrer',
    };

    // SVG can carry script; sandbox the document so it cannot act same-origin.
    if (contentType === 'image/svg+xml') {
      headers['Content-Security-Policy'] =
        "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox";
    }

    return new NextResponse(buffer, { headers });
  } catch (error) {
    // Log internally, never expose paths or driver details to the client.
    console.error('[Upload/Serve] Error al servir archivo:', error);
    return NextResponse.json({ error: 'Error al servir archivo' }, { status: 500 });
  }
}
