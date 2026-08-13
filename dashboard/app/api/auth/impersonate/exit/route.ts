import { NextResponse } from 'next/server';
import { clearImpersonationCookie } from '@/lib/auth-impersonation';

/**
 * Finaliza la sesión de impersonación y redirige al login.
 * @returns {Promise<NextResponse>} Redirección al login.
 */
export async function POST(): Promise<NextResponse> {
  await clearImpersonationCookie();
  const baseUrl = process.env.NEXTAUTH_URL || 'https://med.aicorebots.com';
  return NextResponse.redirect(`${baseUrl}/login`);
}
