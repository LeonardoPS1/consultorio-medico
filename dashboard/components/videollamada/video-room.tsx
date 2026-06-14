/**
 * VideoRoom — Componente de videollamada con LiveKit
 *
 * Usa livekit-client + @livekit/components-react para la
 * videoconferencia en tiempo real.
 *
 * Props:
 *   - roomName: nombre de la sala (ej: consultorio_{turnoId})
 *   - token: JWT generado por livekit-server-sdk
 *   - liveKitUrl: URL del servidor LiveKit (wss://...)
 *   - onDisconnect: callback al salir de la sala
 *   - role: 'medico' | 'paciente' (para UI adaptativa)
 */

'use client';

import { useMemo, useState, useEffect } from 'react';
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

const LKControlBar = dynamic(
  () =>
    import('@livekit/components-react').then((mod) => mod.ControlBar),
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

  if (!token || !roomName) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black text-white">
        <AlertTriangle className="h-12 w-12 text-amber-400 mb-4" />
        <p className="text-lg font-medium">Error de configuración</p>
        <p className="text-white/60 text-sm mt-1">Faltan parámetros de conexión</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full flex flex-col bg-black">
      {/* Overlay de conexión */}
      {!connected && !error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black">
          <Loader2 className="h-10 w-10 animate-spin text-white mb-4" />
          <p className="text-white text-lg font-medium">Conectando a la sala...</p>
          <p className="text-white/60 text-sm mt-1">Preparando videollamada</p>
        </div>
      )}

      {/* Overlay de error */}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black">
          <AlertTriangle className="h-10 w-10 text-red-400 mb-4" />
          <p className="text-white text-lg font-medium">Error de conexión</p>
          <p className="text-white/60 text-sm mt-1 mb-4">{error}</p>
          <Button
            variant="default"
            onClick={() => window.location.reload()}
          >
            Reintentar
          </Button>
          {onDisconnect && (
            <Button
              variant="ghost"
              className="mt-2 text-white/60"
              onClick={onDisconnect}
            >
              Volver al dashboard
            </Button>
          )}
        </div>
      )}

      {/* Sala LiveKit */}
      <LKLiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect={true}
        audio={true}
        video={true}
        onConnected={() => setConnected(true)}
        onError={(err) => setError(err?.message || 'Error al conectar')}
        onDisconnected={() => {
          setConnected(false);
          if (onDisconnect) onDisconnect();
        }}
        style={{ height: '100%', width: '100%', display: connected ? 'flex' : 'none', flexDirection: 'column' }}
      >
        {/* Toast de estado de conexión */}
        <LKConnectionStateToast />

        {/* Video principal */}
        <div className="flex-1 relative">
          <LKVideoConference />
        </div>

        {/* Audio */}
        <LKRoomAudioRenderer />

        {/* Barra de controles */}
        <div className="flex justify-center pb-4 pt-2 z-10 bg-gradient-to-t from-black/60 to-transparent">
          <LKControlBar
            controls={{
              microphone: true,
              camera: true,
              screenShare: role === 'medico',
              leave: true,
            }}
          />
        </div>
      </LKLiveKitRoom>
    </div>
  );
}
