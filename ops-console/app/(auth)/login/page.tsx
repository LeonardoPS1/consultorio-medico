'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { startAuthentication } from '@simplewebauthn/browser'

type Step = 'email' | 'method' | 'verify-passkey' | 'verify-totp'

interface WebAuthnOptions {
  challenge: string
  timeout?: number
  rpId?: string
  allowCredentials?: { id: string; type: 'public-key'; transports?: string[] }[]
  userVerification?: string
  extensions?: Record<string, unknown>
}

interface LoginBeginData {
  operatorId: string
  hasPasskeys: boolean
  hasTotp: boolean
  requiresTotp: boolean
  options: WebAuthnOptions | null
}

export default function LoginPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginData, setLoginData] = useState<LoginBeginData | null>(null)
  const [partialToken, setPartialToken] = useState('')
  const [totpCode, setTotpCode] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('expired') === '1') {
      setError('Sesión expirada. Inicia sesión nuevamente.')
    }
  }, [])

  useEffect(() => {
    if (step === 'verify-totp') {
      inputRefs.current[0]?.focus()
    }
  }, [step])

  const handleEmailSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login/begin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()

      if (!json.success) {
        setError(json.error || 'Error al iniciar sesión')
        return
      }

      setLoginData(json.data)

      if (json.data.hasPasskeys && json.data.hasTotp) {
        setStep('method')
      } else if (json.data.hasPasskeys) {
        await handlePasskeyLogin(json.data)
      } else if (json.data.hasTotp) {
        setStep('verify-totp')
      }
    } catch (err: any) {
      setError(err?.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [email])

  const handlePasskeyLogin = useCallback(async (data?: LoginBeginData) => {
    const d = data || loginData
    if (!d || !d.options) return
    setError('')
    setLoading(true)

    try {
      const authResponse = await startAuthentication(d.options as any)

      const completeRes = await fetch('/api/auth/login/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          credential: authResponse,
          challenge: d.options.challenge,
          operatorId: d.operatorId,
        }),
      })
      const completeJson = await completeRes.json()

      if (!completeJson.success) {
        setError(completeJson.error || 'Error al verificar passkey')
        return
      }

      if (completeJson.data.requiresTotp) {
        setPartialToken(completeJson.data.partialToken)
        setStep('verify-totp')
        return
      }

      window.location.href = '/dashboard'
    } catch (err: any) {
      if (err?.name === 'SecurityError' || err?.name === 'NotAllowedError') {
        setError('Autenticación cancelada. Intenta de nuevo.')
      } else {
        setError(err?.message || 'Error al usar passkey')
      }
    } finally {
      setLoading(false)
    }
  }, [email, loginData])

  const handleTotpDigitChange = useCallback((index: number, value: string) => {
    if (value.length > 1) {
      value = value[0]
    }
    if (!/^\d*$/.test(value)) return

    const newCode = [...totpCode]
    newCode[index] = value
    setTotpCode(newCode)

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }, [totpCode])

  const handleTotpKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !totpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }, [totpCode])

  const handleTotpPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    const digits = text.replace(/\D/g, '').slice(0, 6)
    const newCode = [...totpCode]
    for (let i = 0; i < digits.length; i++) {
      newCode[i] = digits[i]
    }
    setTotpCode(newCode)
    if (digits.length === 6) {
      handleTotpSubmitManual(digits)
    } else if (digits.length > 0) {
      inputRefs.current[Math.min(digits.length, 5)]?.focus()
    }
  }, [totpCode])

  const handleTotpSubmitManual = useCallback(async (code: string) => {
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/totp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token: code,
          partialToken,
        }),
      })
      const json = await res.json()

      if (!json.success) {
        setError(json.error || 'Código inválido')
        setTotpCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        return
      }

      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err?.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [email, partialToken])

  const handleTotpSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const code = totpCode.join('')
    if (code.length !== 6) return
    await handleTotpSubmitManual(code)
  }, [totpCode, handleTotpSubmitManual])

  const handleBackToEmail = useCallback(() => {
    setStep('email')
    setError('')
    setLoginData(null)
  }, [])

  const handleUseTotpInstead = useCallback(async () => {
    setStep('verify-totp')
    setError('')
  }, [])

  const stepIndicator = () => {
    const steps = [
      { key: 'email', label: 'Email', done: step !== 'email' },
      { key: 'method', label: 'Método', done: step === 'verify-passkey' || step === 'verify-totp' },
      { key: 'verify', label: 'Verificar', done: false },
    ]

    const currentIdx = ['email', 'method', 'verify-passkey', 'verify-totp'].indexOf(step)
    const activeStep = currentIdx <= 0 ? 0 : currentIdx <= 1 ? 1 : 2

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((s, idx) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                idx < activeStep
                  ? 'bg-[var(--accent)] text-white'
                  : idx === activeStep
                  ? 'bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
              }`}
            >
              {idx < activeStep ? '✓' : idx + 1}
            </div>
            <span
              className={`text-xs hidden sm:inline ${
                idx === activeStep
                  ? 'text-[var(--text-primary)] font-medium'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              {s.label}
            </span>
            {idx < steps.length - 1 && (
              <div
                className={`w-6 h-px ${
                  idx < activeStep ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-primary)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[var(--accent)]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">AicoreOps</h1>
          <p className="text-[var(--text-secondary)] mt-1 text-sm">
            Panel de administración de plataforma
          </p>
        </div>

        {step !== 'email' && stepIndicator()}

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-sm">
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-shadow"
                  placeholder="tu@email.com"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-lg">
                  <svg className="w-4 h-4 text-[var(--danger)] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-[var(--danger)]">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-2.5 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Verificando...
                  </span>
                ) : (
                  'Continuar'
                )}
              </button>
            </form>
          )}

          {step === 'method' && loginData && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--text-secondary)] text-center mb-4">
                Elige cómo autenticarte
              </p>

              {loginData.hasPasskeys && (
                <button
                  onClick={() => handlePasskeyLogin()}
                  disabled={loading}
                  className="w-full p-4 bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)]/80 border border-[var(--border)] rounded-xl text-left transition-colors disabled:opacity-50 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center group-hover:bg-[var(--accent)]/20 transition-colors">
                      <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Passkey</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        Usa huella digital, rostro o PIN
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              )}

              {loginData.hasTotp && (
                <button
                  onClick={() => setStep('verify-totp')}
                  disabled={loading}
                  className="w-full p-4 bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)]/80 border border-[var(--border)] rounded-xl text-left transition-colors disabled:opacity-50 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center group-hover:bg-[var(--accent)]/20 transition-colors">
                      <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Código de verificación</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        Usa tu app de autenticación
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-lg">
                  <svg className="w-4 h-4 text-[var(--danger)] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-[var(--danger)]">{error}</p>
                </div>
              )}

              <button
                onClick={handleBackToEmail}
                className="w-full text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors pt-2"
              >
                ← Usar otro email
              </button>
            </div>
          )}

          {step === 'verify-passkey' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-[var(--accent)]/10 flex items-center justify-center animate-pulse">
                <svg className="w-8 h-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">Verificación con Passkey</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Usa tu método biométrico para continuar
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-lg text-left">
                  <svg className="w-4 h-4 text-[var(--danger)] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-[var(--danger)]">{error}</p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handlePasskeyLogin()}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Verificando...
                    </span>
                  ) : (
                    'Intentar de nuevo'
                  )}
                </button>

                {loginData?.hasTotp && (
                  <button
                    onClick={handleUseTotpInstead}
                    disabled={loading}
                    className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors py-1"
                  >
                    Usar código de verificación en su lugar
                  </button>
                )}

                <button
                  onClick={handleBackToEmail}
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  ← Usar otro email
                </button>
              </div>
            </div>
          )}

          {step === 'verify-totp' && (
            <form onSubmit={handleTotpSubmit} className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-[var(--accent)]/10 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <p className="text-sm font-medium">Código de verificación</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Ingresa el código de 6 dígitos de tu app autenticadora
                </p>
              </div>

              <div className="flex justify-center gap-2">
                {totpCode.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => { inputRefs.current[idx] = el }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleTotpDigitChange(idx, e.target.value)}
                    onKeyDown={e => handleTotpKeyDown(idx, e)}
                    onPaste={idx === 0 ? handleTotpPaste : undefined}
                    className="w-10 h-12 text-center text-lg font-semibold bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-shadow"
                  />
                ))}
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-lg">
                  <svg className="w-4 h-4 text-[var(--danger)] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-[var(--danger)]">{error}</p>
                </div>
              )}

                  <button
                    type="submit"
                    disabled={loading || totpCode.join('').length !== 6}
                    className="w-full py-2.5 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Verificando...
                      </span>
                    ) : (
                      'Verificar'
                    )}
                  </button>

              <div className="flex flex-col items-center gap-2">
                {loginData?.hasPasskeys && (
                  <button
                    type="button"
                    onClick={() => handlePasskeyLogin()}
                    disabled={loading}
                    className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    Usar passkey en su lugar
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleBackToEmail}
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  ← Usar otro email
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          AicoreOps &mdash; Solo personal autorizado
        </p>
      </div>
    </div>
  )
}