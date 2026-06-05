import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { auth } from '@/lib/auth';

// Directorio donde se guardan los uploads
// Usar variable de entorno UPLOAD_DIR si está configurada (ej: /data/dashboard/uploads en Docker),
// o por defecto .data/uploads/ junto a la app
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), '.data', 'uploads');

/** Extensiones permitidas */
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }

    // Validar tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Usá JPG, PNG, WebP, GIF o SVG.' },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'La imagen es muy grande. Máximo 5MB.' },
        { status: 400 }
      );
    }

    // Crear directorio si no existe
    if (!existsSync(UPLOAD_DIR)) {
      mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // Nombre único: timestamp + random + extensión original
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: 'Extensión no permitida' }, { status: 400 });
    }

    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Escribir archivo
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    return NextResponse.json({
      url: `/api/uploads/${filename}`,
      filename,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    const stack = error instanceof Error ? error.stack : '';
    console.error('[Upload] Error:', msg, '| Dir:', UPLOAD_DIR, '| CWD:', process.cwd());
    if (stack) console.error('[Upload] Stack:', stack);
    return NextResponse.json(
      { error: `Error al subir archivo: ${msg}` },
      { status: 500 }
    );
  }
}
