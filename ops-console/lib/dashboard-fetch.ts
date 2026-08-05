/**
 * Resuelve la URL base del dashboard para llamadas server-to-server.
 *
 * Orden de prioridad:
 *  1. DASHBOARD_INTERNAL_URL (URL interna Swarm, recomendada en producción — evita Cloudflare)
 *  2. DASHBOARD_URL (URL pública; útil en dev/tests)
 *  3. http://med-dashboard:3000 (DNS interno Swarm por defecto)
 *
 * Usar URL interna evita que Cloudflare devuelva HTML 403/404 en vez de JSON,
 * que rompía los parseos de response.json() con "Unexpected token '<'".
 */
export function getDashboardUrl(): string {
  if (process.env.DASHBOARD_INTERNAL_URL) return process.env.DASHBOARD_INTERNAL_URL
  if (process.env.DASHBOARD_URL) return process.env.DASHBOARD_URL
  return 'http://med-dashboard:3000'
}

interface DashboardResponse<T> {
  ok: boolean
  status: number
  data: T | null
  error?: string
}

/**
 * Realiza un fetch al dashboard y parsea la respuesta de forma segura.
 * Si el dashboard devuelve HTML (página 404/500 de Next en vez de JSON),
 * devuelve un error descriptivo en vez de propagar "Unexpected token '<'".
 * Si el fetch falla a nivel de red (no resuelve hostname / conexión rechazada),
 * devuelve un error con la URL completa intentada para poder diagnosticar.
 */
export async function dashboardFetch<T = Record<string, unknown>>(
  path: string,
  init: RequestInit,
): Promise<DashboardResponse<T>> {
  let raw: Response
  try {
    raw = await fetch(path, init)
  } catch (cause) {
    const detalle = cause instanceof Error ? cause.message : String(cause)
    return {
      ok: false,
      status: 0,
      data: null,
      error: `No se pudo conectar con el dashboard en ${path} (${detalle}). Verificá que DASHBOARD_INTERNAL_URL apunte al nombre de servicio Swarm correcto (docker service ls).`,
    }
  }

  const text = await raw.text()

  if (!text) {
    return { ok: raw.ok, status: raw.status, data: null }
  }

  const trimmed = text.trim()
  if (trimmed.startsWith('<')) {
    return {
      ok: false,
      status: raw.status,
      data: null,
      error: `El dashboard devolvió HTML (status ${raw.status}) en lugar de JSON. Verificá que la imagen del dashboard incluya la ruta ${new URL(path).pathname}.`,
    }
  }

  try {
    const data = JSON.parse(text) as T
    return { ok: raw.ok, status: raw.status, data }
  } catch {
    return {
      ok: false,
      status: raw.status,
      data: null,
      error: `El dashboard devolvió una respuesta inválida (status ${raw.status}).`,
    }
  }
}
