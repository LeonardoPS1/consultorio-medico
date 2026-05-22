import { NextRequest, NextResponse } from 'next/server';
import { apiHandler, success, created, notFound } from '@/lib/api-handler';
import { getHistorial, addHistorialEntry, updateHistorialEntry, deleteHistorialEntry } from '@/lib/patient-store';

export const GET = apiHandler(async (_req: NextRequest, { params }) => {
  const entries = getHistorial(params.id);
  return success(entries);
});

export const POST = apiHandler(async (request: NextRequest, { params }) => {
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
  return created(entry);
});

export const DELETE = apiHandler(async (request: NextRequest, { params }) => {
  const { searchParams } = new URL(request.url);
  const entryId = searchParams.get('entryId');
  if (!entryId) notFound('entryId requerido');
  const ok = deleteHistorialEntry(entryId!);
  return ok ? success({ success: true }) : notFound('No encontrado');
});

export const PATCH = apiHandler(async (request: NextRequest, { params }) => {
  const { searchParams } = new URL(request.url);
  const entryId = searchParams.get('entryId');
  if (!entryId) notFound('entryId requerido');
  const body = await request.json();
  const updated = updateHistorialEntry(entryId!, body);
  return updated ? success(updated) : notFound('No encontrado');
});
