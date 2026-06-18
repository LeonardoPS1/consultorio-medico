import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { leadCaptures } from '@/drizzle/schema';
import { apiHandler, success, fail } from '@/lib/api-handler';
import { parseBody } from '@/lib/validations';
import { contactFormSchema } from '@/lib/validations';

// ─── POST ──────────────────────────────────────────────────

export const POST = apiHandler(async (request: NextRequest) => {
  const body = await parseBody(request, contactFormSchema);

  if (!body.name?.trim()) fail('El nombre es obligatorio', 400);
  if (!body.email?.trim()) fail('El email es obligatorio', 400);

  const [lead] = await db
    .insert(leadCaptures)
    .values({
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone || null,
      specialty: body.specialty || null,
      size: body.size || null,
      interests: body.interests.length > 0 ? body.interests : null,
      status: 'new',
      source: 'landing-contact',
    })
    .returning({ id: leadCaptures.id });

  return success({ id: lead.id, message: 'Solicitud recibida correctamente' }, 201);
});
