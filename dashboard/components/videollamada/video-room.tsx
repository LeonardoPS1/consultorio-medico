/**
 * VideoRoom — Componente de videollamada con LiveKit
 *
 * Features:
 *   - PreJoinLobby profesional antes de conectar
 *   - FocusLayoutContainer + FocusLayout + CarouselLayout (spotlight)
 *   - GridLayout cuando nadie está pinchado
 *   - CustomControlBar con botones en español + pantalla completa
 *   - CustomChat tipo bottom drawer
 *   - Timer de duración de la llamada
 *   - Atajos de teclado (M/C/F/V/Escape)
 *   - Notificaciones de entrada/salida de participantes
 *   - Overlay con información del turno
 *   - Píncheo de participantes por click
 */

'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Track, ConnectionState } from 'livekit-client';
import {
  useTracks,
  useChat,
  useTrackToggle,
  useConnectionState,
  useRemoteParticipants,
  useLocalParticipant,
  FocusLayout,
  FocusLayoutContainer,
  GridLayout,
  CarouselLayout,
  ParticipantTile,
  type ParticipantClickEvent,
} from '@livekit/components-react';
import {
  Loader2,
  AlertTriangle,
  WifiOff,
  CameraOff,
  Clock,
  Ban,
  RefreshCw,
  Video,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomControlBar } from './custom-control-bar';
import { CustomChat } from './custom-chat';
import { PreJoinLobby } from './prejoin-lobby';

// ─── LiveKit dinámico (solo cliente, sin SSR) ──────────────

const LKLiveKitRoom = dynamic(
  () => import('@livekit/components-react').then((mod) => mod.LiveKitRoom),
  { ssr: false },
);

const LKRoomAudioRenderer = dynamic(
  () => import('@livekit/components-react').then((mod) => mod.RoomAudioRenderer),
  { ssr: false },
);

const LKConnectionStateToast = dynamic(
  () => import('@livekit/components-react').then((mod) => mod.ConnectionStateToast),
  { ssr: false },
);

// ─── Props ─────────────────────────────────────────────────

interface VideoRoomProps {
  roomName: string;
  token: string;
  liveKitUrl: string;
  onDisconnect?: () => void;
  role?: 'medico' | 'paciente';
  identity: string;
  turnoId: string;
}

// ─── Constantes ────────────────────────────────────────────

const TOAST_DURATION_MS = 4000;

// ─── Mapa de errores ──────────────────────────────────────

interface ErrorInfo {
  icon: React.ReactNode;
  titulo: string;
  mensajeMedico: string;
  mensajePaciente: string;
  solucionMedico: string;
  solucionPaciente: string;
  accion?: 'reload' | 'retry' | 'back';
}

function analizarError(err: Error | string, role: 'medico' | 'paciente'): ErrorInfo {
  const msg = typeof err === 'string' ? err : err?.message || '';
  const m = msg.toLowerCase();

  if (
    m.includes('permission') ||
    m.includes('denied') ||
    m.includes('notallowederror') ||
    m.includes('camera') ||
    m.includes('microphone') ||
    m.includes('getusermedia')
  ) {
    return {
      icon: <CameraOff className="h-10 w-10 text-amber-400" />,
      titulo: 'Permisos de cámara y micrófono',
      mensajeMedico: 'No se pudieron activar la cámara o el micrófono.',
      mensajePaciente: 'No se pudieron activar la cámara o el micrófono.',
      solucionMedico:
        'Hacé clic en el candado 🔒 de la barra de direcciones y permití "Cámara" y "Micrófono". Si usas Chrome, también revisá chrome://settings/content/camera.',
      solucionPaciente:
        'Hacé clic en el candado 🔒 de la barra de direcciones y permití "Cámara" y "Micrófono".',
      accion: 'reload',
    };
  }

  if (
    m.includes('token') &&
    (m.includes('expir') || m.includes('invalid') || m.includes('not valid') || m.includes('jwt'))
  ) {
    return {
      icon: <Clock className="h-10 w-10 text-orange-400" />,
      titulo: 'Enlace expirado',
      mensajeMedico: 'El token de acceso expiró o no es válido.',
      mensajePaciente: 'El enlace de videollamada expiró o no es válido.',
      solucionMedico: 'Recargá la página para generar un nuevo token automáticamente.',
      solucionPaciente:
        'Solicitá un nuevo enlace a tu médico o contacto a través del WhatsApp del consultorio.',
      accion: 'reload',
    };
  }

  if (
    m.includes('room') &&
    (m.includes('not found') || m.includes('no existe') || m.includes('create'))
  ) {
    return {
      icon: <Ban className="h-10 w-10 text-red-400" />,
      titulo: 'Sala no disponible',
      mensajeMedico: 'La sala de videollamada no existe o fue eliminada.',
      mensajePaciente: 'La consulta virtual no está disponible.',
      solucionMedico:
        'El turno pudo haber sido cancelado. Verificá el estado del turno en Atención.',
      solucionPaciente: 'Comunicate con tu médico para reprogramar la consulta.',
      accion: 'back',
    };
  }

  if ((m.includes('room') && m.includes('full')) || m.includes('max participants')) {
    return {
      icon: <Ban className="h-10 w-10 text-orange-400" />,
      titulo: 'Sala llena',
      mensajeMedico: 'La sala alcanzó el máximo de participantes.',
      mensajePaciente: 'La sala alcanzó el máximo de participantes.',
      solucionMedico:
        'Esperá a que otro participante salga o aumentá el límite en la configuración de LiveKit.',
      solucionPaciente: 'Esperá unos minutos e intentá de nuevo.',
      accion: 'retry',
    };
  }

  if (
    m.includes('network') ||
    m.includes('connection') ||
    m.includes('timeout') ||
    m.includes('unreachable') ||
    m.includes('disconnect') ||
    m.includes('econnrefused') ||
    m.includes('econnreset') ||
    m.includes('enotfound')
  ) {
    return {
      icon: <WifiOff className="h-10 w-10 text-red-400" />,
      titulo: 'Error de conexión',
      mensajeMedico: 'No se pudo establecer conexión con el servidor de video.',
      mensajePaciente: 'No se pudo establecer conexión con el servidor de video.',
      solucionMedico:
        'Verificá tu conexión a internet. Si el problema persiste, el servidor LiveKit puede estar en mantenimiento. Contactá al administrador.',
      solucionPaciente: 'Verificá tu conexión a internet y asegurate de tener buena señal WiFi.',
      accion: 'retry',
    };
  }

  return {
    icon: <AlertTriangle className="h-10 w-10 text-red-400" />,
    titulo: 'Error inesperado',
    mensajeMedico: 'Ocurrió un error al conectar con la videollamada.',
    mensajePaciente: 'Ocurrió un error al conectar con la videollamada.',
    solucionMedico: `Intentá recargar la página. Si el error persiste, contactá a soporte técnico. Detalle: ${msg.slice(0, 200)}`,
    solucionPaciente:
      'Intentá recargar la página. Si el error persiste, contactá a tu médico por WhatsApp.',
    accion: 'retry',
  };
}

// ─── Formatear duración ────────────────────────────────────

function formatElapsed(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// ─── Componente principal ──────────────────────────────────

export function VideoRoom({
  roomName,
  token,
  liveKitUrl,
  onDisconnect,
  role = 'medico',
  identity,
  turnoId,
}: VideoRoomProps) {
  const serverUrl = useMemo(() => liveKitUrl || 'wss://livekit.aicorebots.com', [liveKitUrl]);
  const [joined, setJoined] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<ErrorInfo | null>(null);

  // ─── Estado del píncheo de participante ──────────────
  const [focusedIdentity, setFocusedIdentity] = useState<string | null>(null);

  // ─── Estado del chat ─────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false);

  // ─── Estado de pantalla completa ─────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      const el = containerRef.current?.closest('[data-lk-videoroom]') as HTMLElement | null;
      (el || document.documentElement).requestFullscreen().catch(() => {});
    }
  }, []);

  const handleDisconnected = useCallback(() => {
    setConnected(false);
    if (onDisconnect) onDisconnect();
  }, [onDisconnect]);

  const handleParticipantClick = useCallback(
    (evt: ParticipantClickEvent) => {
      const identity = evt.participant.identity;
      setFocusedIdentity((prev) => (prev === identity ? null : identity));
    },
    [],
  );

  const toggleChat = useCallback(() => setChatOpen((v) => !v), []);

  // ─── Validación inicial ──────────────────────────────
  if (!token || !roomName) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-black text-white p-6">
        <AlertTriangle className="h-12 w-12 text-amber-400 mb-4" />
        <p className="text-lg font-medium">Error de configuración</p>
        <p className="text-white/60 text-sm mt-1 text-center">Faltan parámetros de conexión</p>
        {onDisconnect && (
          <Button variant="ghost" className="mt-4 text-white/60" onClick={onDisconnect}>
            Volver al dashboard
          </Button>
        )}
      </div>
    );
  }

  // ─── Render: Lobby si no se unió ─────────────────────
  if (!joined) {
    return (
      <div className="h-full w-full" data-lk-videoroom>
        <PreJoinLobby identity={identity} role={role} onJoin={() => setJoined(true)} />
      </div>
    );
  }

  // ─── Render: Sala LiveKit ────────────────────────────
  return (
    <div
      ref={containerRef}
      data-lk-videoroom
      className="relative h-full w-full flex flex-col bg-black"
    >
      {/* Overlay de conexión */}
      {!connected && !error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black">
          <Loader2 className="h-10 w-10 animate-spin text-white mb-4" />
          <p className="text-white text-lg font-medium">Conectando a la sala...</p>
          <p className="text-white/60 text-sm mt-1">Preparando videollamada</p>
        </div>
      )}

      {/* Overlay de error */}
      {error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm p-6">
          {error.icon}
          <p className="text-white text-lg font-medium mt-4">{error.titulo}</p>
          <p className="text-white/80 text-sm mt-1 text-center max-w-md">
            {role === 'medico' ? error.mensajeMedico : error.mensajePaciente}
          </p>
          <div className="mt-3 bg-white/5 rounded-lg p-3 max-w-md w-full">
            <p className="text-white/60 text-xs font-medium mb-1">💡 Posible solución:</p>
            <p className="text-white/80 text-sm">
              {role === 'medico' ? error.solucionMedico : error.solucionPaciente}
            </p>
          </div>
          <div className="flex gap-3 mt-6">
            {error.accion === 'reload' || error.accion === 'retry' ? (
              <Button variant="default" className="gap-2" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4" />
                {error.accion === 'reload' ? 'Recargar página' : 'Reintentar'}
              </Button>
            ) : null}
            {error.accion === 'retry' && !error.accion?.includes('reload') && (
              <Button
                variant="default"
                className="gap-2"
                onClick={() => {
                  setError(null);
                  window.location.reload();
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Reintentar
              </Button>
            )}
            {onDisconnect && (
              <Button
                variant="outline"
                className="text-white border-white/20 hover:bg-white/10"
                onClick={onDisconnect}
              >
                Salir de la sala
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Sala LiveKit */}
      <LKLiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect={true}
        audio={true}
        video={true}
        onConnected={() => {
          setConnected(true);
          setError(null);
        }}
        onError={(err) => {
          const info = analizarError(err, role);
          setError(info);
        }}
        onDisconnected={handleDisconnected}
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <LKConnectionStateToast />

        <VideoContent
          focusedIdentity={focusedIdentity}
          onParticipantClick={handleParticipantClick}
          chatOpen={chatOpen}
          onChatToggle={toggleChat}
          isFullscreen={isFullscreen}
          onFullscreenToggle={toggleFullscreen}
          identity={identity}
          role={role}
          roomName={roomName}
        />

        <LKRoomAudioRenderer />
      </LKLiveKitRoom>

      {/* Indicador de conexión con timer */}
      {connected && (
        <ConnectionIndicator identity={identity} role={role} roomName={roomName} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Subcomponentes
// ══════════════════════════════════════════════════════════

// ─── Indicador de conexión + duración + info ──────────────

function ConnectionIndicator({
  identity: _identity,
  role: _role,
  roomName,
}: {
  identity: string;
  role: 'medico' | 'paciente';
  roomName: string;
}) {
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      if (startTimeRef.current) {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-4 left-4 z-40 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-white/70">
      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
      <span className="hidden sm:inline">{formatElapsed(elapsed)}</span>
      <span className="text-white/40">·</span>
      <span className="truncate max-w-[100px] sm:max-w-[160px]">{roomName}</span>
    </div>
  );
}

// ─── Contenido de video + controles (hooks dentro de LiveKitRoom) ─

function VideoContent({
  focusedIdentity,
  onParticipantClick,
  chatOpen,
  onChatToggle,
  isFullscreen,
  onFullscreenToggle,
  identity,
  role,
  roomName,
}: {
  focusedIdentity: string | null;
  onParticipantClick: (evt: ParticipantClickEvent) => void;
  chatOpen: boolean;
  onChatToggle: () => void;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
  identity: string;
  role: 'medico' | 'paciente';
  roomName: string;
}) {
  // ─── Tracks de video ────────────────────────────────
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  // Encontrar el track enfocado y el resto
  const { focusTrack, otherTracks } = useMemo(() => {
    if (!focusedIdentity) return { focusTrack: undefined, otherTracks: tracks };

    const focusIdx = tracks.findIndex((t) => t.participant.identity === focusedIdentity);
    if (focusIdx === -1) return { focusTrack: undefined, otherTracks: tracks };

    const ft = tracks[focusIdx];
    const rest = tracks.filter((_, i) => i !== focusIdx);
    return { focusTrack: ft, otherTracks: rest };
  }, [tracks, focusedIdentity]);

  // ─── Conexión ───────────────────────────────────────
  const connectionState = useConnectionState();
  const isConnected = connectionState === ConnectionState.Connected;

  // ─── Participantes ──────────────────────────────────
  const remoteParticipants = useRemoteParticipants();
  const localParticipant = useLocalParticipant();

  // ─── Atajos de teclado ──────────────────────────────
  const { toggle: toggleMic } = useTrackToggle({ source: Track.Source.Microphone });
  const { toggle: toggleCam } = useTrackToggle({ source: Track.Source.Camera });

  const toggleMicRef = useRef(toggleMic);
  const toggleCamRef = useRef(toggleCam);
  const onChatToggleRef = useRef(onChatToggle);
  const onFullscreenToggleRef = useRef(onFullscreenToggle);
  const chatOpenRef = useRef(chatOpen);

  useEffect(() => {
    toggleMicRef.current = toggleMic;
    toggleCamRef.current = toggleCam;
    onChatToggleRef.current = onChatToggle;
    onFullscreenToggleRef.current = onFullscreenToggle;
    chatOpenRef.current = chatOpen;
  }, [toggleMic, toggleCam, onChatToggle, onFullscreenToggle, chatOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 'm':
          e.preventDefault();
          toggleMicRef.current();
          break;
        case 'c':
          e.preventDefault();
          toggleCamRef.current();
          break;
        case 'f':
          e.preventDefault();
          onFullscreenToggleRef.current();
          break;
        case 'v':
          e.preventDefault();
          onChatToggleRef.current();
          break;
        case 'escape':
          if (chatOpenRef.current) {
            e.preventDefault();
            onChatToggleRef.current();
          }
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ─── Notificaciones de entrada/salida ────────────────
  interface Toast {
    id: number;
    message: string;
    type: 'join' | 'leave';
  }

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const prevIdentitiesRef = useRef<Set<string>>(new Set());
  const initialTrackRef = useRef(true);

  useEffect(() => {
    if (!isConnected) {
      initialTrackRef.current = true;
      prevIdentitiesRef.current = new Set();
      return;
    }

    const currentIdentities = new Set(remoteParticipants.map((p) => p.identity));
    const prev = prevIdentitiesRef.current;

    // No disparar notificaciones en la primera detección (carga inicial)
    if (initialTrackRef.current) {
      initialTrackRef.current = false;
      prevIdentitiesRef.current = currentIdentities;
      return;
    }

    const newToasts: Toast[] = [];

    currentIdentities.forEach((id) => {
      if (!prev.has(id)) {
        toastIdRef.current += 1;
        newToasts.push({ id: toastIdRef.current, message: id, type: 'join' });
      }
    });

    prev.forEach((id) => {
      if (!currentIdentities.has(id)) {
        toastIdRef.current += 1;
        newToasts.push({ id: toastIdRef.current, message: id, type: 'leave' });
      }
    });

    if (newToasts.length > 0) {
      setToasts((prev) => [...prev, ...newToasts]);
      // Remover después de TOAST_DURATION_MS
      newToasts.forEach((t) => {
        setTimeout(() => {
          setToasts((existing) => existing.filter((n) => n.id !== t.id));
        }, TOAST_DURATION_MS);
      });
    }

    prevIdentitiesRef.current = currentIdentities;
  }, [remoteParticipants, isConnected]);

  // ─── Timer de duración (para mostrar en overlay) ──────
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isConnected) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
      const interval = setInterval(() => {
        if (startTimeRef.current) {
          setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      startTimeRef.current = null;
      setElapsed(0);
    }
  }, [isConnected]);

  // Nombre del otro participante
  const otherName = useMemo(() => {
    return remoteParticipants.map((p) => p.identity).join(', ') || 'Esperando...';
  }, [remoteParticipants]);

  return (
    <div className="flex-1 relative min-h-0 flex flex-col">
      {/* ─── Toasts de entrada/salida ────────────────── */}
      {toasts.length > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-md text-white text-sm shadow-lg animate-slide-down ${
                t.type === 'join'
                  ? 'bg-emerald-600/70 border border-emerald-500/30'
                  : 'bg-red-600/70 border border-red-500/30'
              }`}
            >
              {t.type === 'join' ? (
                <UserCheck className="h-4 w-4 shrink-0" />
              ) : (
                <UserX className="h-4 w-4 shrink-0" />
              )}
              <span>
                {t.message}
                <span className="text-white/60 ml-1">
                  {t.type === 'join' ? 'se unió' : 'salió'}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ─── Info del turno (overlay superior derecho) ── */}
      {isConnected && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-blue-400 font-medium">{identity}</span>
            <span className="text-white/30">({role === 'medico' ? 'Médico' : 'Tú'})</span>
          </div>
          {remoteParticipants.length > 0 && (
            <>
              <span className="text-white/20">→</span>
              <span className="text-emerald-400 font-medium">{otherName}</span>
            </>
          )}
          <span className="text-white/20 mx-1">|</span>
          <span className="text-white/50 tabular-nums">{formatElapsed(elapsed)}</span>
        </div>
      )}

      {/* ─── Área de video ────────────────────────────── */}
      <div className="flex-1 relative min-h-0">
        {focusTrack ? (
          <FocusLayoutContainer className="h-full w-full">
            <CarouselLayout tracks={otherTracks} className="h-full">
              <ParticipantTile onParticipantClick={onParticipantClick} />
            </CarouselLayout>
            <FocusLayout trackRef={focusTrack} onParticipantClick={onParticipantClick} />
          </FocusLayoutContainer>
        ) : (
          <GridLayout tracks={tracks} className="h-full w-full">
            <ParticipantTile onParticipantClick={onParticipantClick} />
          </GridLayout>
        )}
      </div>

      {/* ─── Chat bottom drawer ──────────────────────── */}
      {chatOpen && (
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <CustomChat onClose={onChatToggle} />
        </div>
      )}

      {/* ─── Control bar ──────────────────────────────── */}
      <div className="relative z-10 shrink-0">
        <CustomControlBar
          onChatToggle={onChatToggle}
          chatOpen={chatOpen}
          isFullscreen={isFullscreen}
          onFullscreenToggle={onFullscreenToggle}
        />
      </div>
    </div>
  );
}
