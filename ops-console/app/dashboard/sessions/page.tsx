'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Session {
  id: string
  jti: string
  expiresAt: Date
  revoked: boolean
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  isCurrent: boolean
}

export default function SessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)

  async function loadSessions() {
    setLoading(true)
    try {
      const res = await fetch('/api/sessions')
      const data = await res.json()
      if (data.success) setSessions(data.data)
    } catch {
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSessions() }, [])

  async function revokeSession(sessionId: string) {
    setRevoking(sessionId)
    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      await loadSessions()
    } finally {
      setRevoking(null)
    }
  }

  async function revokeAll() {
    const active = sessions.filter(s => !s.revoked && !s.isCurrent)
    for (const s of active) {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: s.id }),
      })
    }
    await loadSessions()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Sesiones activas</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Sesiones JWT activas de tu cuenta
          </p>
        </div>
        <button
          onClick={revokeAll}
          className="px-4 py-2 bg-[var(--danger)]/20 text-[var(--danger)] rounded-lg text-sm hover:bg-[var(--danger)]/30 transition-colors"
        >
          Cerrar otras sesiones
        </button>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
              <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Estado</th>
              <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Creada</th>
              <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">Expira</th>
              <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">IP</th>
              <th className="text-left py-3 px-4 font-medium text-[var(--text-secondary)]">User Agent</th>
              <th className="text-center py-3 px-4 font-medium text-[var(--text-secondary)]">Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-[var(--text-muted)]">
                  Cargando...
                </td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-[var(--text-muted)]">
                  Sin sesiones registradas
                </td>
              </tr>
            ) : (
              sessions.map(s => (
                <tr key={s.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="py-3 px-4">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      s.revoked
                        ? 'bg-[var(--danger)]/20 text-[var(--danger)]'
                        : s.isCurrent
                          ? 'bg-[var(--success)]/20 text-[var(--success)]'
                          : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                    }`}>
                      {s.revoked ? 'Revocada' : s.isCurrent ? 'Actual' : 'Activa'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-[var(--text-muted)] font-mono">
                    {new Date(s.createdAt).toLocaleString('es-CL')}
                  </td>
                  <td className="py-3 px-4 text-xs text-[var(--text-muted)] font-mono">
                    {new Date(s.expiresAt).toLocaleString('es-CL')}
                  </td>
                  <td className="py-3 px-4 text-xs font-mono text-[var(--text-secondary)]">
                    {s.ipAddress || '—'}
                  </td>
                  <td className="py-3 px-4 text-xs text-[var(--text-secondary)] max-w-[200px] truncate">
                    {s.userAgent || '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {!s.revoked && !s.isCurrent && (
                      <button
                        onClick={() => revokeSession(s.id)}
                        disabled={revoking === s.id}
                        className="text-xs text-[var(--danger)] hover:underline disabled:opacity-50"
                      >
                        {revoking === s.id ? '...' : 'Revocar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
