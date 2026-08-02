function validateEmail(email: unknown): string | null {
  if (typeof email !== 'string') return 'Email requerido'
  if (!email.includes('@') || email.length > 255) return 'Email inválido'
  return null
}

function validateRequired(value: unknown, name: string): string | null {
  if (value === undefined || value === null) return `${name} requerido`
  if (typeof value === 'string' && value.trim().length === 0) return `${name} requerido`
  return null
}

function validateTotpCode(code: unknown): string | null {
  if (typeof code !== 'string') return 'Código inválido'
  if (!/^\d{6}$/.test(code)) return 'Código debe tener 6 dígitos'
  return null
}

export const MOTIVO_MIN_LENGTH = 10
export const MOTIVO_MAX_LENGTH = 500

export function validateMotivo(motivo: unknown): string | null {
  if (typeof motivo !== 'string') return 'El campo motivo es obligatorio'
  const trimmed = motivo.trim()
  if (trimmed.length === 0) return 'El motivo es obligatorio'
  if (trimmed.length < MOTIVO_MIN_LENGTH) return `El motivo debe tener al menos ${MOTIVO_MIN_LENGTH} caracteres`
  if (trimmed.length > MOTIVO_MAX_LENGTH) return `El motivo no puede exceder ${MOTIVO_MAX_LENGTH} caracteres`
  return null
}

interface SafeParseOk<T> {
  success: true
  data: T
  error?: undefined
}

interface SafeParseError {
  success: false
  data?: undefined
  error: { errors: { message: string }[] }
}

type SafeParseResult<T> = SafeParseOk<T> | SafeParseError

function safeParse<T>(validators: ((body: Record<string, unknown>) => string | null)[]) {
  return (body: unknown): SafeParseResult<T> => {
    const b = body as Record<string, unknown>
    for (const v of validators) {
      const err = v(b)
      if (err) {
        return { success: false, error: { errors: [{ message: err }] } }
      }
    }
    return { success: true, data: b as T }
  }
}

function emailRule(name: string) {
  return (body: Record<string, unknown>) => validateEmail(body[name])
}

function requiredRule(name: string, label: string) {
  return (body: Record<string, unknown>) => validateRequired(body[name], label)
}

function totpCodeRule(name: string) {
  return (body: Record<string, unknown>) => validateTotpCode(body[name])
}

interface AuthSchemas<T> {
  safeParse: (body: unknown) => SafeParseResult<T>
}

export const loginBeginSchema: AuthSchemas<{ email: string }> = {
  safeParse: safeParse([emailRule('email')]),
}

export const loginCompleteSchema: AuthSchemas<{ email: string; credential: Record<string, unknown>; challenge: string; operatorId?: string }> = {
  safeParse: safeParse([emailRule('email'), requiredRule('credential', 'Credencial'), requiredRule('challenge', 'Challenge')]),
}

export const registerBeginSchema: AuthSchemas<{ email: string; setupToken: string; skipPasskey?: boolean }> = {
  safeParse: safeParse([emailRule('email'), requiredRule('setupToken', 'Token de setup')]),
}

export const registerCompleteSchema: AuthSchemas<{ email: string; credential: Record<string, unknown>; challenge: string }> = {
  safeParse: safeParse([emailRule('email'), requiredRule('credential', 'Credencial'), requiredRule('challenge', 'Challenge')]),
}

export const totpSetupSchema: AuthSchemas<{ email: string }> = {
  safeParse: safeParse([emailRule('email')]),
}

export const totpVerifySchema: AuthSchemas<{ email: string; token: string }> = {
  safeParse: safeParse([emailRule('email'), totpCodeRule('token')]),
}
