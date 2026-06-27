/**
 * AsistenteProvider + useAsistenteIA — estado global del asistente IA flotante.
 *
 * Maneja:
 * - Estado del panel (abierto/cerrado)
 * - Historial de chat (en memoria)
 * - Config del usuario (localStorage overrides)
 * - Sugerencias contextuales
 * - Envío de mensajes a Ollama
 * - Feature gating
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { canAccess } from '@/lib/features';
import type { ModoAsistente, Sugerencia, MensajeChat } from '@/lib/ia/asistente-prompts';

// ============================================================
// Tipos
// ============================================================

interface UserSettings {
  modo: ModoAsistente;
  silenciadas: Record<string, boolean>;
}

interface AsistenteState {
  /** Panel abierto/cerrado */
  open: boolean;
  /** Modo actual del asistente */
  modo: ModoAsistente;
  /** Historial de mensajes del chat */
  mensajes: MensajeChat[];
  /** Sugerencias disponibles para la página actual */
  sugerencias: Sugerencia[];
  /** Sugerencias pendientes de revisar (para badge en FAB) */
  sugerenciasPendientes: number;
  /** Si está cargando una respuesta */
  cargando: boolean;
  /** Si el asistente está disponible (Ollama respondió ok) */
  disponible: boolean | null; // null = no verificado aún
  /** Si el feature está habilitado para el usuario */
  habilitado: boolean;
  /** Último error */
  error: string | null;
  /** Datos contextuales de la página actual */
  datosContexto: Record<string, unknown>;
}

interface AsistenteActions {
  /** Abrir/cerrar el panel */
  toggle: () => void;
  /** Abrir el panel */
  abrir: () => void;
  /** Cerrar el panel */
  cerrar: () => void;
  /** Enviar un mensaje al asistente */
  enviarMensaje: (mensaje: string) => Promise<void>;
  /** Enviar una sugerencia como mensaje */
  enviarSugerencia: (sugerencia: Sugerencia) => Promise<void>;
  /** Cambiar modo del asistente */
  setModo: (modo: ModoAsistente) => void;
  /** Silenciar/activar una categoría de sugerencias */
  toggleCategoria: (categoria: string) => void;
  /** Limpiar el chat */
  limpiarChat: () => void;
  /** Actualizar datos contextuales */
  setDatosContexto: (datos: Record<string, unknown>) => void;
}

type AsistenteContextType = AsistenteState & AsistenteActions;

// ============================================================
// Constantes
// ============================================================

const STORAGE_KEY = 'aicoremed-asistente-settings';

const DEFAULT_USER_SETTINGS: UserSettings = {
  modo: 'silencioso',
  silenciadas: {},
};

// ============================================================
// Context
// ============================================================

const AsistenteContext = createContext<AsistenteContextType | null>(null);

// ============================================================
// Provider
// ============================================================

export function AsistenteProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // Feature gating
  const plan = (session?.user as { plan?: string } | undefined)?.plan ?? 'free';
  const habilitado = canAccess(plan, 'ia-assistant');

  // ─── Settings del usuario (localStorage) ────────────────
  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_USER_SETTINGS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_USER_SETTINGS, ...JSON.parse(saved) } : DEFAULT_USER_SETTINGS;
    } catch {
      return DEFAULT_USER_SETTINGS;
    }
  });

  // Persistir settings
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userSettings));
    } catch {
      // localStorage puede estar lleno
    }
  }, [userSettings]);

  // ─── Estado del panel ────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [cargando, setCargando] = useState(false);
  const [disponible, setDisponible] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [datosContexto, setDatosContexto] = useState<Record<string, unknown>>({});
  const mensajesEndRef = useRef<HTMLDivElement | null>(null);

  // ─── Sugerencias contextuales ────────────────────────────
  const {
    data: sugerenciasData,
  } = useQuery({
    queryKey: ['ia-sugerencias', pathname],
    queryFn: async () => {
      if (!habilitado) return [];
      const res = await fetch(`/api/ia/sugerencias?ruta=${encodeURIComponent(pathname)}`);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data?.sugerencias || []) as Sugerencia[];
    },
    enabled: habilitado && userSettings.modo !== 'silencioso',
    refetchInterval: 60000, // cada minuto
    staleTime: 30000,
  });

  const sugerencias = (sugerenciasData || []).filter(
    (s) => !userSettings.silenciadas[s.categoria],
  );

  // ─── Chat mutation ──────────────────────────────────────
  const chatMutation = useMutation({
    mutationFn: async (mensaje: string) => {
      const res = await fetch('/api/ia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje,
          ruta: pathname,
          datosContexto,
          historial: mensajes.slice(-10).map((m) => ({
            rol: m.rol,
            contenido: m.contenido,
          })),
        }),
      });
      if (!res.ok) throw new Error('Error al comunicarse con el asistente');
      return res.json();
    },
    onSuccess: (data) => {
      if (data.data?.disponible) {
        setMensajes((prev) => [
          ...prev,
          { rol: 'assistant', contenido: data.data.respuesta, timestamp: Date.now() },
        ]);
        setDisponible(true);
        setError(null);
      } else {
        setDisponible(false);
        setError(data.data?.error || 'Asistente IA no disponible');
      }
      setCargando(false);
    },
    onError: (err) => {
      setDisponible(false);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setCargando(false);
    },
  });

  // ─── Atajos de teclado ──────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    const customHandler = () => setOpen((prev) => !prev);

    window.addEventListener('keydown', handler);
    window.addEventListener('toggle-asistente-ia', customHandler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('toggle-asistente-ia', customHandler);
    };
  }, []);

  // ─── Auto-scroll ────────────────────────────────────────
  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  // ─── Actions ────────────────────────────────────────────
  const toggle = useCallback(() => setOpen((prev) => !prev), []);
  const abrir = useCallback(() => setOpen(true), []);
  const cerrar = useCallback(() => setOpen(false), []);

  const enviarMensaje = useCallback(
    async (mensaje: string) => {
      if (!mensaje.trim() || cargando) return;

      // Agregar mensaje del usuario
      setMensajes((prev) => [
        ...prev,
        { rol: 'user', contenido: mensaje.trim(), timestamp: Date.now() },
      ]);
      setCargando(true);
      setError(null);

      chatMutation.mutate(mensaje.trim());
    },
    [cargando, chatMutation],
  );

  const enviarSugerencia = useCallback(
    async (sugerencia: Sugerencia) => {
      await enviarMensaje(sugerencia.prompt);
    },
    [enviarMensaje],
  );

  const setModo = useCallback((modo: ModoAsistente) => {
    setUserSettings((prev) => ({ ...prev, modo }));
  }, []);

  const toggleCategoria = useCallback((categoria: string) => {
    setUserSettings((prev) => ({
      ...prev,
      silenciadas: {
        ...prev.silenciadas,
        [categoria]: !prev.silenciadas[categoria],
      },
    }));
  }, []);

  const limpiarChat = useCallback(() => {
    setMensajes([]);
    setError(null);
  }, []);

  // ─── Value ──────────────────────────────────────────────
  const value: AsistenteContextType = {
    open,
    modo: userSettings.modo,
    mensajes,
    sugerencias,
    sugerenciasPendientes: userSettings.modo !== 'silencioso' ? sugerencias.length : 0,
    cargando,
    disponible,
    habilitado,
    error,
    datosContexto,
    toggle,
    abrir,
    cerrar,
    enviarMensaje,
    enviarSugerencia,
    setModo,
    toggleCategoria,
    limpiarChat,
    setDatosContexto,
  };

  return <AsistenteContext.Provider value={value}>{children}</AsistenteContext.Provider>;
}

// ============================================================
// Hook
// ============================================================

/**
 * Hook para acceder al estado del asistente IA flotante.
 *
 * @example
 * ```tsx
 * const { open, toggle, enviarMensaje, mensajes } = useAsistenteIA();
 * ```
 */
export function useAsistenteIA(): AsistenteContextType {
  const context = useContext(AsistenteContext);
  if (!context) {
    throw new Error('useAsistenteIA debe usarse dentro de un AsistenteProvider');
  }
  return context;
}

/**
 * Hook que solo retorna si el asistente está habilitado.
 * Útil para componentes que solo necesitan saber si mostrar o no el FAB.
 */
export function useAsistenteHabilitado(): boolean {
  const { habilitado } = useAsistenteIA();
  return habilitado;
}
