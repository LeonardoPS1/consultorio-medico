import { NextResponse } from 'next/server';
import { clearImpersonationCookie } from '@/lib/auth-impersonation';

/**
 *
 */
export async function POST() {
  await clearImpersonationCookie();
  const baseUrl = process.env.NEXTAUTH_URL || 'https://med.aicorebots.com';
  return NextResponse.redirect(`${baseUrl}/login`);
}
