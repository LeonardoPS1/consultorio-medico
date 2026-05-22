'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface MensajeLog {
  id: string;
  conversacionId: string;
  rol: string;
  contenido: string;
  tipo: string;
  twilioSid?: string;
  twilioStatus?: string;
  n8nExecutionId?: string;
  createdAt: string;
  pacienteNombre: string;
  pacienteApellido: string;
  pacienteTelefono: string;
  conversacionEstado: string;
  conversacionCanal: string;
}

interface PorEstado {
  [key: string]: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  received:    { label: 'Recibido',    color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  queued:      { label: 'En cola',     color: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  sent:        { label: 'Enviado',     color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  delivered:   { label: 'Entregado',   color: 'text-cyan-700 dark:text-cyan-300', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
  read:        { label: 'Leido',       color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  failed:      { label: 'Fallido',     color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/30' },
  undelivered: { label: 'No entregado', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/30' },
};

function StatusBadge({ status }: { status?: string }) {
  const config = STATUS_CONFIG[status || ''];
  if (!config) {
    return <span className="text-xs text-gray-500">-</span>;
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bg}`}>
      {config.label}
    </span>
  );
}

export default function WebhooksLogsPage() {
  const [mensajes, setMensajes] = useState<MensajeLog[]>([]);
  const [total, setTotal] = useState(0);
  const [porEstado, setPorEstado] = useState<PorEstado>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [estadoFilter, setEstadoFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const pageSize = 50;
  const router = useRouter();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(pageSize));
      params.set('offset', String((page - 1) * pageSize));
      if (estadoFilter) params.set('estado', estadoFilter);
      if (searchFilter) params.set('search', searchFilter);

      const res = await fetch(`/api/webhooks/logs?${params.toString()}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al cargar logs');
      }

      setMensajes(data.data || []);
      setTotal(data.total || 0);
      setPorEstado(data.porEstado || {});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, estadoFilter, searchFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh cada 15 segundos
  useEffect(() => {
    const interval = setInterval(fetchLogs, 15000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  const kpis = [
    { label: 'Total mensajes', value: total, color: 'text-gray-900 dark:text-gray-100' },
    { label: 'Recibidos', value: porEstado.received || 0, color: 'text-blue-600' },
    { label: 'Entregados', value: (porEstado.delivered || 0) + (porEstado.read || 0), color: 'text-emerald-600' },
    { label: 'Fallidos', value: (porEstado.failed || 0) + (porEstado.undelivered || 0), color: 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Registro de Webhooks</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Monitoreo de mensajes entrantes y salientes con estado de entrega Twilio
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
          >
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={estadoFilter}
          onChange={(e) => { setEstadoFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Buscar por mensaje o paciente..."
          value={searchFilter}
          onChange={(e) => { setSearchFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300 flex-1 min-w-[200px]"
        />

        <button
          onClick={fetchLogs}
          className="h-9 px-4 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Actualizar
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Paciente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Mensaje</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Rol</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Canal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Twilio SID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading && mensajes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mx-auto" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mx-auto" />
                    </div>
                  </td>
                </tr>
              ) : mensajes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                    {estadoFilter || searchFilter
                      ? 'No se encontraron mensajes con los filtros aplicados'
                      : 'No hay mensajes registrados. Los mensajes apareceran cuando lleguen a traves del webhook de Twilio.'}
                  </td>
                </tr>
              ) : (
                mensajes.map((msg) => (
                  <tr
                    key={msg.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/conversaciones?id=${msg.conversacionId}`)}
                  >
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(msg.createdAt).toLocaleString('es-CL', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {msg.pacienteNombre} {msg.pacienteApellido}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap font-mono">
                      {msg.pacienteTelefono}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[250px] truncate">
                      {msg.contenido}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`capitalize ${
                        msg.rol === 'paciente' ? 'text-blue-600' : msg.rol === 'asistente_ia' ? 'text-purple-600' : 'text-gray-600'
                      }`}>
                        {msg.rol === 'asistente_ia' ? 'IA' : msg.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={msg.twilioStatus} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {msg.conversacionCanal || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-400 max-w-[120px] truncate" title={msg.twilioSid}>
                      {msg.twilioSid || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginacion */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {total} mensajes en total
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Anterior
              </button>
              <span className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
