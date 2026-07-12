import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { cache } from '@/lib/cache';
import { getDashboardStats } from '@/lib/services/dashboard-stats';

export const dynamic = 'force-dynamic';

const CACHE_TTL = 30_000;

export async function GET(request: Request) {
  try {
    const session = await auth();
    const sessionMedicoId = session?.user?.medicoId;
    const sessionRol = session?.user?.role;
    const isMedico = sessionRol === 'medico' && !!sessionMedicoId;

    const { searchParams } = new URL(request.url);
    const sucursalId = searchParams.get('sucursalId') || undefined;

    const cacheKey = `dashboard:stats:${sessionMedicoId ?? 'admin'}:${sucursalId ?? 'todas'}`;

    const data = await cache.getOrSet(
      cacheKey,
      () =>
        getDashboardStats({
          medicoId: sessionMedicoId ?? undefined,
          isMedico,
          sucursalId,
        }),
      CACHE_TTL,
    );

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      kpis: [
        { title: 'Turnos Hoy', value: '0', change: '0', type: 'calendar' },
        { title: 'Pacientes Nuevos', value: '0', change: '0%', type: 'users' },
        { title: 'Mensajes Pendientes', value: '0', change: '0', type: 'messages' },
        { title: 'Alertas', value: '0', change: 'Sin novedades', type: 'alert' },
        { title: 'Tasa Respuesta', value: '0%', change: 'Sin datos', type: 'response' },
        { title: 'Mensajes Hoy', value: '0', change: '0', type: 'today' },
      ],
      proximosTurnos: [],
      actividadReciente: [],
      sistema: { online: true, conversacionesActivas: 0, datosReales: false },
    });
  }
}
