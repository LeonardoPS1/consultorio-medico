/**
 * CustomControlBar — Barra de control en español para LiveKit
 *
 * Reemplaza el ControlBar nativo de LiveKit con botones personalizados
 * con textos en español y funcionalidad de pantalla completa.
 */

'use client';

import { Track } from 'livekit-client';
import { useTrackToggle, useDisconnectButton } from '@livekit/components-react';
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Monitor,
  MessageSquareText,
  PhoneOff,
  Maximize,
  Minimize,
} from 'lucide-react';
import { useMemo } from 'react';

// ─── Props ─────────────────────────────────────────────────

interface CustomControlBarProps {
  onChatToggle: () => void;
  chatOpen: boolean;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
}

// ─── Botón individual ──────────────────────────────────────

interface CtrlBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  danger?: boolean;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  showLabel?: boolean;
}

function CtrlButton({
  active,
  danger,
  label,
  icon,
  activeIcon,
  showLabel = false,
  className = '',
  ...props
}: CtrlBtnProps) {
  const base =
    'flex items-center justify-center gap-1.5 w-11 h-11 sm:w-12 sm:h-12 rounded-xl text-white transition-all duration-200 border';
  const stateClass = danger
    ? 'bg-red-500/60 border-red-500/40 hover:bg-red-500/80 hover:scale-105'
    : active
      ? 'bg-blue-500/40 border-blue-500/50 hover:bg-blue-500/60'
      : 'bg-white/10 border-white/15 hover:bg-white/25 hover:scale-105';

  return (
    <button
      className={`${base} ${stateClass} ${className}`}
      title={label}
      aria-label={label}
      {...props}
    >
      {active && activeIcon ? activeIcon : icon}
      {showLabel && (
        <span className="hidden sm:inline text-xs font-medium">{label}</span>
      )}
    </button>
  );
}

// ─── Componente principal ──────────────────────────────────

export function CustomControlBar({
  onChatToggle,
  chatOpen,
  isFullscreen,
  onFullscreenToggle,
}: CustomControlBarProps) {
  const {
    buttonProps: micProps,
    enabled: micEnabled,
    pending: micPending,
  } = useTrackToggle({ source: Track.Source.Microphone });

  const {
    buttonProps: camProps,
    enabled: camEnabled,
    pending: camPending,
  } = useTrackToggle({ source: Track.Source.Camera });

  const {
    buttonProps: screenProps,
    enabled: screenEnabled,
    pending: screenPending,
  } = useTrackToggle({ source: Track.Source.ScreenShare });

  const { buttonProps: disconnectProps } = useDisconnectButton({});

  // Limpiamos className de los buttonProps para evitar conflictos
  const cleanProps = (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
    const { className, ...rest } = p;
    return rest;
  };

  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-black/60 backdrop-blur-md border-t border-white/10">
      {/* Micrófono */}
      <CtrlButton
        {...cleanProps(micProps)}
        active={!micEnabled}
        label="Micrófono"
        icon={<Mic className="h-[18px] w-[18px] sm:h-5 sm:w-5" />}
        activeIcon={<MicOff className="h-[18px] w-[18px] sm:h-5 sm:w-5" />}
      />

      {/* Cámara */}
      <CtrlButton
        {...cleanProps(camProps)}
        active={!camEnabled}
        label="Cámara"
        icon={<Camera className="h-[18px] w-[18px] sm:h-5 sm:w-5" />}
        activeIcon={<CameraOff className="h-[18px] w-[18px] sm:h-5 sm:w-5" />}
      />

      {/* Compartir pantalla */}
      <CtrlButton
        {...cleanProps(screenProps)}
        active={screenEnabled}
        label="Compartir pantalla"
        icon={<Monitor className="h-[18px] w-[18px] sm:h-5 sm:w-5" />}
      />

      {/* Separador */}
      <div className="w-px h-8 bg-white/10 mx-1" />

      {/* Botón Chat */}
      <CtrlButton
        onClick={onChatToggle}
        active={chatOpen}
        label="Chat"
        icon={<MessageSquareText className="h-[18px] w-[18px] sm:h-5 sm:w-5" />}
      />

      {/* Botón Pantalla completa */}
      <CtrlButton
        onClick={onFullscreenToggle}
        active={isFullscreen}
        label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        icon={<Maximize className="h-[18px] w-[18px] sm:h-5 sm:w-5" />}
        activeIcon={<Minimize className="h-[18px] w-[18px] sm:h-5 sm:w-5" />}
      />

      {/* Separador */}
      <div className="w-px h-8 bg-white/10 mx-1" />

      {/* Salir (colgar) */}
      <CtrlButton
        {...cleanProps(disconnectProps)}
        danger
        label="Salir"
        icon={<PhoneOff className="h-[18px] w-[18px] sm:h-5 sm:w-5" />}
      />
    </div>
  );
}
