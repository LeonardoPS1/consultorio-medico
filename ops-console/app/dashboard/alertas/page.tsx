'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bell,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  History,
  ExternalLink,
  RefreshCw,
  Send,
  Zap,
} from 'lucide-react'

interface AlertConfig {
  id: string
  alert_name: string
  display_name: string
  description: string | null
  threshold_value: number
  threshold_window_minutes: number
  notification_channels: string[]
  channel_config: Record<string, unknown>
  is_active: boolean
  last_triggered_at: string | null
  created_at: string
  updated_at: string
}

interface AlertHistory {
  id: string
  alert_name: string
  display_name: string
  tenant_nombre: string | null
  trigger_value: number
  threshold_value: number
  message: string
  notifications_sent: { channel: string; success: boolean; response?: string }[]
  created_at: string
}

const CHANNEL_OPTIONS = [
  { value: 'telegram', label: 'Telegram', icon: Send },
  { value: 'email', label: 'Email', icon: Zap },
  { value: 'chatwoot', label: 'Chatwoot', icon: AlertTriangle },
  { value: 'webhook', label: 'Webhook personalizado', icon: ExternalLink },
] as const

const ALERT_TYPE_LABELS: Record<string, string> = {
  payment_failure: 'Pagos Fallidos',
  evolution_down: 'WhatsApp Desconectado',
  error_rate: 'Tasa de Errores Elevada',
  infra_down: 'Servicio Core Caído',
}

const ALERT_TYPE_DESCRIPTIONS: Record<string, string> = {
  payment_failure: 'Alerta cuando un tenant tiene más de N pagos fallidos en la ventana de tiempo configurada.',
  evolution_down: 'Alerta cuando la instancia de WhatsApp/Evolution de un tenant está caída (requiere EVOLUTION_API_KEY).',
  error_rate: 'Alerta cuando un tenant supera N errores registrados en la ventana de tiempo.',
  infra_down: 'Alerta cuando un servicio de infraestructura crítico (PostgreSQL, Redis, n8n) está caído.',
}

function formatTimeAgo(isoString: string | null): string {
  if (!isoString) return 'Nunca'
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffMin < 1) return 'hace instantes'
  if (diffMin < 60) return `hace ${diffMin}m`
  if (diffHour < 24) return `hace ${diffHour}h`
  return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function ChannelBadge({ channel }: { channel: string }) {
  const option = CHANNEL_OPTIONS.find(c => c.value === channel)
  const Icon = option?.icon || ExternalLink
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)] border border-[var(--border)]">
      <Icon className="w-3 h-3" />
      {option?.label || channel}
    </span>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      active
        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
        : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
    }`}>
      {active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {active ? 'Activa' : 'Inactiva'}
    </span>
  )
}

export default function AlertasPage() {
  const [configs, setConfigs] = useState<AlertConfig[]>([])
  const [history, setHistory] = useState<AlertHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'config' | 'history'>('config')

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    alert_name: '',
    display_name: '',
    description: '',
    threshold_value: 1,
    threshold_window_minutes: 60,
    notification_channels: [] as string[],
    channel_config: {} as Record<string, unknown>,
    is_active: true,
  })

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/alertas/config', { cache: 'no-store' })
      const json = await res.json()
      if (json?.success) setConfigs(Array.isArray(json.data) ? json.data : [])
      else setError(json?.error || 'Error al cargar configuraciones')
    } catch {
      setError('Error de conexión al cargar configuraciones')
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/alertas/history?limit=100', { cache: 'no-store' })
      const json = await res.json()
      if (json?.success) setHistory(Array.isArray(json.data) ? json.data : [])
    } catch {
      // History is optional
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchConfigs(), fetchHistory()])
      setLoading(false)
    }
    load()
  }, [fetchConfigs, fetchHistory])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingId ? `/api/alertas/config/${editingId}` : '/api/alertas/config'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (!json?.success) throw new Error(json?.error || 'Error al guardar')
      setShowForm(false)
      setEditingId(null)
      resetForm()
      await fetchConfigs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  const resetForm = () => {
    setFormData({
      alert_name: '',
      display_name: '',
      description: '',
      threshold_value: 1,
      threshold_window_minutes: 60,
      notification_channels: [],
      channel_config: {},
      is_active: true,
    })
  }

  const handleEdit = (config: AlertConfig) => {
    setEditingId(config.id)
    setFormData({
      alert_name: config.alert_name,
      display_name: config.display_name,
      description: config.description || '',
      threshold_value: config.threshold_value,
      threshold_window_minutes: config.threshold_window_minutes,
      notification_channels: config.notification_channels,
      channel_config: config.channel_config,
      is_active: config.is_active,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta configuración de alerta?')) return
    try {
      const res = await fetch(`/api/alertas/config/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json?.success) throw new Error(json?.error || 'Error al eliminar')
      await fetchConfigs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  const handleToggle = async (config: AlertConfig) => {
    try {
      const res = await fetch(`/api/alertas/config/${config.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !config.is_active }),
      })
      const json = await res.json()
      if (!json?.success) throw new Error(json?.error || 'Error al actualizar')
      await fetchConfigs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar')
    }
  }

  const handleTestCheck = async () => {
    setError(null)
    try {
      const res = await fetch('/api/alertas/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      if (!json?.success) throw new Error(json?.error || 'Error en verificación')
      alert(`Verificación completada: ${json.data.checked} chequeos, ${json.data.triggered} alertas disparadas`)
      await fetchHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en verificación')
    }
  }

  const toggleChannel = (channel: string) => {
    const channels = [...formData.notification_channels]
    const idx = channels.indexOf(channel)
    if (idx >= 0) channels.splice(idx, 1)
    else channels.push(channel)
    setFormData(prev => ({ ...prev, notification_channels: channels }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">Alertas</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Configuración y monitoreo de alertas del sistema</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] animate-pulse">
              <div className="h-5 w-3/4 bg-[var(--bg-secondary)] rounded mb-3" />
              <div className="h-4 w-1/2 bg-[var(--bg-secondary)] rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Alertas</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Configuración y monitoreo de alertas del sistema</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleTestCheck} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
            <RefreshCw className="w-4 h-4" /> Verificar ahora
          </button>
          <button onClick={() => { setEditingId(null); resetForm(); setShowForm(true); }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Nueva alerta
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
          </div>
        </div>
      )}

      <div className="flex gap-1 p-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'config'
              ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Configuración
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <History className="w-4 h-4 inline-block mr-1" /> Historial
        </button>
      </div>

      {activeTab === 'config' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
          {configs.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
              <h3 className="font-medium">Sin alertas configuradas</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">Crea tu primera alerta para recibir notificaciones</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {configs.map(config => (
                <div key={config.id} className="p-4 hover:bg-[var(--bg-hover)] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-[var(--text-primary)] truncate">{config.display_name}</h3>
                        <span className="text-xs text-[var(--text-muted)] font-mono">{config.alert_name}</span>
                        <StatusBadge active={config.is_active} />
                      </div>
                      {config.description && (
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">{config.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-[var(--text-muted)]">
                        <span>Umbral: <span className="font-mono text-[var(--text-secondary)]">{config.threshold_value}</span></span>
                        <span>Ventana: <span className="font-mono text-[var(--text-secondary)]">{config.threshold_window_minutes} min</span></span>
                        <span>Canales: </span>
                        <div className="flex items-center gap-1">
                          {(config.notification_channels ?? []).map(ch => (
                            <ChannelBadge key={ch} channel={ch} />
                          ))}
                          {(config.notification_channels ?? []).length === 0 && (
                            <span className="text-[var(--text-muted)] italic">Sin canales</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-[var(--text-muted)]">
                        <span>Última ejecución: <span className="font-mono">{formatTimeAgo(config.last_triggered_at)}</span></span>
                        <span>Creada: <span className="font-mono">{formatTimeAgo(config.created_at)}</span></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggle(config)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          config.is_active
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'
                            : 'bg-gray-500/10 text-gray-400 border border-gray-500/20 hover:bg-gray-500/20'
                        }`}
                      >
                        {config.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        {config.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                      <button onClick={() => handleEdit(config)} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors" title="Editar">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(config.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
          {history.length === 0 ? (
            <div className="p-12 text-center">
              <History className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
              <h3 className="font-medium">Sin historial de alertas</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">Las alertas disparadas aparecerán aquí</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {history.map(item => (
                <div key={item.id} className="p-4 hover:bg-[var(--bg-hover)] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-[var(--text-primary)] truncate">{item.display_name}</h3>
                        <span className="text-xs text-[var(--text-muted)] font-mono">{item.alert_name}</span>
                        {item.tenant_nombre && (
                          <span className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)] border border-[var(--border)]">
                            {item.tenant_nombre}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.message}</p>
                      <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-[var(--text-muted)]">
                        <span>Valor: <span className="font-mono text-[var(--text-secondary)]">{item.trigger_value}</span> / Umbral: <span className="font-mono text-[var(--text-secondary)]">{item.threshold_value}</span></span>
                        <span>Notificaciones: </span>
                        <div className="flex items-center gap-1">
                          {(item.notifications_sent ?? []).map((n, i) => (
                            <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                              n.success
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {n.channel} {n.success ? '✓' : '✗'}
                            </span>
                          ))}
                          {item.notifications_sent.length === 0 && (
                            <span className="text-[var(--text-muted)] italic">Sin notificaciones enviadas</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-[var(--text-muted)]">
                        {formatTimeAgo(item.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[var(--bg-card)] z-10">
              <h2 className="text-lg font-bold">{editingId ? 'Editar alerta' : 'Nueva alerta'}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre interno *</label>
                  <input
                    type="text"
                    value={formData.alert_name}
                    onChange={e => setFormData(prev => ({ ...prev, alert_name: e.target.value }))}
                    placeholder="payment_failure"
                    disabled={!!editingId}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
                    required
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1">Identificador único (no editable después de crear)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre visible *</label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={e => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="Pagos Fallidos"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Valor umbral *</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.threshold_value}
                    onChange={e => setFormData(prev => ({ ...prev, threshold_value: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ventana de tiempo (minutos) *</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.threshold_window_minutes}
                    onChange={e => setFormData(prev => ({ ...prev, threshold_window_minutes: parseInt(e.target.value) || 60 }))}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Canales de notificación</label>
                <div className="flex flex-wrap gap-2">
                  {CHANNEL_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => toggleChannel(value)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                        formData.notification_channels.includes(value)
                          ? 'bg-[var(--accent)] text-[var(--accent-foreground)] border-[var(--accent)]'
                          : 'bg-[var(--bg)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
                {formData.notification_channels.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">Selecciona al menos un canal para recibir notificaciones</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded border-[var(--border)] bg-[var(--bg)] text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  <span className="text-sm">Activa al crear</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }} className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 transition-opacity">
                  <Save className="w-4 h-4 inline-block mr-1" /> {editingId ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}