import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { db } from '@/lib/db';
import { usuarios, tenants, medicos } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, email, password } = body;

    // Validaciones
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2 || nombre.length > 100) {
      return NextResponse.json(
        { error: 'El nombre debe tener entre 2 y 100 caracteres.' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Ingresá un email válido.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres.' },
        { status: 400 }
      );
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: 'La contraseña debe contener al menos una mayúscula.' },
        { status: 400 }
      );
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: 'La contraseña debe contener al menos un número.' },
        { status: 400 }
      );
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return NextResponse.json(
        { error: 'La contraseña debe contener al menos un carácter especial.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verificar si el email ya está registrado
    const existing = await db.select().from(usuarios).where(eq(usuarios.email, normalizedEmail)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Este email ya está registrado. Iniciá sesión o usá otro email.' },
        { status: 409 }
      );
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
    const plan = 'free'; // Empieza en free, luego puede upgradear

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

    // Crear médico asociado (necesario para el funcionamiento del sistema)
    await db.insert(medicos).values({
      usuarioId: userId,
      nombre: nombre.trim(),
      especialidad: 'Medicina General',
      email: normalizedEmail,
      activo: true,
    });

    console.log(`[Register] Usuario creado: ${normalizedEmail} (tenant: ${tenantId})`);

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: normalizedEmail,
        nombre: nombre.trim(),
        tenantId,
      },
    });
  } catch (error) {
    console.error('[Register] Error:', error);
    return NextResponse.json(
      { error: 'Error al crear la cuenta. Intentá de nuevo.' },
      { status: 500 }
    );
  }
}
