'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, AlertTriangle, Video, Mic, Monitor, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoRoom } from '@/components/videollamada/video-room';
import { getRoomName, LIVEKIT_URL } from '@/lib/livekit-client';

export default function VideollamadaPage({
  params,
}: {
  params: Promise<{ turnoId: string }>;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<'medico' | 'paciente'>('medico');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [identity, setIdentity] = useState('');
  const [turnoId, setTurnoId] = useState('');

  useEffect(() => {
    const init = async () => {
      const resolvedParams = await params;
      const tId = resolvedParams.turnoId;
      setTurnoId(tId);

      // 1. Intentar obtener token de query params (paciente desde WhatsApp)
      const urlToken = searchParams?.get('token');
      if (urlToken) {
        setToken(urlToken);
        setRole('paciente');
        setIdentity('Paciente');
        setLoading(false);
        return;
      }

      // 2. Si no hay token en URL, soy médico autenticado -> llamar API
      try {
        const roomName = getRoomName(tId);
        const res = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName,
            identity: 'Médico',
            role: 'medico',
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || body.error || 'Error al obtener token');
        }

        const data = await res.json();
        setToken(data.token);
        setRole('medico');
        setIdentity('Médico');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al conectar');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [params, searchParams]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-white mb-4" />
        <p className="text-white text-lg font-medium">Preparando videollamada...</p>
        <p className="text-white/60 text-sm mt-1">Conectando con LiveKit</p>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-black text-white">
        <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
        <p className="text-lg font-medium">No se pudo iniciar la videollamada</p>
        <p className="text-white/60 text-sm mt-1 mb-4">{error || 'Token no disponible'}</p>
        <div className="flex gap-2">
          <Button variant="default" onClick={() => window.location.reload()}>
            <Loader2 className="h-4 w-4 mr-2" /> Reintentar
          </Button>
          <Button variant="ghost" onClick={() => router.push('/dashboard/atencion')}>
            <X className="h-4 w-4 mr-2" /> Volver al dashboard
          </Button>
        </div>
      </div>
    );
  }

  const roomName = getRoomName(turnoId);

  return (
    <VideoRoom
      roomName={roomName}
      token={token}
      liveKitUrl={LIVEKIT_URL}
      role={role}
      identity={identity}
      turnoId={turnoId}
      onDisconnect={() => router.push('/dashboard/atencion')}
    />
  );
}
