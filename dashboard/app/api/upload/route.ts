import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { auth } from '@/lib/auth';
import { getPortalSession } from '@/lib/portal-auth';
import { getUploadDir } from '@/lib/upload-dir';

const ALLOWED_TYPES_DASHBOARD = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const ALLOWED_TYPES_PORTAL = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'pdf'];

export async function POST(request: NextRequest) {
  let uploadDir = '';
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

    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }

    const allowedTypes = source === 'portal' ? ALLOWED_TYPES_PORTAL : ALLOWED_TYPES_DASHBOARD;
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido.' },
        { status: 400 },
      );
    }

    const MAX_SIZE = source === 'portal' ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: source === 'portal' ? 'El archivo es muy grande. Máximo 20MB.' : 'La imagen es muy grande. Máximo 5MB.' },
        { status: 400 },
      );
    }

    uploadDir = getUploadDir();

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: 'Extensión no permitida' }, { status: 400 });
    }

    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filepath = path.join(uploadDir, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    return NextResponse.json({
      url: `/api/uploads/${filename}`,
      filename,
      userId,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    const stack = error instanceof Error ? error.stack : '';
    console.error('[Upload] Error:', msg, '| Dir:', uploadDir || 'N/A', '| CWD:', process.cwd());
    if (stack) console.error('[Upload] Stack:', stack);
    return NextResponse.json({ error: `Error al subir archivo: ${msg}` }, { status: 500 });
  }
}
