import { NextRequest, NextResponse } from 'next/server';
import {
  getConversaciones,
  getConversacionById,
  createConversacion,
  getPacienteByTelefono,
  createPaciente,
  seedDataIfEmpty,
} from '@/lib/data-store';
import { auth } from '@/lib/auth';

/**
 * GET /api/conversaciones
 *
 * Lista todas las conversaciones. Soporta filtros opcionales:
 * - estado: activa | pendiente | cerrada | derivada
 * - canal: whatsapp | sms | email | web
 * - search: búsqueda por texto
 * - limit: cantidad máxima (default 50)
 * - offset: paginación
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const sessionMedicoId = (session?.user as any)?.medicoId;
    const sessionRol = (session?.user as any)?.role;

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado') || undefined;
    const canal = searchParams.get('canal') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    // Auto-seed si está vacío (primera vez)
    await seedDataIfEmpty();

    const medicoIdFilter = sessionRol === 'medico' ? sessionMedicoId : undefined;
    const conversaciones = await getConversaciones({ estado, canal, search, limit, offset, medicoId: medicoIdFilter });

    return NextResponse.json({
      data: conversaciones,
      total: conversaciones.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[API] Error GET /api/conversaciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener conversaciones', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversaciones
 *
 * Crea una nueva conversación. Busca o crea el paciente automáticamente.
 *
 * Body:
 * {
 *   telefono: string (obligatorio),
 *   nombre: string (obligatorio),
 *   apellido: string (obligatorio),
 *   mensaje: string (opcional, primer mensaje),
 *   canal: string (opcional, default "whatsapp"),
 *   intencion: string (opcional)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validación básica
    if (!body.telefono) {
      return NextResponse.json(
        { error: 'El teléfono es obligatorio' },
        { status: 400 }
      );
    }
    if (!body.nombre || !body.apellido) {
      return NextResponse.json(
        { error: 'Nombre y apellido son obligatorios' },
        { status: 400 }
      );
    }

    // Buscar paciente existente o crear uno nuevo
    let paciente = await getPacienteByTelefono(body.telefono);

    if (!paciente) {
      paciente = await createPaciente({
        telefono: body.telefono,
        nombre: body.nombre,
        apellido: body.apellido,
        email: body.email,
        canalPreferido: body.canal || 'whatsapp',
        consentimientoWhatsapp: true,
        consentimientoEmail: false,
        fuente: body.canal || 'whatsapp',
        tags: [],
        metadata: {},
      });
    }

    // Crear la conversación
    const conversacion = await createConversacion({
      pacienteId: paciente.id,
      canal: body.canal || 'whatsapp',
      mensajeInicial: body.mensaje,
      rolMensajeInicial: 'paciente',
      intencionInicial: body.intencion,
    });

    return NextResponse.json(conversacion, { status: 201 });
  } catch (error) {
    console.error('[API] Error POST /api/conversaciones:', error);
    return NextResponse.json(
      { error: 'Error al crear conversación', details: (error as Error).message },
      { status: 500 }
    );
  }
}
