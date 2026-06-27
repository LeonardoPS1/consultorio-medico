import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================================
// Tipos
// ============================================================

interface NotificacionData {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: 'turno' | 'mensaje' | 'receta' | 'urgencia' | 'sistema';
  prioridad: number;
  leido: boolean;
  href: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface ConteoPorTipo {
  turno: number;
  mensaje: number;
  receta: number;
  urgencia: number;
  sistema: number;
}

export interface SilenciarPorTipo {
  turno: boolean;
  mensaje: boolean;
  receta: boolean;
  urgencia: boolean;
  sistema: boolean;
}

interface NotificacionesResponse {
  data: NotificacionData[];
  noLeidas: number;
  conteoPorTipo?: ConteoPorTipo;
}

interface PreferenciasNotificaciones {
  urgenciasWhatsapp: boolean;
  resumenDiarioEmail: boolean;
  alertasAusentismo: boolean;
  nuevosPacientes: boolean;
  whatsappPersonal: string;
  silenciarPorTipo: SilenciarPorTipo;
}

const DEFAULT_SILENCIAR: SilenciarPorTipo = {
  turno: false,
  mensaje: false,
  receta: false,
  urgencia: false,
  sistema: false,
};

/** Prioridad de ordenamiento: urgencia=0 (más alta), sistema=4 */
const PRIORIDAD_POR_TIPO: Record<string, number> = {
  urgencia: 0,
  receta: 1,
  turno: 2,
  mensaje: 3,
  sistema: 4,
};

// ============================================================
// Fetchers
// ============================================================

async function fetchNotificaciones(): Promise<NotificacionesResponse> {
  const res = await fetch('/api/notificaciones?limit=20&soloNoLeidas=false&conteoPorTipo=true');
  if (!res.ok) throw new Error('Error al cargar notificaciones');
  return res.json();
}

async function fetchPreferencias(): Promise<PreferenciasNotificaciones> {
  const res = await fetch('/api/notificaciones?preferencias=true');
  if (!res.ok) throw new Error('Error al cargar preferencias');
  const json = await res.json();
  return {
    urgenciasWhatsapp: json.data?.urgenciasWhatsapp ?? json.urgenciasWhatsapp ?? true,
    resumenDiarioEmail: json.data?.resumenDiarioEmail ?? json.resumenDiarioEmail ?? true,
    alertasAusentismo: json.data?.alertasAusentismo ?? json.alertasAusentismo ?? true,
    nuevosPacientes: json.data?.nuevosPacientes ?? json.nuevosPacientes ?? false,
    whatsappPersonal: json.data?.whatsappPersonal ?? json.whatsappPersonal ?? '',
    silenciarPorTipo: json.data?.silenciarPorTipo ?? json.silenciarPorTipo ?? DEFAULT_SILENCIAR,
  };
}

// ============================================================
// Hook
// ============================================================

export function useNotifications() {
  const queryClient = useQueryClient();

  // ─── Query de notificaciones ────────────────────────────
  const query = useQuery({
    queryKey: ['notificaciones'],
    queryFn: fetchNotificaciones,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  // ─── Query de preferencias ──────────────────────────────
  const prefsQuery = useQuery({
    queryKey: ['notificaciones-preferencias'],
    queryFn: fetchPreferencias,
    staleTime: 60_000,
  });

  // ─── Mutaciones existentes ──────────────────────────────

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
          conteoPorTipo: previous.conteoPorTipo
            ? decrementarConteo(previous.conteoPorTipo, previous.data.find((n) => n.id === id)?.tipo)
            : previous.conteoPorTipo,
        });
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['notificaciones'], context.previous);
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
          conteoPorTipo: previous.conteoPorTipo
            ? incrementarConteo(previous.conteoPorTipo, previous.data.find((n) => n.id === id)?.tipo)
            : previous.conteoPorTipo,
        });
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['notificaciones'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
    },
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notificaciones/${id}`, { method: 'DELETE' });
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
          noLeidas: removed && !removed.leido ? Math.max(0, previous.noLeidas - 1) : previous.noLeidas,
          conteoPorTipo: removed && !removed.leido && previous.conteoPorTipo
            ? decrementarConteo(previous.conteoPorTipo, removed.tipo)
            : previous.conteoPorTipo,
        });
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['notificaciones'], context.previous);
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
          conteoPorTipo: { turno: 0, mensaje: 0, receta: 0, urgencia: 0, sistema: 0 },
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['notificaciones'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] });
    },
  });

  // ─── Mutación: silenciar categoría ──────────────────────

  const silenciarCategoria = useMutation({
    mutationFn: async (silenciarPorTipo: SilenciarPorTipo) => {
      const prefs = prefsQuery.data;
      const res = await fetch('/api/notificaciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urgenciasWhatsapp: prefs?.urgenciasWhatsapp ?? true,
          resumenDiarioEmail: prefs?.resumenDiarioEmail ?? true,
          alertasAusentismo: prefs?.alertasAusentismo ?? true,
          nuevosPacientes: prefs?.nuevosPacientes ?? false,
          whatsappPersonal: prefs?.whatsappPersonal ?? '',
          silenciarPorTipo,
        }),
      });
      if (!res.ok) throw new Error('Error al actualizar preferencias');
    },
    onMutate: async (silenciarPorTipo) => {
      await queryClient.cancelQueries({ queryKey: ['notificaciones-preferencias'] });
      const previous = queryClient.getQueryData<PreferenciasNotificaciones>(['notificaciones-preferencias']);
      if (previous) {
        queryClient.setQueryData<PreferenciasNotificaciones>(['notificaciones-preferencias'], {
          ...previous,
          silenciarPorTipo,
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notificaciones-preferencias'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones-preferencias'] });
    },
  });

  // ─── Datos derivados ────────────────────────────────────

  const notificacionesRaw = query.data?.data ?? [];
  const noLeidas = query.data?.noLeidas ?? 0;
  const conteoPorTipo = query.data?.conteoPorTipo ?? { turno: 0, mensaje: 0, receta: 0, urgencia: 0, sistema: 0 };
  const silenciadas = prefsQuery.data?.silenciarPorTipo ?? DEFAULT_SILENCIAR;

  // Notificaciones ordenadas por prioridad (más urgentes primero) y luego por fecha
  const notificaciones = [...notificacionesRaw].sort((a, b) => {
    const prioA = a.prioridad ?? PRIORIDAD_POR_TIPO[a.tipo] ?? 4;
    const prioB = b.prioridad ?? PRIORIDAD_POR_TIPO[b.tipo] ?? 4;
    if (prioA !== prioB) return prioA - prioB;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Conteo por tipo filtrado (excluye categorías silenciadas del badge)
  const conteoPorTipoVisible: ConteoPorTipo = {
    turno: silenciadas.turno ? 0 : conteoPorTipo.turno,
    mensaje: silenciadas.mensaje ? 0 : conteoPorTipo.mensaje,
    receta: silenciadas.receta ? 0 : conteoPorTipo.receta,
    urgencia: silenciadas.urgencia ? 0 : conteoPorTipo.urgencia,
    sistema: silenciadas.sistema ? 0 : conteoPorTipo.sistema,
  };

  const noLeidasVisibles = Object.values(conteoPorTipoVisible).reduce((a, b) => a + b, 0);

  return {
    // Datos
    notificaciones,
    noLeidas,
    noLeidasVisibles,
    conteoPorTipo,
    conteoPorTipoVisible,
    silenciadas,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    // Acciones
    marcarLeida: marcarLeida.mutate,
    marcarNoLeida: marcarNoLeida.mutate,
    eliminar: eliminar.mutate,
    marcarTodasLeidas: marcarTodasLeidas.mutate,
    silenciarCategoria: silenciarCategoria.mutate,

    // Estados
    isMutating: marcarLeida.isPending || marcarNoLeida.isPending || eliminar.isPending,
  };
}

// ============================================================
// Helpers
// ============================================================

function decrementarConteo(conteo: ConteoPorTipo, tipo?: string): ConteoPorTipo {
  if (!tipo || !(tipo in conteo)) return conteo;
  return { ...conteo, [tipo]: Math.max(0, conteo[tipo as keyof ConteoPorTipo] - 1) };
}

function incrementarConteo(conteo: ConteoPorTipo, tipo?: string): ConteoPorTipo {
  if (!tipo || !(tipo in conteo)) return conteo;
  return { ...conteo, [tipo]: conteo[tipo as keyof ConteoPorTipo] + 1 };
}
