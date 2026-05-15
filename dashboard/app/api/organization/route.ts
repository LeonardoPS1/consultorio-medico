import { NextRequest, NextResponse } from 'next/server';
import { getOrganization, updateOrganization } from '@/lib/organization-store';

export async function GET() {
  try {
    const org = getOrganization();
    return NextResponse.json({ data: org });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const updated = updateOrganization(body);
    return NextResponse.json({ data: updated, message: 'Configuración guardada' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al guardar configuración' },
      { status: 500 }
    );
  }
}
