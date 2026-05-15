import { NextRequest, NextResponse } from 'next/server';
import { getPacienteDetalle, updatePacienteDetalle } from '@/lib/patient-store';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const updated = updatePacienteDetalle(params.id, body);
    return NextResponse.json({ data: updated });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = getPacienteDetalle(params.id);
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
