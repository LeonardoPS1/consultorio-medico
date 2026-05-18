import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

// GET /api/admin/tenants - Listar todos los tenants
export async function GET() {
  try {
    const session = await auth();
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await db.execute(
      sql`SELECT id, nombre, subdomain, activo, created_at FROM tenants ORDER BY created_at DESC`
    );

    return NextResponse.json(Array.isArray(result) ? result : []);
  } catch (error) {
    console.error('[admin/tenants] Error:', error);
    return NextResponse.json({ error: 'Error al cargar tenants' }, { status: 500 });
  }
}

// POST /api/admin/tenants - Crear nuevo tenant
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { nombre, subdomain } = await request.json();

    if (!nombre?.trim() || !subdomain?.trim()) {
      return NextResponse.json({ error: 'Nombre y subdominio requeridos' }, { status: 400 });
    }

    // Validar subdominio
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(subdomain)) {
      return NextResponse.json(
        { error: 'Subdominio inválido. Usá solo letras minúsculas, números y guiones.' },
        { status: 400 }
      );
    }

    // Verificar subdominio único
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing: any = await db.execute(
      sql`SELECT id FROM tenants WHERE subdomain = ${subdomain} LIMIT 1`
    );

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'El subdominio ya está en uso' }, { status: 409 });
    }

    await db.execute(
      sql`INSERT INTO tenants (nombre, subdomain) VALUES (${nombre.trim()}, ${subdomain.trim()})`
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/tenants] POST Error:', error);
    return NextResponse.json({ error: 'Error al crear tenant' }, { status: 500 });
  }
}
