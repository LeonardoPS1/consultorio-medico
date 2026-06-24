import { NextRequest } from 'next/server';
import { apiHandler, created, conflict } from '@/lib/api-handler';
import { parseBody, registerSchema } from '@/lib/validations';
import { hash } from 'bcryptjs';
import { db } from '@/lib/db';
import { usuarios, tenants, medicos } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export const POST = apiHandler(async (request: NextRequest) => {
  const body = await parseBody(request, registerSchema);
  const { nombre, email, password } = body;

  const normalizedEmail = email.toLowerCase().trim();

  // Verificar si el email ya está registrado
  const existing = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, normalizedEmail))
    .limit(1);
  if (existing.length > 0) {
    conflict('Este email ya está registrado. Iniciá sesión o usá otro email.');
  }

  // Crear tenant para el nuevo usuario
  const tenantId = crypto.randomUUID();
  const subdomain = normalizedEmail.split('@')[0] + '-' + crypto.randomUUID().slice(0, 6);

  await db.insert(tenants).values({
    id: tenantId,
    nombre: `Consultorio de ${nombre.trim()}`,
    subdomain,
    logoUrl: '/aicoremed_dark_1200.svg',
    colores: { primary: '#2563eb' },
    activo: true,
  });

  // Crear usuario
  const userId = crypto.randomUUID();
  const passwordHash = await hash(password, 10);
  const plan = 'free';

  await db.insert(usuarios).values({
    id: userId,
    email: normalizedEmail,
    passwordHash,
    nombre: nombre.trim(),
    rol: 'medico',
    activo: true,
    tenantId,
    plan,
  });

  // Crear médico asociado
  await db.insert(medicos).values({
    usuarioId: userId,
    nombre: nombre.trim(),
    especialidad: 'Medicina General',
    email: normalizedEmail,
    activo: true,
  });

  console.log(`[Register] Usuario creado: ${normalizedEmail} (tenant: ${tenantId})`);

  return created({
    success: true,
    user: {
      id: userId,
      email: normalizedEmail,
      nombre: nombre.trim(),
      tenantId,
    },
  });
});
