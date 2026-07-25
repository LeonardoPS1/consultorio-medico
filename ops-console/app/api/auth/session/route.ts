import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSessionFromCookie()
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'No autorizado' },
      { status: 401 }
    )
  }
  return NextResponse.json({
    success: true,
    data: {
      sub: session.sub,
      email: session.email,
      nombre: session.nombre,
    },
  })
}
