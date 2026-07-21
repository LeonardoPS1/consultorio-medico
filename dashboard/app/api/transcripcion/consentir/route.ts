import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pacientes, consentimientoLog } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { safeLog } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pacienteId, aceptado } = body;

    if (!pacienteId || typeof aceptado !== 'boolean') {
      return NextResponse.json({ error: 'pacienteId y aceptado son requeridos' }, { status: 400 });
    }

    const [paciente] = await db
      .select({ id: pacientes.id })
      .from(pacientes)
      .where(eq(pacientes.id, pacienteId))
      .limit(1);

    if (!paciente) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    await db.insert(consentimientoLog).values({
      pacienteId,
      tipo: 'grabacion',
      accion: aceptado ? 'accept' : 'reject',
      aceptado,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    safeLog(`[Transcripcion] Consentimiento grabacion paciente ${pacienteId}: ${aceptado ? 'aceptado' : 'rechazado'}`);

    return NextResponse.json({ success: true, consentimiento: aceptado });
  } catch (error) {
    console.error('[API] Error consentir grabacion:', error);
    return NextResponse.json({ error: 'Error al registrar consentimiento' }, { status: 500 });
  }
}
