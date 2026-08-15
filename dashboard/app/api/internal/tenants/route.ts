import { NextRequest, NextResponse } from 'next/server';
import { safeWarn } from '@/lib/logger';
import { sendEmail } from '@/lib/services/email';
import { crearTenantConAdmin } from '@/lib/services/tenant';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

const PLAN_VALUES = ['free', 'starter', 'professional', 'premium', 'enterprise'];

// POST /api/internal/tenants - Crear tenant + admin desde ops-console
/**
 *
 * @param request
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('x-internal-key');
  if (!INTERNAL_API_KEY || authHeader !== INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
    }

    const { nombre, subdomain, plan, adminEmail, adminNombre } = body as {
      nombre?: unknown;
      subdomain?: unknown;
      plan?: unknown;
      adminEmail?: unknown;
      adminNombre?: unknown;
    };

    if (typeof nombre !== 'string' || !nombre.trim()) {
      return NextResponse.json({ error: 'Nombre es obligatorio' }, { status: 400 });
    }
    if (typeof subdomain !== 'string' || !subdomain.trim()) {
      return NextResponse.json({ error: 'Subdominio es obligatorio' }, { status: 400 });
    }
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return NextResponse.json({ error: 'Solo letras, números y guiones' }, { status: 400 });
    }
    if (typeof plan !== 'undefined' && (typeof plan !== 'string' || !PLAN_VALUES.includes(plan))) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
    }
    if (typeof adminEmail !== 'string' || !adminEmail.trim() || !adminEmail.includes('@')) {
      return NextResponse.json({ error: 'Email del administrador inválido' }, { status: 400 });
    }
    if (typeof adminNombre !== 'string' || !adminNombre.trim()) {
      return NextResponse.json({ error: 'Nombre del administrador es obligatorio' }, { status: 400 });
    }

    const result = await crearTenantConAdmin({
      nombre,
      subdomain,
      plan: (plan as string) || 'free',
      adminEmail,
      adminNombre,
    });

    const loginUrl = `https://${result.subdomain}.aicorebots.com`;
    const emailSent = await sendEmail({
      to: result.adminEmail,
      subject: 'Tu clínica está lista en AicoreMed',
      html: `
        <h2>¡Bienvenido a AicoreMed!</h2>
        <p>Hola <strong>${result.adminNombre}</strong>, tu clínica <strong>${nombre.trim()}</strong> fue creada correctamente.</p>
        <p>Accedé a tu panel desde:</p>
        <p><a href="${loginUrl}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">Ingresar al panel</a></p>
        <p>Tu subdominio es: <code>${result.subdomain}.aicorebots.com</code></p>
        <p><strong>Email:</strong> ${result.adminEmail}</p>
        <p><strong>Contraseña temporal:</strong> <code>${result.passwordTemporal}</code></p>
        <p>Te recomendamos cambiar la contraseña luego del primer ingreso.</p>
      `,
    });

    return NextResponse.json(
      {
        ok: true,
        tenantId: result.tenantId,
        subdomain: result.subdomain,
        adminEmail: result.adminEmail,
        emailSent,
      },
      { status: 201 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message === 'El subdominio ya está en uso') {
      return NextResponse.json({ error: 'El subdominio ya está en uso' }, { status: 409 });
    }
    safeWarn('[Internal/tenants] Error creando tenant:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
