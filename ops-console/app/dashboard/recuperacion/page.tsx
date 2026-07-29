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

interface ScriptResult {
  success: boolean
  output: string
}

interface CreateBackupResult {
  success: boolean
  message: string
  results?: Record<string, ScriptResult>
  error?: string
}

interface TriggerResult {
  success?: boolean
  message?: string
  error?: string
  executionId?: string
  workflowsDisponibles?: string[]
  output?: string
}

export default function RecuperacionPage() {
  const [backups, setBackups] = useState<BackupsData | null>(null)
  const [diskSpace, setDiskSpace] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createProgress, setCreateProgress] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const [showProcedure, setShowProcedure] = useState(false)
  const [showInfra, setShowInfra] = useState(false)
  const [result, setResult] = useState<TriggerResult | null>(null)
  const [createResult, setCreateResult] = useState<CreateBackupResult | null>(null)

  const fetchBackups = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    setRefreshing(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/recuperacion')
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Error ${res.status}`)
      }
      const data = await res.json()
      if (data.backups) setBackups(data.backups)
      if (data.diskSpace) setDiskSpace(data.diskSpace)
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Error al cargar backups')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchBackups(true) }, [fetchBackups])

  const handleTriggerRecovery = async () => {
    setTriggering(true)
    setResult(null)
    try {
      const res = await fetch('/api/recuperacion/trigger', { method: 'POST' })
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

  const hasBackups = (backups?.postgres?.length ?? 0) > 0 || (backups?.volumes?.length ?? 0) > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Recuperación ante Desastres</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Restauración del sistema completo desde backups
          </p>
        </div>
        <button
          onClick={() => fetchBackups(false)}
          disabled={refreshing}
          className="px-3 py-1.5 text-xs border border-[var(--border)] rounded-lg hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
        >
          {refreshing ? (
            <><span className="inline-block w-3 h-3 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin" /> Actualizando...</>
          ) : (
            'Refrescar'
          )}
        </button>
      </div>

      {diskSpace && (
        <div className="text-xs text-[var(--text-muted)]">
          Disco: {diskSpace}
        </div>
      )}

      {fetchError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm">
          <strong className="text-red-500">❌ Error al cargar backups:</strong>
          <p className="text-[var(--text-secondary)] mt-1">{fetchError}</p>
          <button onClick={() => fetchBackups(false)} className="mt-2 text-xs underline hover:no-underline">
            Reintentar
          </button>
        </div>
      )}

      {!loading && !hasBackups && !fetchError && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm">
            <strong className="text-amber-600">⚠️ No hay backups disponibles.</strong>
          <p className="text-[var(--text-secondary)] mt-1">
            Usá el botón &quot;📦 Crear Backup&quot; de más abajo para crear tu primer backup.
          </p>
        </div>
      )}

      {/* 📦 Últimos backups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">📦 PostgreSQL</h2>
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="inline-block w-3 h-3 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin" />
              Cargando...
            </div>
          ) : !backups?.postgres?.length ? (
            <div className="space-y-1">
              <p className="text-xs text-[var(--text-muted)]">Sin backups</p>
            </div>
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
          {refreshing && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <span className="inline-block w-2 h-2 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin" />
              Refrescando...
            </div>
          )}
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">💾 Volúmenes Docker</h2>
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="inline-block w-3 h-3 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin" />
              Cargando...
            </div>
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

      {/* 🛡️ Crear Backup */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-2">🛡️ Crear Backup Ahora</h2>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          Ejecuta los scripts de backup directamente desde este panel.
          Los backups se guardan en /var/backups/consultorio del VPS.
        </p>

        <button
          onClick={async () => {
            setCreating(true)
            setCreateProgress('Iniciando backups...')
            setCreateResult(null)
            try {
              const res = await fetch('/api/recuperacion/crear-backup', { method: 'POST' })
              const data = await res.json()
              setCreateResult(data)
              if (data.success) {
                setCreateProgress('Backups creados. Refrescando lista...')
                setTimeout(() => fetchBackups(false), 1000)
              } else {
                setCreateProgress('')
              }
            } catch {
              setCreateResult({ success: false, message: 'Error de conexión', error: 'Error de conexión' })
              setCreateProgress('')
            } finally {
              setCreating(false)
            }
          }}
          disabled={creating}
          className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {creating ? (
            <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {createProgress || 'Creando...'}</>
          ) : (
            '📦 Crear Backup'
          )}
        </button>

        {createResult && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            createResult.success
              ? 'bg-green-500/10 border border-green-500/30 text-green-600'
              : 'bg-red-500/10 border border-red-500/30 text-red-500'
          }`}>
            <strong>{createResult.success ? '✅' : '❌'} {createResult.success ? 'Backups creados' : 'Error'}</strong>
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

      {/* 🚀 Recuperación automática */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-2">🚀 Recuperación automática</h2>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          Ejecuta <code className="text-green-400">recover.sh --force</code> vía SSH para restaurar desde los últimos backups.
          No requiere n8n — corre directamente en el VPS.
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
        ❌ {result.error || result.message}
        {result.workflowsDisponibles && (
          <div className="mt-1 text-xs">
            Workflows disponibles: {result.workflowsDisponibles.join(', ')}
          </div>
        )}
      </>
    )}
    {result.output && (
      <pre className="mt-2 p-2 bg-black/80 rounded text-green-400 text-xs font-mono max-h-48 overflow-auto whitespace-pre-wrap">
        {result.output}
      </pre>
    )}
  </div>
)}
      </div>

      {/* 📋 Cómo crear backups */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between p-5 text-left"
        >
          <h2 className="text-sm font-semibold">📋 Cómo crear backups</h2>
          <span className="text-xs text-[var(--text-muted)]">{showGuide ? '▲' : '▼'}</span>
        </button>
        {showGuide && (
          <div className="px-5 pb-5 space-y-4 text-xs text-[var(--text-secondary)]">
            <p>Para que los backups funcionen, primero hay que generar un par de claves GPG desde el VPS:</p>

            <div className="bg-black/80 rounded-lg p-3 font-mono text-xs text-green-400 space-y-1">
              <div># 1. Conectarse al VPS por SSH</div>
              <div>ssh ubuntu@51.222.207.250</div>
              <div>sudo -i</div>
              <div>&nbsp;</div>
              <div># 2. Generar par de claves GPG (RSA 4096, sin expiración)</div>
              <div>gpg --full-generate-key</div>
              <div># Tipo: RSA (1), tamaño: 4096, exp: 0 (no expira)</div>
              <div># Email: admin@consultorio.com (debe coincidir con GPG_RECIPIENT)</div>
              <div>&nbsp;</div>
              <div># 3. Exportar clave pública al repo</div>
              <div>gpg --armor --export admin@consultorio.com &gt; /opt/consultorio/scripts/gpg-key.asc</div>
              <div>&nbsp;</div>
              <div># 4. Exportar clave privada (GUARDAR FUERA DEL VPS)</div>
              <div>gpg --armor --export-secret-keys admin@consultorio.com &gt; ~/backup-gpg-private.key</div>
              <div># Copiar a gestor de contraseñas (Bitwarden/1Password)</div>
            </div>

            <p className="mt-3">Una vez generada la clave GPG, los backups se crean automáticamente vía:</p>

            <div className="space-y-2 mt-2">
              <div className="flex items-start gap-2">
                <span className="text-amber-500">1.</span>
                <div>
                  <strong>Backup de PostgreSQL (diario 3:00 AM)</strong>
                  <p>Ejecutado por n8n WF-07. Hace pg_dump, comprime, encripta con GPG y sincroniza a off-site (si configurado).</p>
                  <p className="font-mono mt-1">bash /opt/consultorio/scripts/backup-encriptado.sh</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-500">2.</span>
                <div>
                  <strong>Backup de volúmenes Docker (diario 3:15 AM)</strong>
                  <p>Ejecutado por backup-agent. Respaldan: n8n_data, metabase_data, recordings.</p>
                  <p className="font-mono mt-1">bash /opt/consultorio/scripts/backup-volumenes.sh</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-500">3.</span>
                <div>
                  <strong>Backup de infraestructura (manual recomendado: semanal)</strong>
                  <p>Respaldan config de Dokploy, Docker Compose, Traefik, env vars, reglas de firewall, SSH config.</p>
                  <p className="font-mono mt-1">bash /opt/consultorio/scripts/backup-infra.sh</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-500">4.</span>
                <div>
                  <strong>Backup de workflows n8n (manual recomendado: semanal)</strong>
                  <p>Exporta todos los workflows activos a archivos JSON individuales.</p>
                  <p className="font-mono mt-1">N8N_API_KEY=tu-api-key bash /opt/consultorio/scripts/backup-n8n-workflows.sh</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-2">
              <strong>💡 Pro Tip:</strong> Para verificar que los backups están funcionando:
              <div className="font-mono mt-1">bash /opt/consultorio/scripts/check-backups.sh</div>
              <div className="font-mono">ls -la /var/backups/consultorio/</div>
            </div>
          </div>
        )}
      </div>

      {/* 🛡️ Recuperación de infraestructura */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
        <button
          onClick={() => setShowInfra(!showInfra)}
          className="w-full flex items-center justify-between p-5 text-left"
        >
          <h2 className="text-sm font-semibold">🛡️ Recuperación de infraestructura (VPS + Dokploy + Traefik)</h2>
          <span className="text-xs text-[var(--text-muted)]">{showInfra ? '▲' : '▼'}</span>
        </button>
        {showInfra && (
          <div className="px-5 pb-5 space-y-3 text-xs text-[var(--text-secondary)]">
            <p>Si el VPS completo se pierde, además de restaurar los datos hay que reconstruir la infraestructura.
            El script <code className="text-green-400">backup-infra.sh</code> respalda todo lo necesario:</p>

            <div className="bg-black/80 rounded-lg p-3 font-mono text-xs text-green-400 space-y-1">
              <div># Backup completo de infraestructura</div>
              <div>bash /opt/consultorio/scripts/backup-infra.sh</div>
              <div>&nbsp;</div>
              <div># Genera: /var/backups/consultorio/infra_20260728_030000.tar.gz.gpg</div>
            </div>

            <p className="mt-2"><strong>¿Qué incluye?</strong></p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Docker Compose</strong> — docker-compose.yml y docker-compose.prod.yml</li>
              <li><strong>Docker secrets</strong> — lista de secrets en Swarm (hay que recrearlos manualmente)</li>
              <li><strong>Traefik</strong> — config dinámica, middleware, reglas de ruteo</li>
              <li><strong>UFW</strong> — reglas del firewall exportadas</li>
              <li><strong>n8n</strong> — exportación de workflows activos</li>
              <li><strong>Variables de entorno</strong> — .env files del dashboard y ops-console</li>
              <li><strong>Dokploy</strong> — lista de apps, compose IDs y configuración conocida</li>
            </ul>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-2">
              <strong>⚠️ Importante:</strong> Las Docker secrets (database_url, auth_secret, twilio_*)
              <strong>no se pueden exportar</strong> por seguridad. Deben ser recreadas manualmente
              en cada restauración de infraestructura. Guardá los valores originales en un
              gestor de contraseñas (Bitwarden/1Password).
            </div>

            <div className="mt-3">
              <strong>Procedimiento para reconstruir el VPS desde cero:</strong>
              <div className="bg-black/80 rounded-lg p-3 font-mono text-xs text-green-400 space-y-1 mt-1">
                <div># 1. Provisionar nuevo VPS (OVH o el que uses)</div>
                <div>ssh ubuntu@nueva-ip</div>
                <div>&nbsp;</div>
                <div># 2. Instalar Docker + Dokploy</div>
                <div>curl -fsSL https://get.docker.com | sh</div>
                <div># Seguir guía de instalación de Dokploy</div>
                <div>&nbsp;</div>
                <div># 3. Clonar el repositorio</div>
                <div>git clone https://github.com/LeonardoPS1/consultorio-medico.git /opt/consultorio</div>
                <div>&nbsp;</div>
                <div># 4. Configurar Traefik + dominios en Dokploy</div>
                <div># (med.aicorebots.com, n8n.aicorebots.com, ops.aicorebots.com, ...)</div>
                <div>&nbsp;</div>
                <div># 5. Inicializar Docker Swarm</div>
                <div>docker swarm init</div>
                <div>&nbsp;</div>
                <div># 6. Recrear Docker secrets (valores desde gestor de contraseñas)</div>
                <div>echo &quot;valor&quot; | docker secret create database_url -</div>
                <div>echo &quot;valor&quot; | docker secret create n8n_webhook_secret -</div>
                <div># ... repetir para todas las secrets</div>
                <div>&nbsp;</div>
                <div># 7. Desplegar stack</div>
                <div>cd /opt/consultorio</div>
                <div>docker stack deploy -c docker-compose.yml -c docker-compose.prod.yml consultorio</div>
                <div>&nbsp;</div>
                <div># 8. Importar clave GPG y restaurar datos</div>
                <div>gpg --import /opt/consultorio/scripts/gpg-key.asc  # (si existe)</div>
                <div># O desde backup manual de la clave privada</div>
                <div>make recover</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 📖 Procedimiento completo de recuperación */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
        <button
          onClick={() => setShowProcedure(!showProcedure)}
          className="w-full flex items-center justify-between p-5 text-left"
        >
          <h2 className="text-sm font-semibold">📖 Procedimiento completo de recuperación</h2>
          <span className="text-xs text-[var(--text-muted)]">{showProcedure ? '▲' : '▼'}</span>
        </button>
        {showProcedure && (
          <div className="px-5 pb-5 space-y-3 text-xs text-[var(--text-secondary)]">
            <p>Pasos para recuperar el sistema según el tipo de desastre:</p>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-[var(--text)] mt-3 mb-1">🔴 Escenario A: Solo falló la base de datos</h3>
                <div className="bg-black/80 rounded-lg p-3 font-mono text-xs text-green-400 space-y-1">
                  <div># Opción 1 — Desde Makefile (más fácil)</div>
                  <div>cd /opt/consultorio &amp;&amp; make recover-pg</div>
                  <div>&nbsp;</div>
                  <div># Opción 2 — Desde script directo</div>
                  <div>bash scripts/recover.sh --pg-only</div>
                  <div>&nbsp;</div>
                  <div># Opción 3 — Desde la web (no requiere n8n)</div>
                  <div># Ir a ops.aicorebots.com/dashboard/recuperacion</div>
                  <div># Click en &quot;Iniciar Recuperación&quot;</div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-[var(--text)] mt-3 mb-1">🟠 Escenario B: Fallaron volúmenes Docker (n8n, metabase)</h3>
                <div className="bg-black/80 rounded-lg p-3 font-mono text-xs text-green-400 space-y-1">
                  <div>cd /opt/consultorio &amp;&amp; make recover-vols</div>
                  <div># O desde la web: ops.aicorebots.com/dashboard/recuperacion</div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-[var(--text)] mt-3 mb-1">🔴 Escenario C: Desastre total (VPS completo perdido)</h3>
                <div className="bg-black/80 rounded-lg p-3 font-mono text-xs text-green-400 space-y-1">
                  <div># 1. Provisionar nuevo VPS</div>
                  <div>ssh ubuntu@nueva-ip</div>
                  <div>&nbsp;</div>
                  <div># 2. Instalar Docker</div>
                  <div>curl -fsSL https://get.docker.com | sh</div>
                  <div>&nbsp;</div>
                  <div># 3. Clonar repo + infra backup</div>
                  <div>git clone https://github.com/LeonardoPS1/consultorio-medico.git /opt/consultorio</div>
                  <div># Copiar backups desde off-site o backup local</div>
                  <div># (rclone copy, scp, etc.)</div>
                  <div>&nbsp;</div>
                  <div># 4. Recrear Docker secrets</div>
                  <div># (ver sección de infraestructura arriba)</div>
                  <div>&nbsp;</div>
                  <div># 5. Desplegar stack + restaurar datos</div>
                  <div>cd /opt/consultorio</div>
                  <div>docker swarm init</div>
                  <div>docker stack deploy -c docker-compose.yml -c docker-compose.prod.yml consultorio</div>
                  <div>make recover-force</div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-[var(--text)] mt-3 mb-1">🧪 Escenario D: Drill de prueba (no afecta producción)</h3>
                <div className="bg-black/80 rounded-lg p-3 font-mono text-xs text-green-400 space-y-1">
                  <div>cd /opt/consultorio &amp;&amp; make recover-drill</div>
                  <div># Restaura en containers aislados sin tocar prod</div>
                </div>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mt-2">
              <strong>📅 Recordatorio:</strong> El WF-13 ejecuta un drill de recuperación trimestral
              automáticamente. También se puede ejecutar manualmente desde n8n.
            </div>
          </div>
        )}
      </div>

      {/* 📖 Recuperación manual vía SSH */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-2">🔧 Recuperación manual vía SSH (sin acceso a la web)</h2>
        <p className="text-xs text-[var(--text-secondary)] mb-3">
          Si n8n o la web no están disponibles, conectate directamente al VPS por SSH:
        </p>
        <div className="bg-black/80 rounded-lg p-3 font-mono text-xs text-green-400 space-y-1">
          <div># Conectar al VPS</div>
          <div>ssh ubuntu@51.222.207.250</div>
          <div>sudo -i</div>
          <div>&nbsp;</div>
          <div># Ir al repositorio</div>
          <div>cd /opt/consultorio</div>
          <div>&nbsp;</div>
          <div># Ver estado de backups disponibles</div>
          <div>make recover-status</div>
          <div># También: bash scripts/check-backups.sh</div>
          <div>&nbsp;</div>
          <div># Recuperación completa (pide confirmación)</div>
          <div>make recover</div>
          <div>&nbsp;</div>
          <div># Recuperación forzada (sin confirmación)</div>
          <div>make recover-force</div>
          <div>&nbsp;</div>
          <div># Solo PostgreSQL</div>
          <div>make recover-pg</div>
          <div>&nbsp;</div>
          <div># Solo volúmenes Docker</div>
          <div>make recover-vols</div>
          <div>&nbsp;</div>
          <div># Drill de prueba (containers aislados)</div>
          <div>make recover-drill</div>
          <div>&nbsp;</div>
          <div># Si el repo no está clonado:</div>
          <div>git clone https://github.com/LeonardoPS1/consultorio-medico.git /opt/consultorio</div>
          <div>cd /opt/consultorio &amp;&amp; make recover-force</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-3 text-xs">
          <strong>⚠️ Requisito:</strong> La clave privada GPG debe estar importada en el VPS.
          Si no está, importala con:
          <div className="font-mono mt-1">gpg --import /ruta/a/backup-gpg-private.key</div>
          <div className="mt-1">Sin la clave privada GPG los backups encriptados <strong>no se pueden restaurar</strong>.</div>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-3">
          VPS IP: 51.222.207.250 · Usuario: ubuntu · Contraseña en gestor de contraseñas
        </p>
      </div>
    </div>
  )
}
