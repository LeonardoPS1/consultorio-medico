import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { exportarFhir, verificarConsentimientoExportacion } from '@/lib/services/fhir-export';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pacienteId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { pacienteId } = await params;

    const consent = await verificarConsentimientoExportacion(pacienteId);
    if (!consent) {
      return NextResponse.json(
        { error: 'El paciente no ha otorgado consentimiento para exportación de datos. Se requiere consentimiento de tipo "datos" firmado o consentimiento email registrado.' },
        { status: 403 },
      );
    }

    const bundle = await exportarFhir(pacienteId);

    return NextResponse.json(bundle, {
      status: 200,
      headers: {
        'X-FHIR-Version': '4.0.1',
        'X-FHIR-Profile': 'simplified',
        'X-Disclaimer': 'Formato FHIR-compatible simplificado — no es una implementación certificada HL7 FHIR. Usar como referencia para integración, no como reemplazo de un sistema FHIR completo.',
        'Content-Disposition': `attachment; filename="fhir-export-${pacienteId}.json"`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
