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
 */
export async function dashboardFetch<T = Record<string, unknown>>(
  path: string,
  init: RequestInit,
): Promise<DashboardResponse<T>> {
  const raw = await fetch(path, init)
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
