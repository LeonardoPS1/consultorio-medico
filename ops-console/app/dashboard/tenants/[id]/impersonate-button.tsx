'use client'

import { useState } from 'react'

interface Props {
  tenantId: string
  tenantName: string
}

export function ImpersonateButton({ tenantId, tenantName }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    ok: boolean
    message?: string
    adminNombre?: string
    adminEmail?: string
    impersonateLink?: string
    emailSent?: boolean
  } | null>(null)

  async function handleStart() {
    setLoading(true)
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
      setLoading(false)
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
            <h2 className="text-lg font-bold mb-2">Entrar como administrador</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Se enviará un email al administrador de <strong>{tenantName}</strong>
              {' '}con un enlace para acceder a su panel.
            </p>

            {result ? (
              <div className={`text-sm p-3 rounded-lg mb-4 ${result.ok ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>
                {result.ok ? (
                  <div>
                    <p className="font-semibold mb-1">
                      {result.emailSent ? '✅ Email enviado' : '🔗 Link generado'}
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
                          Sin SMTP configurado — compartí este link con el administrador.
                          Expira en 1 hora, uso único.
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
              <div className="flex gap-2">
                <button
                  onClick={handleStart}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Enviar email de acceso'}
                </button>
                <button
                  onClick={() => { setOpen(false); setResult(null) }}
                  className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                >
                  Cancelar
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
