'use client'

import { useState } from 'react'

interface Props {
  tenantId: string
  tenantName: string
}

export function RevokeImpersonationButton({ tenantId, tenantName }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [motivoError, setMotivoError] = useState('')
  const [result, setResult] = useState<{
    ok: boolean
    message?: string
    revocadas?: number
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

  async function handleRevoke() {
    if (!validateMotivo()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/auth/impersonate/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, motivo: motivo.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({
          ok: true,
          revocadas: data.revocadas ?? 0,
          message:
            data.revocadas > 0
              ? `Se revocaron ${data.revocadas} sesión(es) de impersonación activa. El admin verá su sesión invalidadas inmediatamente.`
              : 'No había sesiones de impersonación activas para revocar.',
        })
      } else if (res.status === 403 && data.error === 'TOTP_REQUIRED') {
        setResult({
          ok: false,
          message: 'Se requiere verificar el TOTP de tu cuenta antes de revocar sesiones.',
        })
      } else {
        setResult({ ok: false, message: data.error || 'Error al revocar sesiones' })
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
        onClick={() => { setMotivo(''); setMotivoError(''); setResult(null); setOpen(true) }}
        className="text-sm text-red-500 hover:text-red-400"
        title="Revocar todas las sesiones de impersonación activas del tenant"
      >
        Revocar sesiones
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
            <h2 className="text-lg font-bold mb-1 text-red-500">Revocar sesiones de impersonación</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              <strong>{tenantName}</strong> — todas las sesiones activas como admin quedarán invalidadas de inmediato.
            </p>

            {result ? (
              <div className={`text-sm p-3 rounded-lg mb-4 ${result.ok ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>
                {result.ok ? (
                  <div>
                    <p className="font-semibold mb-1">✅ Sesiones revocadas</p>
                    <p>{result.message}</p>
                  </div>
                ) : (
                  <p>❌ {result.message}</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="block text-sm font-medium mb-1">Motivo de la revocación <span className="text-red-500">*</span></label>
                <textarea
                  value={motivo}
                  onChange={(e) => { setMotivo(e.target.value); if (motivoError) setMotivoError('') }}
                  rows={3}
                  className={`w-full px-3 py-2 bg-[var(--bg)] border rounded-lg text-sm ${motivoError ? 'border-red-500' : 'border-[var(--border)]'} focus:outline-none focus:ring-2 focus:ring-[var(--accent)]`}
                  placeholder="Ej: Sesión abierta por error, Operador finalizó su tarea, Incidente de seguridad detectado..."
                  maxLength={500}
                />
                {motivoError && <p className="text-xs text-red-500">{motivoError}</p>}

                <button
                  onClick={handleRevoke}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50"
                >
                  {loading ? 'Revocando...' : '⛔ Revocar sesiones activas'}
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
