/**
 * VideoRoom — Componente de videollamada con LiveKit
 *
 * Reemplaza VideoConference por composición custom:
 *   - FocusLayoutContainer + FocusLayout + CarouselLayout
 *   - CustomControlBar con botones en español + pantalla completa
 *   - CustomChat tipo bottom drawer
 *   - Píncheo de participantes por click
 */

'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Track } from 'livekit-client';
import {
  useTracks,
  useChat,
  FocusLayout,
  FocusLayoutContainer,
  GridLayout,
  CarouselLayout,
  ParticipantTile,
  type ParticipantClickEvent,
} from '@livekit/components-react';
import { Loader2, AlertTriangle, WifiOff, CameraOff, Clock, Ban, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomControlBar } from './custom-control-bar';
import { CustomChat } from './custom-chat';

// ─── LiveKit dinámico (solo cliente, sin SSR) ──────────────

const LKLiveKitRoom = dynamic(
  () => import('@livekit/components-react').then((mod) => mod.LiveKitRoom),
  { ssr: false }
);

const LKRoomAudioRenderer = dynamic(
  () => import('@livekit/components-react').then((mod) => mod.RoomAudioRenderer),
  { ssr: false }
);

const LKConnectionStateToast = dynamic(
  () => import('@livekit/components-react').then((mod) => mod.ConnectionStateToast),
  { ssr: false }
);

// ─── Props ─────────────────────────────────────────────────

interface VideoRoomProps {
  roomName: string;
  token: string;
  liveKitUrl: string;
  onDisconnect?: () => void;
  role?: 'medico' | 'paciente';
}

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

  // ── Sin permisos de cámara/micrófono ─────────────────
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

  // ── Token expirado / inválido ─────────────────────────
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

  // ── Sala no encontrada ───────────────────────────────
  if (m.includes('room') && (m.includes('not found') || m.includes('no existe') || m.includes('create'))) {
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

  // ── Sala llena ───────────────────────────────────────
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

  // ── Error de conexión de red ─────────────────────────
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

  // ── Error genérico del servidor ──────────────────────
  return {
    icon: <AlertTriangle className="h-10 w-10 text-red-400" />,
    titulo: 'Error inesperado',
    mensajeMedico: 'Ocurrió un error al conectar con la videollamada.',
    mensajePaciente: 'Ocurrió un error al conectar con la videollamada.',
    solucionMedico: `Intentá recargar la página. Si el error persiste, contactá a soporte técnico. Detalle: ${msg.slice(0, 200)}`,
    solucionPaciente: 'Intentá recargar la página. Si el error persiste, contactá a tu médico por WhatsApp.',
    accion: 'retry',
  };
}

// ─── Componente ────────────────────────────────────────────

export function VideoRoom({
  roomName,
  token,
  liveKitUrl,
  onDisconnect,
  role = 'medico',
}: VideoRoomProps) {
  const serverUrl = useMemo(() => liveKitUrl || 'wss://livekit.aicorebots.com', [liveKitUrl]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<ErrorInfo | null>(null);

  // ─── Estado del píncheo de participante ──────────────
  const [focusedIdentity, setFocusedIdentity] = useState<string | null>(null);

  // ─── Estado del chat (bottom drawer) ─────────────────
  const [chatOpen, setChatOpen] = useState(false);

  // ─── Estado de pantalla completa ─────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Escuchar cambios de fullscreen
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      // Intentar fullscreen en el contenedor raíz
      const el = containerRef.current?.closest('[data-lk-videoroom]') as HTMLElement | null;
      (el || document.documentElement).requestFullscreen().catch(() => {
        // Fallback si falla fullscreen (ej. sin interacción de usuario)
      });
    }
  }, []);

  // ─── Manejo de desconexión ───────────────────────────
  const handleDisconnected = useCallback(() => {
    setConnected(false);
    if (onDisconnect) onDisconnect();
  }, [onDisconnect]);

  // ─── Píncheo: click en un participante ───────────────
  const handleParticipantClick = useCallback(
    (evt: ParticipantClickEvent) => {
      const identity = evt.participant.identity;
      setFocusedIdentity((prev) => (prev === identity ? null : identity));
    },
    []
  );

  // ─── Validación inicial ──────────────────────────────
  if (!token || !roomName) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black text-white p-6">
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

  // ─── Render principal ─────────────────────────────────
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

      {/* Overlay de error — se muestra sobre la sala (sin destruir la conexión) */}
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
              <Button
                variant="default"
                className="gap-2"
                onClick={() => window.location.reload()}
              >
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

      {/* ─── Sala LiveKit ─────────────────────────────── */}
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

        {/* ─── Video + Controles + Chat ───────────────── */}
        <VideoContent
          focusedIdentity={focusedIdentity}
          onParticipantClick={handleParticipantClick}
          chatOpen={chatOpen}
          onChatToggle={() => setChatOpen((v) => !v)}
          isFullscreen={isFullscreen}
          onFullscreenToggle={toggleFullscreen}
        />

        {/* Audio en segundo plano */}
        <LKRoomAudioRenderer />
      </LKLiveKitRoom>

      {/* ─── Indicador de conexión ─────────────────────────── */}
      {connected && (
        <div className="fixed top-4 left-4 z-40 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-white/70" data-lk-connection-indicator>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:inline">En vivo</span>
          <span className="text-white/40">·</span>
          <span className="truncate max-w-[120px] sm:max-w-[200px]">{roomName}</span>
        </div>
      )}
    </div>
  );
}

// ─── Subcomponente: contenido de video + controles ─────────
// Separado para que los hooks de LiveKit (useTracks, etc.) estén dentro del LiveKitRoom

function VideoContent({
  focusedIdentity,
  onParticipantClick,
  chatOpen,
  onChatToggle,
  isFullscreen,
  onFullscreenToggle,
}: {
  focusedIdentity: string | null;
  onParticipantClick: (evt: ParticipantClickEvent) => void;
  chatOpen: boolean;
  onChatToggle: () => void;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
}) {
  // Obtener tracks de cámara (con placeholder para participantes sin cámara)
  // y de pantalla compartida
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  // Encontrar el track enfocado y el resto
  const { focusTrack, otherTracks } = useMemo(() => {
    if (!focusedIdentity) return { focusTrack: undefined, otherTracks: tracks };

    const focusIdx = tracks.findIndex(
      (t) => t.participant.identity === focusedIdentity
    );
    if (focusIdx === -1) return { focusTrack: undefined, otherTracks: tracks };

    const ft = tracks[focusIdx];
    const rest = tracks.filter((_, i) => i !== focusIdx);
    return { focusTrack: ft, otherTracks: rest };
  }, [tracks, focusedIdentity]);

  return (
    <div className="flex-1 relative min-h-0 flex flex-col">
      {/* ─── Área de video ──────────────────────────── */}
      <div className="flex-1 relative min-h-0">
        {focusTrack ? (
          <FocusLayoutContainer className="h-full w-full">
            <CarouselLayout
              tracks={otherTracks}
              className="h-full"
            >
              <ParticipantTile onParticipantClick={onParticipantClick} />
            </CarouselLayout>
            <FocusLayout
              trackRef={focusTrack}
              onParticipantClick={onParticipantClick}
            />
          </FocusLayoutContainer>
        ) : (
          <GridLayout tracks={tracks} className="h-full w-full">
            <ParticipantTile onParticipantClick={onParticipantClick} />
          </GridLayout>
        )}
      </div>

      {/* ─── Chat bottom drawer (sobre el video, arriba del control bar) ─── */}
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
