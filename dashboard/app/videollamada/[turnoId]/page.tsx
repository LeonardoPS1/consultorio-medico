/**
 * /videollamada/[turnoId] — Página de videoconsulta
 *
 * Dos flujos de acceso:
 *   1. Médico: autenticado con NextAuth → genera token server-side
 *   2. Paciente: token JWT en query param (desde WhatsApp)
 *
 * Server Component: valida acceso y genera token antes de renderizar
 * el componente VideoRoom (Client Component).
 */

import { redirect } from 'next/navigation';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { turnos, pacientes, medicos } from '@/drizzle/schema';
import { requireAuth } from '@/lib/api-auth';
import { getPortalSession } from '@/lib/portal-auth';
import { getRoomName, generateMedicoToken, LIVEKIT_URL } from '@/lib/livekit';
import { VideoRoom } from '@/components/videollamada/video-room';

// ─── Tipos ─────────────────────────────────────────────────

interface Props {
  params: { turnoId: string };
  searchParams: { token?: string };
}

// ─── Página ────────────────────────────────────────────────

export default async function VideollamadaPage({ params, searchParams }: Props) {
  const { turnoId } = params;
  const { token: tokenFromUrl } = searchParams;

  if (!turnoId) {
    redirect('/dashboard/turnos');
  }

  const roomName = getRoomName(turnoId);

  try {
    // ─── FLUJO PACIENTE: token en URL ──────────────────
    if (tokenFromUrl) {
      // Verificar que el turno existe y es virtual
      const [turno] = await db
        .select({ id: turnos.id, tipoConsulta: turnos.tipoConsulta })
        .from(turnos)
        .where(and(eq(turnos.id, turnoId), sql`${turnos.deletedAt} IS NULL`))
        .limit(1);

      if (!turno) {
        return <ErrorExplicacion mensaje="Turno no encontrado" />;
      }

      if (turno.tipoConsulta !== 'virtual') {
        return <ErrorExplicacion mensaje="Este turno no es una consulta virtual" />;
      }

      return (
        <VideoRoom
          roomName={roomName}
          token={tokenFromUrl}
          liveKitUrl={LIVEKIT_URL}
          role="paciente"
        />
      );
    }

    // ─── FLUJO MÉDICO: requiere autenticación ──────────
    let session;
    try {
      session = await requireAuth();
    } catch {
      redirect('/login?callbackUrl=' + encodeURIComponent(`/videollamada/${turnoId}`));
    }

    // Obtener datos del turno y verificar acceso
    const [turno] = await db
      .select({
        id: turnos.id,
        medicoId: turnos.medicoId,
        usuarioId: medicos.usuarioId,
        tipoConsulta: turnos.tipoConsulta,
        pacienteNombre: pacientes.nombre,
        pacienteApellido: pacientes.apellido,
        medicoNombre: medicos.nombre,
      })
      .from(turnos)
      .leftJoin(pacientes, eq(turnos.pacienteId, pacientes.id))
      .leftJoin(medicos, eq(turnos.medicoId, medicos.id))
      .where(and(eq(turnos.id, turnoId), sql`${turnos.deletedAt} IS NULL`))
      .limit(1);

    if (!turno) {
      return <ErrorExplicacion mensaje="Turno no encontrado" />;
    }

    if (turno.tipoConsulta !== 'virtual') {
      return <ErrorExplicacion mensaje="Este turno no es una consulta virtual" />;
    }

    // Verificar que el médico autenticado es el asignado
    // turno.medicoId → medicos.id, session.user.id → usuarios.id
    // La relación es: medicos.usuarioId == usuarios.id
    if (turno.usuarioId && session.user.id !== turno.usuarioId) {
      return <ErrorExplicacion mensaje="No tenés permiso para acceder a esta videollamada" />;
    }

    // Generar token para el médico
    const identity = turno.medicoNombre || session.user.name || 'Médico';
    const token = await generateMedicoToken(roomName, identity);

    return (
      <VideoRoom
        roomName={roomName}
        token={token}
        liveKitUrl={LIVEKIT_URL}
        role="medico"
      />
    );
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error inesperado';
    return <ErrorExplicacion mensaje={mensaje} />;
  }
}

// ─── Componente de error ───────────────────────────────────

function ErrorExplicacion({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-8">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold mb-2">No se puede iniciar la videollamada</h1>
        <p className="text-white/60 mb-6">{mensaje}</p>
        <a
          href="/dashboard/atencion"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-colors"
        >
          Volver al panel de atención
        </a>
      </div>
    </div>
  );
}
