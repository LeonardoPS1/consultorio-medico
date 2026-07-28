'use client'

import { useState, useEffect, useCallback } from 'react'

interface BackupFile {
  filename: string
  sizeBytes: number
  createdAt: string
}

interface BackupsData {
  postgres: BackupFile[]
  volumes: BackupFile[]
}

export default function RecuperacionPage() {
  const [backups, setBackups] = useState<BackupsData | null>(null)
  const [diskSpace, setDiskSpace] = useState('')
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [result, setResult] = useState<{
    success?: boolean
    message?: string
    error?: string
    executionId?: string
    workflowsDisponibles?: string[]
  } | null>(null)

  const fetchBackups = useCallback(async () => {
    try {
      const res = await fetch('/api/recuperacion')
      const data = await res.json()
      if (data.backups) setBackups(data.backups)
      if (data.diskSpace) setDiskSpace(data.diskSpace)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBackups() }, [fetchBackups])

  const handleTriggerRecovery = async () => {
    setTriggering(true)
    setResult(null)
    try {
      const res = await fetch('/api/recuperacion/trigger', { method: 'POST' })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ error: 'Error de conexión' })
    } finally {
      setTriggering(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('es-CL', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const hasBackups = backups && (backups.postgres.length > 0 || backups.volumes.length > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Recuperación</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Restauración completa del sistema desde backups
          </p>
        </div>
        <button
          onClick={fetchBackups}
          className="px-3 py-1.5 text-xs border border-[var(--border)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
        >
          Refrescar
        </button>
      </div>

      {diskSpace && (
        <div className="text-xs text-[var(--text-muted)]">
          Disco: {diskSpace}
        </div>
      )}

      {/* 📦 Últimos backups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">📦 PostgreSQL</h2>
          {loading ? (
            <p className="text-xs text-[var(--text-muted)]">Cargando...</p>
          ) : !backups?.postgres?.length ? (
            <p className="text-xs text-[var(--text-muted)]">Sin backups</p>
          ) : (
            <div className="space-y-2">
              {backups.postgres.map(b => (
                <div key={b.filename} className="flex justify-between text-xs py-1 border-b border-[var(--border)] last:border-0">
                  <span className="truncate text-[var(--text-secondary)]">{formatDate(b.createdAt)}</span>
                  <span className="font-mono">{formatSize(b.sizeBytes)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">💾 Volúmenes</h2>
          {loading ? (
            <p className="text-xs text-[var(--text-muted)]">Cargando...</p>
          ) : !backups?.volumes?.length ? (
            <p className="text-xs text-[var(--text-muted)]">Sin backups</p>
          ) : (
            <div className="space-y-2">
              {backups.volumes.map(b => (
                <div key={b.filename} className="flex justify-between text-xs py-1 border-b border-[var(--border)] last:border-0">
                  <span className="truncate text-[var(--text-secondary)]">{b.filename.replace(/_\d+.*/, '')} · {formatDate(b.createdAt)}</span>
                  <span className="font-mono">{formatSize(b.sizeBytes)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 🚀 Recuperación */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-2">🚀 Recuperación automática</h2>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          Ejecuta el WF-14 en n8n para restaurar desde los últimos backups.
          La restauración ocurre en el VPS (no en este container).
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTriggerRecovery}
            disabled={triggering || !hasBackups}
            className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {triggering ? 'Ejecutando...' : '▶ Iniciar Recuperación'}
          </button>
          {!hasBackups && !loading && (
            <span className="text-xs text-[var(--text-muted)]">(no hay backups disponibles)</span>
          )}
        </div>

        {result && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            result.success
              ? 'bg-green-500/10 border border-green-500/30 text-green-600'
              : 'bg-red-500/10 border border-red-500/30 text-red-500'
          }`}>
            {result.success ? (
              <>
                ✅ {result.message}
                {result.executionId && (
                  <div className="mt-1 text-xs opacity-70">Execution ID: {result.executionId}</div>
                )}
              </>
            ) : (
              <>
                ❌ {result.error}
                {result.workflowsDisponibles && (
                  <div className="mt-1 text-xs">
                    Workflows disponibles: {result.workflowsDisponibles.join(', ')}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 📖 Recuperación manual (SSH) */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-2">📖 Recuperación manual vía SSH</h2>
        <p className="text-xs text-[var(--text-secondary)] mb-3">
          Si n8n no está disponible, conectate por SSH al VPS y ejecutá:
        </p>
        <div className="bg-black/80 rounded-lg p-3 font-mono text-xs text-green-400 space-y-1">
          <div># Recuperación completa auto-detectada</div>
          <div>cd /opt/consultorio &amp;&amp; git pull &amp;&amp; make recover</div>
          <div>&nbsp;</div>
          <div># Drill en container aislado (prueba segura)</div>
          <div>cd /opt/consultorio &amp;&amp; make recover-drill</div>
          <div>&nbsp;</div>
          <div># Verificar estado de backups</div>
          <div>cd /opt/consultorio &amp;&amp; make recover-status</div>
        </div>
      </div>
    </div>
  )
}
