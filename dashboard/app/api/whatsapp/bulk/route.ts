import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { bulkWhatsApp } from '@/lib/services/bulk-operations';
import { safeWarn } from '@/lib/logger';
import { bulkWhatsAppSchema } from '@/lib/validations';

const BULK_MAX = 100;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const parsed = bulkWhatsAppSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Datos inválidos' },
        { status: 400 },
      );
    }
    const { pacienteIds, mensaje } = parsed.data;

    const sucursalId = (session.user as Record<string, unknown>)?.sucursalId as string | undefined;
    const result = await bulkWhatsApp(pacienteIds, mensaje, sucursalId);

    return NextResponse.json({ data: result });
  } catch (err) {
    safeWarn('[BulkWhatsApp API] Error:', err instanceof Error ? { message: err.message } : err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
