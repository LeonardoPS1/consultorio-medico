'use client'

import { useState } from 'react'

interface Props {
  tenantId: string
  tenantName: string
}

export function ImpersonateButton({ tenantId, tenantName }: Props) {
  const [open, setOpen] = useState(false)
  const [directLoading, setDirectLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [motivoError, setMotivoError] = useState('')
  const [result, setResult] = useState<{
    ok: boolean
    message?: string
    adminNombre?: string
    adminEmail?: string
    impersonateLink?: string
    emailSent?: boolean
  } | null>(null)

  function validateMotivo(): boolean {
    if (!motivo.trim()) {
      setMotivoError('El motivo es obligatorio')
      return false
    }
    if (motivo.trim().length < 10) {
      setMotivoError('El motivo debe tener al menos 10 caracteres')
      return false
    }
    if (motivo.length > 500) {
      setMotivoError('El motivo no puede exceder 500 caracteres')
      return false
    }
    setMotivoError('')
    return true
  }

  async function handleDirect() {
    if (!validateMotivo()) return
    setDirectLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/auth/impersonate/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, motivo: motivo.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.impersonateLink) {
        window.open(data.impersonateLink, '_blank', 'noopener,noreferrer')
        setResult({
          ok: true,
          adminNombre: data.adminNombre,
          adminEmail: data.adminEmail,
          impersonateLink: data.impersonateLink,
          message: `Sesión iniciada como ${data.adminNombre} (${data.adminEmail}). Link de uso único, expira en 1 hora.`,
        })
      } else if (res.status === 403 && data.error === 'TOTP_REQUIRED') {
        setResult({
          ok: false,
          message: 'Se requiere verificar el TOTP de tu cuenta antes de entrar sin aprobación.',
        })
      } else {
        setResult({ ok: false, message: data.error || 'Error al iniciar impersonación directa' })
      }
    } catch {
      setResult({ ok: false, message: 'Error de conexión' })
    } finally {
      setDirectLoading(false)
    }
  }

  async function handleEmail() {
    if (!validateMotivo()) return
    setEmailLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/auth/impersonate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, motivo: motivo.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({
          ok: true,
          adminNombre: data.adminNombre,
          adminEmail: data.adminEmail,
          emailSent: data.emailSent,
          impersonateLink: data.impersonateLink,
          message: data.emailSent
            ? `Email enviado a ${data.adminEmail}`
            : `Sin SMTP configurado — compartí el link manualmente:`,
        })
      } else {
        setResult({ ok: false, message: data.error || 'Error al iniciar impersonación' })
      }
    } catch {
      setResult({ ok: false, message: 'Error de conexión' })
    } finally {
      setEmailLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => { setMotivo(''); setMotivoError(''); setResult(null); setOpen(true) }}
        className="text-sm text-[var(--accent)] hover:underline"
        title="Iniciar sesión como administrador del tenant"
      >
        Entrar como admin
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => { setOpen(false); setResult(null); setMotivo(''); setMotivoError('') }}
        >
          <div
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-1">Entrar como administrador</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              <strong>{tenantName}</strong> — elegí cómo querés acceder al panel.
            </p>

            {result ? (
              <div className={`text-sm p-3 rounded-lg mb-4 ${result.ok ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>
                {result.ok ? (
                  <div>
                    <p className="font-semibold mb-1">
                      {result.emailSent ? '✅ Email enviado' : '✅ Sesión iniciada'}
                    </p>
                    <p>Destino: {result.adminNombre} ({result.adminEmail})</p>
                    {result.impersonateLink ? (
                      <div className="mt-2">
                        <a
                          href={result.impersonateLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[var(--accent)] underline break-all"
                        >
                          {result.impersonateLink}
                        </a>
                        <p className="text-xs mt-1 text-amber-500">
                          {result.emailSent
                            ? 'Compartí este link con el administrador. Expira en 1 hora, uso único.'
                            : 'Expira en 1 hora, uso único.'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs mt-2 text-[var(--text-muted)]">
                        El administrador debe hacer clic en el enlace del email para otorgar acceso.
                      </p>
                    )}
                  </div>
                ) : (
                  <p>❌ {result.message}</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="block text-sm font-medium mb-1">Motivo de la impersonación <span className="text-red-500">*</span></label>
                <textarea
                  value={motivo}
                  onChange={(e) => { setMotivo(e.target.value); if (motivoError) setMotivoError('') }}
                  rows={3}
                  className={`w-full px-3 py-2 bg-[var(--bg)] border rounded-lg text-sm ${motivoError ? 'border-red-500' : 'border-[var(--border)]'} focus:outline-none focus:ring-2 focus:ring-[var(--accent)]`}
                  placeholder="Ej: Investigar error de facturación, Revisar configuración de turnos, Soporte técnico solicitado por el admin..."
                  maxLength={500}
                />
                {motivoError && <p className="text-xs text-red-500">{motivoError}</p>}

                <button
                  onClick={handleDirect}
                  disabled={directLoading || emailLoading || !motivo.trim() || motivo.trim().length < 10}
                  className="w-full px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {directLoading ? 'Abriendo sesión...' : '⚡ Entrar ahora (sin aprobación)'}
                </button>
                <button
                  onClick={handleEmail}
                  disabled={directLoading || emailLoading || !motivo.trim() || motivo.trim().length < 10}
                  className="w-full px-4 py-2 border border-[var(--border)] rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
                >
                  {emailLoading ? 'Enviando...' : 'Enviar email de acceso al admin'}
                </button>
              </div>
            )}

            {result?.ok && (
              <button
                onClick={() => { setOpen(false); setResult(null); setMotivo(''); setMotivoError('') }}
                className="mt-3 w-full px-4 py-2 border border-[var(--border)] rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
