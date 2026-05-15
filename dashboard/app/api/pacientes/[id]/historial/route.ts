import { NextRequest, NextResponse } from 'next/server';
import { getHistorial, addHistorialEntry, updateHistorialEntry, deleteHistorialEntry } from '@/lib/patient-store';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const entries = getHistorial(params.id);
    return NextResponse.json({ data: entries });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    if (!body.titulo || !body.tipo) {
      return NextResponse.json({ error: 'titulo y tipo son obligatorios' }, { status: 400 });
    }
    const entry = addHistorialEntry(params.id, {
      fecha: body.fecha || new Date().toISOString().split('T')[0],
      tipo: body.tipo,
      titulo: body.titulo,
      descripcion: body.descripcion || '',
      codigo: body.codigo || '',
    });
    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');
    if (!entryId) return NextResponse.json({ error: 'entryId requerido' }, { status: 400 });

    const ok = deleteHistorialEntry(entryId);
    return ok
      ? NextResponse.json({ success: true })
      : NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');
    if (!entryId) return NextResponse.json({ error: 'entryId requerido' }, { status: 400 });

    const body = await request.json();
    const updated = updateHistorialEntry(entryId, body);
    return updated
      ? NextResponse.json({ data: updated })
      : NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
