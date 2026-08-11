import { NextResponse } from 'next/server';
import { workflowLogs } from '@/drizzle/operations';
import { db } from '@/lib/db';
import { sendWhatsApp } from '@/lib/whatsapp';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || process.env.NOVEDADES_INTERNAL_KEY;

/**
 *
 * @param request
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('x-internal-key');
    if (!INTERNAL_API_KEY || authHeader !== INTERNAL_API_KEY) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const doctorNumber = process.env.TWILIO_DOCTOR_NUMBER;
    if (!doctorNumber) {
      return NextResponse.json(
        { error: 'TWILIO_DOCTOR_NUMBER no configurado' },
        { status: 500 },
      );
    }

    const mensaje = `🔴 *Recordatorio: Drill DR Trimestral*

Hola, recordatorio de que HOY es el primer día del trimestre — corresponde ejecutar el drill de restauración.

📋 *Checklist:*
1. Ejecutar: ./scripts/restore-full.sh --drill --pg-backup /var/backups/consultorio/<ultimo-backup>.gpg
2. Verificar integridad de datos
3. Anotar RTO real
4. Actualizar docs/disaster-recovery.md (tabla de drills)

📖 Documentación: https://med.aicorebots.com/admin/backups
⏱️ Tiempo estimado: ~10-20 minutos`;

    const ok = await sendWhatsApp({
      to: doctorNumber,
      body: mensaje,
    });

    if (!ok) {
      return NextResponse.json({ error: 'Error al enviar WhatsApp' }, { status: 502 });
    }

    await db.insert(workflowLogs).values({
      workflowId: 'WF-13',
      workflowName: 'Recordatorio Drill DR',
      nivel: 'info',
      mensaje: `Recordatorio drill DR enviado a ${doctorNumber}`,
      metadata: { tipo: 'drill_recordatorio', destino: doctorNumber },
    });

    return NextResponse.json({ success: true, message: 'Recordatorio DR enviado' });
  } catch (e) {
    console.error('[DrillRecordatorio] Error:', e);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
