import { getDb } from '@/lib/db'
import { getSessionFromCookie, createSessionToken, setSessionCookie } from '@/lib/auth'
import { platformOperators } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { ok, unauthorized, error, serverError } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request) {
  try {
    const session = await getSessionFromCookie()
    if (!session) return unauthorized()

    const body = await req.json()
    const { nombre } = body
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return error('Nombre requerido')
    }

    const db = getDb()
    await db
      .update(platformOperators)
      .set({ nombre: nombre.trim() })
      .where(eq(platformOperators.id, session.sub))

    const { token } = await createSessionToken({
      id: session.sub,
      email: session.email,
      nombre: nombre.trim(),
    })
    await setSessionCookie(token)

    return ok({ nombre: nombre.trim() })
  } catch (err) {
    return serverError(err)
  }
}
