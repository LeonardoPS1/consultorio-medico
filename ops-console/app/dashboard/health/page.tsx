'use client'

import { useState, useEffect } from 'react'

interface HealthData {
  status: string
  timestamp: string
  version: string
  db: {
    connected: boolean
    latency_ms: number | null
  }
  uptime_seconds: number
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  async function checkHealth() {
    setRefreshing(true)
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      if (data.success) setHealth(data.data)
      else setError(data.error || 'Error al obtener health check')
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 30_000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Estado del sistema</h1>
        <p className="text-sm text-[var(--text-secondary)]">Verificando estado...</p>
      </div>
    )
  }

  const uptime = health ? Math.floor(health.uptime_seconds / 60) : 0
  const uptimeHours = Math.floor(uptime / 60)
  const uptimeMin = uptime % 60

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Estado del sistema</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Monitoreo de salud de ops.aicorebots.com
          </p>
        </div>
        <button
          onClick={checkHealth}
          disabled={refreshing}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {refreshing ? 'Verificando...' : 'Refrescar'}
        </button>
      </div>

      {error && (
        <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-xl p-4 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HealthCard
          label="API Status"
          value={health?.status || 'unknown'}
          ok={health?.status === 'healthy'}
        />
        <HealthCard
          label="Base de datos"
          value={health?.db.connected ? 'Conectada' : 'Desconectada'}
          ok={health?.db.connected ?? false}
        />
        <HealthCard
          label="Latencia DB"
          value={health?.db.latency_ms != null ? `${health.db.latency_ms}ms` : '—'}
          ok={(health?.db.latency_ms ?? Infinity) < 100}
        />
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-3">Detalles</h2>
        <div className="space-y-2">
          <InfoRow label="Versión" value={health?.version || '—'} />
          <InfoRow label="Uptime" value={`${uptimeHours}h ${uptimeMin}m`} />
          <InfoRow label="Último check" value={health?.timestamp ? new Date(health.timestamp).toLocaleString('es-CL') : '—'} />
          <InfoRow label="Auto-refresh" value="Cada 30 segundos" />
        </div>
      </div>
    </div>
  )
}

function HealthCard({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`} />
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-lg font-bold mt-1">{value}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  )
}
