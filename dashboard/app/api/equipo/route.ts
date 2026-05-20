import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { usuarios } from '@/drizzle/schema';
import { eq, ne, and } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const miembros = await db
      .select({
        id: usuarios.id,
        nombre: usuarios.nombre,
        email: usuarios.email,
        rol: usuarios.rol,
        plan: usuarios.plan,
        ultimoAcceso: usuarios.ultimoAcceso,
        activo: usuarios.activo,
      })
      .from(usuarios)
      .where(and(
        eq(usuarios.activo, true),
        ne(usuarios.id, session.user.id), // no incluir al usuario actual
      ))
      .orderBy(usuarios.nombre);

    const formatted = miembros.map((m) => ({
      id: m.id,
      nombre: m.nombre,
      email: m.email,
      rol: m.rol === 'admin' ? 'Administrador' : m.rol === 'medico' ? 'Médico' : m.rol,
      ultimo: m.ultimoAcceso
        ? formatoTiempoRelativo(new Date(m.ultimoAcceso))
        : 'Nunca',
    }));

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error('[Equipo GET]', error);
    return NextResponse.json({ data: [] });
  }
}

function formatoTiempoRelativo(fecha: Date): string {
  const diff = Date.now() - fecha.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `Hace ${horas} hs`;
  const dias = Math.floor(horas / 24);
  return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
}
