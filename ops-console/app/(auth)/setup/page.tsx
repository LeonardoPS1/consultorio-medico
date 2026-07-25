'use client'

import { useState, useCallback, useEffect } from 'react'
import { startRegistration } from '@simplewebauthn/browser'

type Step = 'passkey' | 'totp' | 'complete'

export default function SetupPage() {
  const [step, setStep] = useState<Step>('passkey')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [setupToken, setSetupToken] = useState('')
  const [totpSecret, setTotpSecret] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) setSetupToken(token)
  }, [])

  const handlePasskeyRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const beginRes = await fetch('/api/auth/register/begin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, setupToken }),
      })
      const beginJson = await beginRes.json()

      if (!beginJson.success) {
        setError(beginJson.error || 'Error al iniciar registro')
        return
      }

      const registrationResponse = await startRegistration(beginJson.data.options)

      const completeRes = await fetch('/api/auth/register/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          credential: registrationResponse,
          challenge: beginJson.data.options.challenge,
        }),
      })
      const completeJson = await completeRes.json()

      if (!completeJson.success) {
        setError(completeJson.error || 'Error al completar registro')
        return
      }

      setQrCode(completeJson.data.totpQrCode)
      setTotpSecret(completeJson.data.totpUri)
      setStep('totp')
    } catch (err: any) {
      setError(err?.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [email, setupToken])

  const handleSkipPasskey = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register/begin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, setupToken, skipPasskey: true }),
      })
      const json = await res.json()

      if (!json.success) {
        setError(json.error || 'Error al configurar TOTP')
        return
      }

      setQrCode(json.data.totpQrCode)
      setTotpSecret(json.data.totpUri)
      setStep('totp')
    } catch (err: any) {
      setError(err?.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [email, setupToken])

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
        body: JSON.stringify({ email, token: code }),
      })
      const json = await res.json()

      if (!json.success) {
        setError(json.error || 'Código inválido')
        return
      }

      setStep('complete')
    } catch (err: any) {
      setError(err?.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [email])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Configuración Inicial</h1>
          <p className="text-[var(--text-secondary)] mt-1 text-sm">
            AicoreOps — Primer operador
          </p>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
          {step === 'passkey' && (
            <div className="space-y-4">
              <form onSubmit={handlePasskeyRegister} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                    Email del operador
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                    placeholder="leo@aicorebots.com"
                  />
                </div>

                {setupToken && (
                  <p className="text-xs text-[var(--text-muted)]">
                    Token de setup detectado
                  </p>
                )}

                {error && (
                  <p className="text-sm text-[var(--danger)]">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-2 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                >
                  {loading ? 'Registrando...' : 'Registrar Passkey'}
                </button>

                <p className="text-xs text-[var(--text-muted)] text-center">
                  Tu navegador te pedirá crear un passkey (Touch ID, Windows Hello, YubiKey, etc.)
                </p>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border)]" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-[var(--bg-card)] text-[var(--text-muted)]">
                    O
                  </span>
                </div>
              </div>

              <form onSubmit={handleSkipPasskey} className="space-y-4 pt-2">
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-2 px-4 bg-transparent border border-[var(--border)] hover:bg-[var(--bg-secondary)] disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                >
                  {loading ? 'Generando...' : 'Omitir passkey → Usar solo Google Authenticator (TOTP)'}
                </button>
                <p className="text-xs text-[var(--text-muted)] text-center">
                  Solo código de 6 dígitos en tu app de autenticación
                </p>
              </form>
            </div>
          )}

          {step === 'totp' && (
            <form onSubmit={handleTotpSubmit} className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)] text-center">
                Escanea este código QR con Google Authenticator, Authy o 1Password
              </p>

              {qrCode && (
                <div className="flex justify-center">
                  <img
                    src={qrCode}
                    alt="TOTP QR Code"
                    className="w-48 h-48 rounded-lg"
                  />
                </div>
              )}

              {totpSecret && (
                <details className="group">
                  <summary className="text-xs text-[var(--text-muted)] cursor-pointer text-center">
                    Ver clave secreta (copia manual)
                  </summary>
                  <div className="mt-2 p-2 bg-[var(--bg-secondary)] rounded text-xs font-mono break-all text-center">
                    {totpSecret.split('=')[1]?.split('&')[0] || totpSecret}
                  </div>
                </details>
              )}

              <div>
                <label htmlFor="code" className="block text-sm font-medium mb-1.5">
                  Código de verificación (6 dígitos)
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoFocus
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
                {loading ? 'Verificando...' : 'Verificar y Finalizar'}
              </button>
            </form>
          )}

          {step === 'complete' && (
            <div className="text-center py-4 space-y-4">
              <div className="text-4xl">✅</div>
              <h2 className="text-lg font-semibold">Configuración Completa</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Tu passkey y TOTP están configurados.
              </p>
              <a
                href="/dashboard"
                className="inline-block w-full py-2 px-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg text-sm font-medium text-center transition-colors"
              >
                Ir al Dashboard
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
