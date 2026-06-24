import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface NotificacionData {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: 'turno' | 'mensaje' | 'receta' | 'urgencia' | 'sistema';
  leido: boolean;
  href: string | null;
  createdAt: string;
  deletedAt: string | null;
}

interface NotificacionesResponse {
  data: NotificacionData[];
  noLeidas: number;
}

async function fetchNotificaciones(): Promise<NotificacionesResponse> {
  const res = await fetch('/api/notificaciones?limit=20&soloNoLeidas=false');
  if (!res.ok) throw new Error('Error al cargar notificaciones');
  return res.json();
}

export function useNotifications() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notificaciones'],
    queryFn: fetchNotificaciones,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const marcarLeida = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notificaciones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read' }),
      });
      if (!res.ok) throw new Error('Error al marcar leída');
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notificaciones'] });
      const previous = queryClient.getQueryData<NotificacionesResponse>(['notificaciones']);
      if (previous) {
        queryClient.setQueryData<NotificacionesResponse>(['notificaciones'], {
          ...previous,
          data: previous.data.map((n) => (n.id === id ? { ...n, leido: true } : n)),
          noLeidas: Math.max(0, previous.noLeidas - 1),
        });
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notificaciones'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
    },
  });

  const marcarNoLeida = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notificaciones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unread' }),
      });
      if (!res.ok) throw new Error('Error al marcar no leída');
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notificaciones'] });
      const previous = queryClient.getQueryData<NotificacionesResponse>(['notificaciones']);
      if (previous) {
        queryClient.setQueryData<NotificacionesResponse>(['notificaciones'], {
          ...previous,
          data: previous.data.map((n) => (n.id === id ? { ...n, leido: false } : n)),
          noLeidas: previous.noLeidas + 1,
        });
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notificaciones'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
    },
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notificaciones/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Error al eliminar');
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notificaciones'] });
      const previous = queryClient.getQueryData<NotificacionesResponse>(['notificaciones']);
      if (previous) {
        const removed = previous.data.find((n) => n.id === id);
        queryClient.setQueryData<NotificacionesResponse>(['notificaciones'], {
          ...previous,
          data: previous.data.filter((n) => n.id !== id),
          noLeidas:
            removed && !removed.leido ? Math.max(0, previous.noLeidas - 1) : previous.noLeidas,
        });
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notificaciones'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
    },
  });

  const marcarTodasLeidas = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leidas' }),
      });
      if (!res.ok) throw new Error('Error al marcar todas leídas');
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notificaciones'] });
      const previous = queryClient.getQueryData<NotificacionesResponse>(['notificaciones']);
      if (previous) {
        queryClient.setQueryData<NotificacionesResponse>(['notificaciones'], {
          ...previous,
          data: previous.data.map((n) => ({ ...n, leido: true })),
          noLeidas: 0,
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notificaciones'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
    },
  });

  return {
    notificaciones: query.data?.data ?? [],
    noLeidas: query.data?.noLeidas ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    marcarLeida: marcarLeida.mutate,
    marcarNoLeida: marcarNoLeida.mutate,
    eliminar: eliminar.mutate,
    marcarTodasLeidas: marcarTodasLeidas.mutate,
    isMutating: marcarLeida.isPending || marcarNoLeida.isPending || eliminar.isPending,
  };
}
