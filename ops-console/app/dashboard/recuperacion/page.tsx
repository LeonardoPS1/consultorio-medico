'use client'

import { useState, useEffect, useCallback } from 'react'

interface BackupFile {
  filename: string
  path?: string
  sizeBytes: number
  createdAt: string
}

interface TenantInfo {
  id: string
  nombre: string
}

interface BackupsData {
  postgres: BackupFile[]
  volumes: BackupFile[]
  tenants: BackupFile[]
}

interface CreateBackupResult {
  success: boolean
  message: string
  results?: Record<string, { success: boolean; output: string }>
  error?: string
}

interface TriggerResult {
  success?: boolean
  message?: string
  error?: string
  output?: string
}

interface VerifyResult {
  valid: boolean
  message: string
  size: string
}

export default function RecuperacionPage() {
  const [backups, setBackups] = useState<BackupsData | null>(null)
  const [tenantList, setTenantList] = useState<TenantInfo[]>([])
  const [selectedTenant, setSelectedTenant] = useState<string>('')
  const [diskSpace, setDiskSpace] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createProgress, setCreateProgress] = useState('')
  const [result, setResult] = useState<TriggerResult | null>(null)
  const [createResult, setCreateResult] = useState<CreateBackupResult | null>(null)
  const [verifiedFiles, setVerifiedFiles] = useState<Record<string, boolean | 'checking'>>({})
  const [deletingFiles, setDeletingFiles] = useState<Record<string, boolean>>({})
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const fetchBackups = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    setRefreshing(true)
    setFetchError(null)
    try {
      const params = selectedTenant ? `?tenantId=${selectedTenant}` : ''
      const res = await fetch('/api/recuperacion' + params)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Error ${res.status}`)
      }
      const data = await res.json()
      if (data.backups) setBackups(data.backups)
      if (data.diskSpace) setDiskSpace(data.diskSpace)
      if (data.tenantList) setTenantList(data.tenantList)
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Error al cargar backups')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedTenant])

  useEffect(() => { fetchBackups(true) }, [fetchBackups])

  const handleCreateBackup = async () => {
    setCreating(true)
    setCreateProgress('Iniciando backup...')
    setCreateResult(null)
    try {
      const res = await fetch('/api/recuperacion/crear-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: selectedTenant ? JSON.stringify({ tenantId: selectedTenant }) : '{}',
      })
      const data = await res.json()
      setCreateResult(data)
      if (data.success) {
        setCreateProgress('Backup creado. Refrescando...')
        setTimeout(() => fetchBackups(false), 1500)
      } else {
        setCreateProgress('')
      }
    } catch {
      setCreateResult({ success: false, message: 'Error de conexión' })
      setCreateProgress('')
    } finally {
      setCreating(false)
    }
  }

  const handleTriggerRecovery = async (file?: string) => {
    setTriggering(true)
    setResult(null)
    try {
      const body: Record<string, string> = {}
      if (file) body.backupFile = file
      if (selectedTenant) body.tenantId = selectedTenant
      const res = await fetch('/api/recuperacion/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setResult({ error: data.error || `Error ${res.status}` })
        return
      }
      setResult(data)
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : 'Error de conexión' })
    } finally {
      setTriggering(false)
    }
  }

  const handleVerify = async (filename: string) => {
    setVerifiedFiles(prev => ({ ...prev, [filename]: 'checking' as const }))
    try {
      const res = await fetch(`/api/recuperacion/verify?file=${encodeURIComponent(filename)}`)
      const data: VerifyResult = await res.json()
      setVerifiedFiles(prev => ({ ...prev, [filename]: data.valid }))
    } catch {
      setVerifiedFiles(prev => ({ ...prev, [filename]: false }))
    }
  }

  const handleDelete = async (filename: string) => {
    if (!confirm(`¿Eliminar permanentemente "${filename}"?`)) return
    setDeletingFiles(prev => ({ ...prev, [filename]: true }))
    try {
      await fetch('/api/recuperacion/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupFile: filename, force: true }),
      })
      fetchBackups(false)
    } catch {
      alert('Error al eliminar')
    } finally {
      setDeletingFiles(prev => ({ ...prev, [filename]: false }))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return
    if (!confirm(`¿Eliminar ${selectedFiles.size} backups permanentemente?`)) return
    setBulkDeleting(true)
    let ok = 0
    for (const f of selectedFiles) {
      try {
        await fetch('/api/recuperacion/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backupFile: f, force: true }),
        })
        ok++
      } catch { /* skip */ }
    }
    setSelectedFiles(new Set())
    setBulkDeleting(false)
    fetchBackups(false)
  }

  const toggleSelect = (filename: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev)
      if (next.has(filename)) next.delete(filename)
      else next.add(filename)
      return next
    })
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

  const hasBackups = (backups?.postgres?.length ?? 0) + (backups?.volumes?.length ?? 0) + (backups?.tenants?.length ?? 0) > 0

  const renderBackupItem = (b: BackupFile, type: string) => {
    const isTenant = type === 'tenant'
    const verified = verifiedFiles[b.filename]
    const deleting = deletingFiles[b.filename]
    const selected = selectedFiles.has(b.filename)

    return (
      <div key={b.filename} className="flex items-center gap-2 py-1.5 border-b border-[var(--border)] last:border-0 text-xs">
        {isTenant && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => toggleSelect(b.filename)}
            className="accent-emerald-500"
            title="Seleccionar para borrado masivo"
          />
        )}
        <span className="text-[var(--text-muted)] shrink-0 w-16 font-mono">{formatDate(b.createdAt)}</span>
        <span className="truncate flex-1 text-[var(--text-secondary)]" title={b.filename}>
          {b.filename.replace(/_\d{8}_\d{6}\./, '…').replace(/\.tenant\.sql\.gz\.gpg$/, '')}
        </span>
        <span className="font-mono text-[var(--text-muted)]">{formatSize(b.sizeBytes)}</span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => handleVerify(b.filename)}
            disabled={verified === 'checking'}
            className="px-1.5 py-0.5 rounded border border-[var(--border)] hover:bg-[var(--bg-hover)] disabled:opacity-50 text-[10px] transition-colors"
            title="Verificar integridad GPG"
          >
            {verified === 'checking' ? '…' : verified === true ? '✅' : verified === false ? '❌' : '🔍'}
          </button>
          <button
            onClick={() => handleTriggerRecovery(b.filename)}
            disabled={triggering}
            className="px-1.5 py-0.5 rounded bg-amber-600/20 text-amber-500 hover:bg-amber-600/30 text-[10px] transition-colors"
            title="Restaurar este backup"
          >
            ↻
          </button>
          <button
            onClick={() => handleDelete(b.filename)}
            disabled={deleting}
            className="px-1.5 py-0.5 rounded bg-red-600/20 text-red-500 hover:bg-red-600/30 text-[10px] transition-colors"
            title="Eliminar"
          >
            {deleting ? '…' : '✕'}
          </button>
        </div>
      </div>
    )
  }

  const tenantBanner = selectedTenant
    ? tenantList.find(t => t.id === selectedTenant)?.nombre || selectedTenant.slice(0, 8)
    : 'todos los tenants'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Recuperación ante Desastres</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Restauración del sistema completo · <span className="text-[var(--accent)] font-medium">{tenantBanner}</span>
          </p>
        </div>
        <button
          onClick={() => fetchBackups(false)}
          disabled={refreshing}
          className="px-3 py-1.5 text-xs border border-[var(--border)] rounded-lg hover:bg-[var(--bg-hover)] disabled:opacity-50 transition-colors flex items-center gap-1.5"
        >
          {refreshing ? (
            <><span className="inline-block w-3 h-3 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin" /> Actualizando...</>
          ) : (
            'Refrescar'
          )}
        </button>
      </div>

      {/* Tenant Selector */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
        <label className="text-xs font-medium text-[var(--text-secondary)] block mb-2">🎯 Filtrar por tenant</label>
        <div className="flex items-center gap-3">
          <select
            value={selectedTenant}
            onChange={e => setSelectedTenant(e.target.value)}
            className="flex-1 bg-black/40 border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="">— Todos los tenants —</option>
            {tenantList.map(t => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
          <button
            onClick={() => fetchBackups(false)}
            className="px-3 py-1.5 text-xs border border-[var(--border)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          >
            Aplicar filtro
          </button>
        </div>
      </div>

      {diskSpace && (
        <div className="text-xs text-[var(--text-muted)]">Disco: {diskSpace}</div>
      )}

      {fetchError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm">
          <strong className="text-red-500">❌ Error al cargar backups:</strong>
          <p className="text-[var(--text-secondary)] mt-1">{fetchError}</p>
          <button onClick={() => fetchBackups(false)} className="mt-2 text-xs underline hover:no-underline">Reintentar</button>
        </div>
      )}

      {!loading && !hasBackups && !fetchError && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm">
          <strong className="text-amber-600">⚠️ No hay backups disponibles.</strong>
          <p className="text-[var(--text-secondary)] mt-1">Usá el botón &quot;📦 Crear Backup&quot; para crear tu primer backup.</p>
        </div>
      )}

      {/* 3-column backup cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PostgreSQL */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">📦 PostgreSQL</h2>
          <div className="text-[10px] text-[var(--text-muted)] mb-2">*.sql.gz.gpg</div>
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="inline-block w-3 h-3 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin" /> Cargando...
            </div>
          ) : !backups?.postgres?.length ? (
            <p className="text-xs text-[var(--text-muted)]">Sin backups</p>
          ) : (
            <div className="space-y-0 max-h-60 overflow-y-auto">
              {backups.postgres.map(b => renderBackupItem(b, 'postgres'))}
            </div>
          )}
        </div>

        {/* Volumes */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">💾 Volúmenes Docker</h2>
          <div className="text-[10px] text-[var(--text-muted)] mb-2">*.tar.gz.gpg</div>
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="inline-block w-3 h-3 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin" /> Cargando...
            </div>
          ) : !backups?.volumes?.length ? (
            <p className="text-xs text-[var(--text-muted)]">Sin backups</p>
          ) : (
            <div className="space-y-0 max-h-60 overflow-y-auto">
              {backups.volumes.map(b => renderBackupItem(b, 'volumes'))}
            </div>
          )}
        </div>

        {/* Tenant backups */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">🏢 Tenants</h2>
            {selectedFiles.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="px-2 py-0.5 text-[10px] bg-red-600/20 text-red-500 rounded hover:bg-red-600/30 disabled:opacity-50 transition-colors"
              >
                {bulkDeleting ? '…' : `Borrar ${selectedFiles.size}`}
              </button>
            )}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mb-2">*.tenant.sql.gz.gpg</div>
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="inline-block w-3 h-3 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin" /> Cargando...
            </div>
          ) : !backups?.tenants?.length ? (
            <p className="text-xs text-[var(--text-muted)]">
              {selectedTenant ? 'Sin backups para este tenant' : 'Sin backups per-tenant'}
            </p>
          ) : (
            <div className="space-y-0 max-h-60 overflow-y-auto">
              {backups.tenants.map(b => renderBackupItem(b, 'tenant'))}
            </div>
          )}
        </div>
      </div>

      {/* Create Backup */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-2">🛡️ Crear Backup</h2>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          {selectedTenant
            ? 'Crea un backup per-tenant (solo datos de este tenant).'
            : 'Crea backups completos del sistema (PostgreSQL + volúmenes Docker).'}
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {creating ? (
              <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {createProgress || 'Creando...'}</>
            ) : selectedTenant ? (
              '🏢 Backup del Tenant'
            ) : (
              '📦 Backup Completo'
            )}
          </button>
          {selectedTenant && (
            <span className="text-[10px] text-[var(--text-muted)]">
              Solo datos del tenant seleccionado arriba
            </span>
          )}
        </div>

        {createResult && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            createResult.success
              ? 'bg-green-500/10 border border-green-500/30 text-green-600'
              : 'bg-red-500/10 border border-red-500/30 text-red-500'
          }`}>
            <strong>{createResult.success ? '✅' : '❌'} {createResult.success ? 'Backup creado' : 'Error'}</strong>
            {!createResult.success && createResult.error && (
              <p className="mt-1 text-xs">{createResult.error}</p>
            )}
            {createResult.results && (
              <div className="mt-2 space-y-1 text-xs font-mono">
                {Object.entries(createResult.results).map(([name, r]) => (
                  <div key={name} className={r.success ? 'text-green-500' : 'text-red-500'}>
                    {r.success ? '✓' : '✗'} {name}: {r.output.slice(0, 200)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recovery Trigger */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-2">
          🚀 {selectedTenant ? 'Recuperar Tenant' : 'Recuperación automática'}
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          {selectedTenant
            ? `Ejecuta recover.sh --tenant "${selectedTenant}" vía SSH para restaurar este tenant desde su último backup.`
            : 'Ejecuta recover.sh --force vía SSH para restaurar desde los últimos backups completos.'}
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleTriggerRecovery()}
            disabled={triggering || !hasBackups}
            className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {triggering ? 'Ejecutando...' : selectedTenant ? '▶ Restaurar Tenant' : '▶ Iniciar Recuperación'}
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
            {result.success ? <>✅ {result.message}</> : <>❌ {result.error || result.message}</>}
            {result.output && (
              <pre className="mt-2 p-2 bg-black/80 rounded text-green-400 text-xs font-mono max-h-48 overflow-auto whitespace-pre-wrap">
                {result.output}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Legacy guides */}
      <details className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
        <summary className="p-5 cursor-pointer text-sm font-semibold select-none">📋 Cómo crear backups (guía)</summary>
        <div className="px-5 pb-5 space-y-4 text-xs text-[var(--text-secondary)]">
          <p>Backups per-tenant y completos — todos encriptados con GPG:</p>
          <div className="bg-black/80 rounded-lg p-3 font-mono text-xs text-green-400 space-y-1">
            <div># Backup completo (PostgreSQL + volúmenes)</div>
            <div>bash scripts/backup-encriptado.sh</div>
            <div>bash scripts/backup-volumenes.sh</div>
            <div>&nbsp;</div>
            <div># Backup per-tenant (un solo tenant)</div>
            <div>bash scripts/backup-tenant.sh &lt;tenant-uuid&gt;</div>
            <div>&nbsp;</div>
            <div># Restaurar un tenant</div>
            <div>bash scripts/restore-tenant.sh &lt;archivo.gpg&gt; &lt;tenant-uuid&gt;</div>
            <div>&nbsp;</div>
            <div># Eliminar un backup</div>
            <div>bash scripts/delete-backup.sh &lt;archivo&gt; --force</div>
          </div>
        </div>
      </details>

      <details className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
        <summary className="p-5 cursor-pointer text-sm font-semibold select-none">🔧 Recuperación manual vía SSH</summary>
        <div className="px-5 pb-5 space-y-3 text-xs">
          <div className="bg-black/80 rounded-lg p-3 font-mono text-xs text-green-400 space-y-1">
            <div>ssh ubuntu@51.222.207.250</div>
            <div>cd /opt/consultorio</div>
            <div>&nbsp;</div>
            <div>make recover-status            # Ver backups disponibles</div>
            <div>make recover                   # Recuperación completa</div>
            <div>make recover-force             # Sin confirmación</div>
            <div>make recover-drill             # Drill aislado</div>
            <div>&nbsp;</div>
            <div># Per-tenant desde SSH:</div>
            <div>bash scripts/recover.sh --tenant &lt;uuid&gt;</div>
            <div>bash scripts/recover.sh --tenant &lt;uuid&gt; --drill</div>
          </div>
        </div>
      </details>
    </div>
  )
}
