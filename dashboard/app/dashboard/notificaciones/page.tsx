/**
 * Notificaciones — Página principal
 *
 * Server Component: carga notificaciones server-side y pasa datos al cliente.
 * El cliente maneja filtros interactivos, mutations y refetches.
 */

export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { notificacionesService } from '@/lib/services/notificaciones';
import { NotificacionesClient } from './notificaciones-client';

interface NotificacionItem {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: 'turno' | 'mensaje' | 'receta' | 'urgencia' | 'sistema';
  prioridad: number;
  leido: boolean;
  href: string | null;
  createdAt: string;
}

async function getNotificaciones(): Promise<{
  notificaciones: NotificacionItem[];
  total: number;
  noLeidas: number;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { notificaciones: [], total: 0, noLeidas: 0 };
    }

    const result = await notificacionesService.list(session.user.id, { limit: 100 });

    return {
      notificaciones: result.data.map((n) => {
        const raw = n.createdAt;
        const createdAt =
          typeof raw === 'string'
            ? raw
            : raw instanceof Date
              ? raw.toISOString()
              : String(raw ?? '');
        return {
          id: n.id,
          titulo: n.titulo,
          descripcion: n.descripcion,
          tipo: n.tipo as NotificacionItem['tipo'],
          prioridad: n.prioridad,
          leido: n.leido,
          href: n.href,
          createdAt,
        };
      }),
      total: result.total,
      noLeidas: result.noLeidas,
    };
  } catch {
    return { notificaciones: [], total: 0, noLeidas: 0 };
  }
}

export default async function NotificacionesPage() {
  const data = await getNotificaciones();

  return (
    <NotificacionesClient
      initialNotificaciones={data.notificaciones}
      initialTotal={data.total}
      initialNoLeidas={data.noLeidas}
    />
  );
}
