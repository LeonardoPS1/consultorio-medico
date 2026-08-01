import { NextResponse } from 'next/server'
import { captureError } from '@/lib/glitchtip'

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function error(message: string, status = 400) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  )
}

export function unauthorized(message = 'No autorizado') {
  return error(message, 401)
}

export function notFound(message = 'No encontrado') {
  return error(message, 404)
}

export function serverError(error: unknown) {
  console.error('[ops-api]', error)
  captureError(error instanceof Error ? error : new Error(String(error)), { level: 'error' })
  return NextResponse.json(
    { success: false, error: 'Error interno del servidor' },
    { status: 500 }
  )
}
