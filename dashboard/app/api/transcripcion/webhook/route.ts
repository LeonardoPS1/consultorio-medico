import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { turnos, pacientes, medicos } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { safeLog, safeError } from '@/lib/logger';
import { transcripcionService } from '@/lib/services/transcripcion';

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get('x-webhook-secret');
    if (secret !== process.env.N8N_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    safeLog(`[Transcripcion] Webhook recibido: ${body.event || 'unknown'}`);

    if (body.event !== 'egress_ended' && body.event !== 'track_published') {
      return NextResponse.json({ received: true });
    }

    const roomName = body.room?.name || body.roomName;
    if (!roomName || !roomName.startsWith('consultorio_')) {
      return NextResponse.json({ error: 'Room inválida' }, { status: 400 });
    }

    const turnoId = roomName.replace('consultorio_', '');
    if (!turnoId) {
      return NextResponse.json({ error: 'No se pudo extraer turnoId' }, { status: 400 });
    }

    const egressId = body.egress?.egressId || body.egressId;
    const audioUrl = body.egress?.file?.filename || body.filename;
    if (!audioUrl) {
      safeLog('[Transcripcion] Webhook sin archivo de audio, ignorando');
      return NextResponse.json({ received: true });
    }

    const [turno] = await db
      .select({
        pacienteId: turnos.pacienteId,
        medicoId: turnos.medicoId,
      })
      .from(turnos)
      .where(and(eq(turnos.id, turnoId), sql`${turnos.deletedAt} IS NULL`))
      .limit(1);

    if (!turno) {
      safeError(`[Transcripcion] Turno ${turnoId} no encontrado para webhook`);
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
    }

    const notaId = await transcripcionService.procesarAudioCompleto({
      turnoId,
      audioPath: audioUrl,
      pacienteId: turno.pacienteId,
      medicoId: turno.medicoId,
    });

    return NextResponse.json({
      received: true,
      notaCreada: !!notaId,
      notaId,
    });
  } catch (error) {
    safeError('[Transcripcion] Error en webhook:', error);
    return NextResponse.json({ error: 'Error procesando webhook' }, { status: 500 });
  }
}
