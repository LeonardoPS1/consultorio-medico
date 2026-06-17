/**
 * PreJoinLobby — Pantalla profesional previa a la videollamada
 *
 * Muestra preview de cámara, controles de mic/cámara, y botón para unirse.
 * Se renderiza ANTES de conectar con LiveKit, usando getUserMedia directo.
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Camera, CameraOff, Loader2, Video, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Props ─────────────────────────────────────────────────

interface PreJoinLobbyProps {
  identity: string;
  role: 'medico' | 'paciente';
  onJoin: () => void;
}

// ─── Componente ────────────────────────────────────────────

export function PreJoinLobby({ identity, role, onJoin }: PreJoinLobbyProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [camError, setCamError] = useState(false);
  const [micError, setMicError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const startPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof DOMException && err.name === 'NotAllowedError') {
            setCamError(true);
            setMicError(true);
          } else {
            setCamError(true);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    startPreview();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const toggleMic = useCallback(() => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      const next = !audioTracks.every((t) => t.enabled);
      audioTracks.forEach((t) => {
        t.enabled = !t.enabled;
      });
      setMicEnabled(next);
    }
  }, []);

  const toggleCam = useCallback(() => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      const next = !videoTracks.every((t) => t.enabled);
      videoTracks.forEach((t) => {
        t.enabled = !t.enabled;
      });
      setCamEnabled(next);
    }
  }, []);

  const roleLabel = role === 'medico' ? 'Médico' : 'Paciente';

  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-teal-950 p-4 min-h-screen">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        {/* ─── Header ─────────────────────────────────── */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4 ring-1 ring-white/10">
            <Video className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Videollamada
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Te estás conectando como{' '}
            <span className="text-white/80 font-medium">{roleLabel}</span>
          </p>
        </div>

        {/* ─── Camera Preview ─────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden bg-black/40 aspect-video ring-1 ring-white/10">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
          )}

          {!loading && camError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 gap-2">
              <CameraOff className="h-12 w-12" />
              <p className="text-sm">Cámara no disponible</p>
              <p className="text-xs text-white/20">Verificá los permisos del navegador</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                !loading && camEnabled ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}

          {/* Badge con nombre y rol */}
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5">
            <p className="text-white text-sm font-medium truncate max-w-[200px]">
              {identity || 'Participante'}
            </p>
            <p className="text-white/50 text-xs">{roleLabel}</p>
          </div>
        </div>

        {/* ─── Device Controls ────────────────────────── */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={toggleMic}
            disabled={micError}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all border ${
              micEnabled
                ? 'bg-white/10 border-white/15 text-white hover:bg-white/20'
                : 'bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title={micEnabled ? 'Apagar micrófono' : 'Encender micrófono'}
          >
            {micEnabled ? (
              <Mic className="h-4 w-4" />
            ) : (
              <MicOff className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">
              {micEnabled ? 'Micrófono activo' : 'Micrófono apagado'}
            </span>
          </button>

          <button
            onClick={toggleCam}
            disabled={camError}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all border ${
              camEnabled && !camError
                ? 'bg-white/10 border-white/15 text-white hover:bg-white/20'
                : 'bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title={camEnabled ? 'Apagar cámara' : 'Encender cámara'}
          >
            {camEnabled && !camError ? (
              <Camera className="h-4 w-4" />
            ) : (
              <CameraOff className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">
              {camError ? 'Cámara no disponible' : camEnabled ? 'Cámara activa' : 'Cámara apagada'}
            </span>
          </button>
        </div>

        {/* ─── Join Button ────────────────────────────── */}
        <button
          onClick={onJoin}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-base transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/25"
        >
          Unirse a la videollamada
        </button>

        {/* Tips */}
        <div className="flex justify-center gap-4 text-white/30 text-xs">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-mono">M</kbd>
            {' '}Mic
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-mono">C</kbd>
            {' '}Cámara
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-mono">F</kbd>
            {' '}Fullscreen
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-mono">V</kbd>
            {' '}Chat
          </span>
        </div>

        <p className="text-center text-white/20 text-xs">
          Al unirte aceptás los términos de la teleconsulta.{' '}
          {role === 'paciente' && 'Tu médico te atenderá a la brevedad.'}
        </p>
      </div>
    </div>
  );
}
