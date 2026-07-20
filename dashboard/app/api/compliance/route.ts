import { NextRequest, NextResponse } from 'next/server';
import { getComplianceData, getDemoComplianceData } from '@/lib/services/compliance';
import type { Periodo } from '@/app/dashboard/compliance/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodo = (searchParams.get('periodo') as Periodo) || 'mes';
    const demo = searchParams.get('demo') === 'true';
    const sucursalId = searchParams.get('sucursalId') || undefined;

    if (demo) {
      const data = await getDemoComplianceData(periodo);
      return NextResponse.json(data);
    }

    const data = await getComplianceData(periodo, sucursalId);
    if (!data.metricas.tiempoEsperaPromedio && !data.metricas.cumplimientoPlazos) {
      const demoData = await getDemoComplianceData(periodo);
      return NextResponse.json({ ...demoData, _demo: true });
    }

    return NextResponse.json(data);
  } catch {
    const demoData = await getDemoComplianceData('mes');
    return NextResponse.json({ ...demoData, _demo: true });
  }
}
