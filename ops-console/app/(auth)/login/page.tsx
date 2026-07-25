'use client'

import { useState, useCallback, useEffect } from 'react'
import { startAuthentication } from '@simplewebauthn/browser'

type Step = 'email' | 'webauthn' | 'totp'

export default function LoginPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [partialToken, setPartialToken] = useState('')
  const [requiresTotp, setRequiresTotp] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('expired') === '1') {
      setError('Sesión expirada. Inicia sesión nuevamente.')
    }
  }, [])

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

      setStep('webauthn')
      setRequiresTotp(json.data.requiresTotp)

      const authResponse = await startAuthentication(json.data.options)

      const completeRes = await fetch('/api/auth/login/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          credential: authResponse,
          challenge: json.data.options.challenge,
          operatorId: json.data.operatorId,
        }),
      })
      const completeJson = await completeRes.json()

      if (!completeJson.success) {
        setError(completeJson.error || 'Error al verificar passkey')
        return
      }

      if (completeJson.data.requiresTotp) {
        setPartialToken(completeJson.data.partialToken)
        setStep('totp')
        return
      }

      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err?.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [email])

  const handleTotpSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = e.target as HTMLFormElement
    const code = new FormData(form).get('code') as string

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
        return
      }

      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err?.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [email, partialToken])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">AicoreOps</h1>
          <p className="text-[var(--text-secondary)] mt-1 text-sm">
            Panel de plataforma
          </p>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  placeholder="leo@aicorebots.com"
                />
              </div>

              {error && (
                <p className="text-sm text-[var(--danger)]">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-2 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
              >
                {loading ? 'Conectando...' : 'Continuar con Passkey'}
              </button>
            </form>
          )}

          {step === 'webauthn' && (
            <div className="text-center py-4 space-y-3">
              <div className="animate-pulse text-4xl">🔑</div>
              <p className="text-sm text-[var(--text-secondary)]">
                Usa tu passkey para autenticarte
              </p>
              {error && (
                <p className="text-sm text-[var(--danger)]">{error}</p>
              )}
              <button
                onClick={handleEmailSubmit}
                disabled={loading}
                className="w-full py-2 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
              >
                {loading ? 'Verificando...' : 'Intentar de nuevo'}
              </button>
            </div>
          )}

          {step === 'totp' && (
            <form onSubmit={handleTotpSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <p className="text-sm text-[var(--text-secondary)]">
                  Ingresa el código de 6 dígitos
                </p>
              </div>
              <div>
                <input
                  name="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  placeholder="000000"
                />
              </div>

              {error && (
                <p className="text-sm text-[var(--danger)] text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
              >
                {loading ? 'Verificando...' : 'Verificar'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          AicoreOps v1.0.0 &mdash; Solo personal autorizado
        </p>
      </div>
    </div>
  )
}
