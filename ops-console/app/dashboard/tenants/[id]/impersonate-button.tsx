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
  const [result, setResult] = useState<{
    ok: boolean
    message?: string
    adminNombre?: string
    adminEmail?: string
    impersonateLink?: string
    emailSent?: boolean
  } | null>(null)

  async function handleDirect() {
    setDirectLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/auth/impersonate/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
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
    setEmailLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/auth/impersonate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
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
        onClick={() => setOpen(true)}
        className="text-sm text-[var(--accent)] hover:underline"
        title="Iniciar sesión como administrador del tenant"
      >
        Entrar como admin
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => { setOpen(false); setResult(null) }}
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
                <button
                  onClick={handleDirect}
                  disabled={directLoading || emailLoading}
                  className="w-full px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {directLoading ? 'Abriendo sesión...' : '⚡ Entrar ahora (sin aprobación)'}
                </button>
                <button
                  onClick={handleEmail}
                  disabled={directLoading || emailLoading}
                  className="w-full px-4 py-2 border border-[var(--border)] rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
                >
                  {emailLoading ? 'Enviando...' : 'Enviar email de acceso al admin'}
                </button>
              </div>
            )}

            {result?.ok && (
              <button
                onClick={() => { setOpen(false); setResult(null) }}
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
