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
import { apiHandler, created } from '@/lib/api-handler';
import {
  parseBody,
  parseQuery,
  createConversacionSchema,
  conversacionQuerySchema,
} from '@/lib/validations';
import { emitEvent } from '@/lib/sse-events';
import { z } from 'zod';

const conversacionCreateSchema = createConversacionSchema
  .extend({
    mensaje: z.string().optional(),
    intencion: z.string().optional(),
    email: z.string().email().optional().nullable(),
  })
  .passthrough();

const conversacionListQuerySchema = conversacionQuerySchema
  .extend({
    canal: z.enum(['whatsapp', 'sms', 'email', 'web']).optional(),
    offset: z.coerce.number().optional(),
    estado: z.enum(['activa', 'pendiente', 'cerrada', 'derivada']).optional(),
  })
  .passthrough();

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
export const GET = apiHandler(async (request: NextRequest) => {
  const session = await auth();
  const sessionMedicoId = session?.user?.medicoId;
  const sessionRol = session?.user?.role;

  const q = parseQuery(request, conversacionListQuerySchema);

  await seedDataIfEmpty();

  const medicoIdFilter = sessionRol === 'medico' ? sessionMedicoId : undefined;
  const conversaciones = await getConversaciones({
    estado: q.estado,
    canal: q.canal,
    search: q.search,
    limit: q.limit ?? 50,
    offset: q.offset ?? 0,
    medicoId: medicoIdFilter,
  });

  return NextResponse.json({
    data: conversaciones,
    total: conversaciones.length,
    limit: q.limit ?? 50,
    offset: q.offset ?? 0,
  });
});

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
export const POST = apiHandler(async (request: NextRequest) => {
  const body = await parseBody(request, conversacionCreateSchema);

  let paciente = await getPacienteByTelefono(body.telefono);

  if (!paciente) {
    paciente = await createPaciente({
      telefono: body.telefono,
      nombre: body.nombre ?? '',
      apellido: body.apellido ?? '',
      email: body.email ?? undefined,
      canalPreferido: body.canal || 'whatsapp',
      consentimientoWhatsapp: true,
      consentimientoEmail: false,
      fuente: body.canal || 'whatsapp',
      tags: [],
      metadata: {},
    });
  }

  const conversacion = await createConversacion({
    pacienteId: paciente.id,
    canal: body.canal || 'whatsapp',
    mensajeInicial: body.mensaje,
    rolMensajeInicial: 'paciente',
    intencionInicial: body.intencion,
  });

  const session = await auth();
  const tenantId = session?.user?.tenantId || '00000000-0000-0000-0000-000000000000';
  emitEvent(tenantId, {
    type: 'nueva-conversacion',
    data: { conversacionId: conversacion!.id, pacienteId: paciente.id },
  });

  return created(conversacion);
});
