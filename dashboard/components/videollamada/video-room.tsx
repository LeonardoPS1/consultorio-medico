/**
 * VideoRoom — Componente de videollamada con LiveKit
 *
 * Diseñado para ser responsive en PC y celular.
 * Usa VideoConference (con estilos CSS importados) para la grilla
 * de participantes, más una barra de controles personalizada
 * con Tailwind que funciona sin depender de los estilos CSS de LiveKit.
 *
 * Props:
 *   - roomName: nombre de la sala (ej: consultorio_{turnoId})
 *   - token: JWT generado por livekit-server-sdk
 *   - liveKitUrl: URL del servidor LiveKit (wss://...)
 *   - onDisconnect: callback al salir de la sala
 *   - role: 'medico' | 'paciente' (para UI adaptativa)
 */

'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── LiveKit dinámico (solo cliente, sin SSR) ──────────────

const LKLiveKitRoom = dynamic(
  () =>
    import('@livekit/components-react').then((mod) => mod.LiveKitRoom),
  { ssr: false }
);

const LKVideoConference = dynamic(
  () =>
    import('@livekit/components-react').then((mod) => mod.VideoConference),
  { ssr: false }
);

const LKRoomAudioRenderer = dynamic(
  () =>
    import('@livekit/components-react').then((mod) => mod.RoomAudioRenderer),
  { ssr: false }
);

const LKConnectionStateToast = dynamic(
  () =>
    import('@livekit/components-react').then((mod) => mod.ConnectionStateToast),
  { ssr: false }
);

const LKControlBar = dynamic(
  () =>
    import('@livekit/components-react').then((mod) => mod.ControlBar),
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
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar mobile al mount y al resize
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleDisconnected = useCallback(() => {
    setConnected(false);
    if (onDisconnect) onDisconnect();
  }, [onDisconnect]);

  // ─── Validación inicial ───────────────────────────────

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
    <div className="relative h-full w-full flex flex-col bg-black">
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
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black p-6">
          <AlertTriangle className="h-10 w-10 text-red-400 mb-4" />
          <p className="text-white text-lg font-medium">Error de conexión</p>
          <p className="text-white/60 text-sm mt-1 mb-4 text-center max-w-md">{error}</p>
          <div className="flex gap-3">
            <Button variant="default" onClick={() => window.location.reload()}>
              Reintentar
            </Button>
            {onDisconnect && (
              <Button variant="outline" className="text-white border-white/20 hover:bg-white/10" onClick={onDisconnect}>
                Salir
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
          const msg = err?.message || 'Error al conectar con el servidor de video';
          setError(msg);
          setConnected(false);
        }}
        onDisconnected={handleDisconnected}
        style={{
          height: '100%',
          width: '100%',
          display: connected ? 'flex' : 'none',
          flexDirection: 'column',
        }}
      >
        {/* Toast de estado de conexión */}
        <LKConnectionStateToast />

        {/* ─── Video principal (responsive) ──────────── */}
        <div className="flex-1 relative min-h-0">
          <LKVideoConference />
        </div>

        {/* Audio en segundo plano */}
        <LKRoomAudioRenderer />

        {/* ─── Barra de controles ────────────────────── */}
        <div className="relative z-20">
          {/* Versión Mobile: controles más compactos */}
          {isMobile ? (
            <div className="flex justify-center pb-3 pt-1">
              <LKControlBar
                controls={{
                  microphone: true,
                  camera: true,
                  screenShare: false,
                  leave: true,
                }}
                className="lk-control-bar--mobile"
              />
            </div>
          ) : (
            /* Versión Desktop: controles completos con gradient */
            <div className="flex justify-center pb-4 pt-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              <LKControlBar
                controls={{
                  microphone: true,
                  camera: true,
                  screenShare: role === 'medico',
                  leave: true,
                }}
              />
            </div>
          )}
        </div>
      </LKLiveKitRoom>

      {/* ─── Indicador de conexión (cuando está conectado) ── */}
      {connected && (
        <div className="fixed top-4 left-4 z-40 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-white/70">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:inline">En vivo</span>
          <span className="text-white/40">·</span>
          <span className="truncate max-w-[120px] sm:max-w-[200px]">{roomName}</span>
        </div>
      )}
    </div>
  );
}
