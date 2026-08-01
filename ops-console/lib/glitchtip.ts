import { logger } from '@/lib/logger'

const TAG_SERVICIO = 'ops-console'

interface CaptureOptions {
  tags?: Record<string, string>
  level?: 'info' | 'warning' | 'error' | 'fatal'
}

function getSentry(): unknown | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@sentry/nextjs')
  } catch {
    return null
  }
}

function isEnabled(): boolean {
  return Boolean(process.env.GLITCHTIP_DSN || process.env.SENTRY_DSN)
}

export function captureError(error: unknown, options?: CaptureOptions): void {
  if (!isEnabled()) return
  try {
    const Sentry = getSentry() as {
      withScope: (cb: (scope: {
        setTags: (tags: Record<string, string>) => void
        setLevel: (level: string) => void
      }) => void) => void
      captureException: (error: unknown) => void
      captureMessage: (message: string, level?: string) => void
    } | null
    if (!Sentry) return

    const tags: Record<string, string> = {
      servicio: TAG_SERVICIO,
      ...(options?.tags ?? {}),
    }

    Sentry.withScope(scope => {
      scope.setTags(tags)
      if (options?.level) scope.setLevel(options.level)

      if (error instanceof Error) {
        Sentry.captureException(error)
      } else {
        Sentry.captureMessage(String(error), options?.level ?? 'error')
      }
    })
  } catch (err) {
    logger.warn('[sentry] Error al reportar:', { error: err instanceof Error ? err.message : err })
  }
}

export function captureMessage(message: string, options?: CaptureOptions): void {
  captureError(new Error(message), options)
}
