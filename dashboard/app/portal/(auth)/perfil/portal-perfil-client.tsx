/**
 * Portal Perfil Client
 */

'use client';

import { useState } from 'react';
import { User, Mail, Phone, Shield, Save } from 'lucide-react';

interface PacienteData {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  email?: string;
  obraSocial?: string;
  consentimientoWhatsapp?: boolean;
  consentimientoEmail?: boolean;
}

interface Props {
  paciente: PacienteData;
}

export default function PortalPerfilClient({ paciente }: Props) {
  const [email, setEmail] = useState(paciente.email || '');
  const [consentimientoWhatsapp, setConsentimientoWhatsapp] = useState(
    paciente.consentimientoWhatsapp || false,
  );
  const [consentimientoEmail, setConsentimientoEmail] = useState(
    paciente.consentimientoEmail || false,
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);

    try {
      const res = await fetch('/api/portal/perfil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          consentimientoWhatsapp,
          consentimientoEmail,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Error al guardar');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mi Perfil</h1>

      {/* Datos fijos (no editables) */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
          Datos personales
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-gray-400" />
            <div>
              <div className="font-medium text-gray-900">
                {paciente.nombre} {paciente.apellido}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-gray-400" />
            <div>
              <div className="text-gray-700">{paciente.telefono}</div>
            </div>
          </div>
          {paciente.obraSocial && (
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-gray-400" />
              <div>
                <div className="text-gray-700">{paciente.obraSocial}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Datos editables */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
          Configuración y contacto
        </h2>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">
            {error}
          </div>
        )}

        {saved && (
          <div className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg mb-3">
            Cambios guardados correctamente
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="tu@email.com"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">
                Notificaciones por WhatsApp
              </div>
              <div className="text-xs text-gray-400">
                Recordatorios y avisos de turnos
              </div>
            </div>
            <input
              type="checkbox"
              checked={consentimientoWhatsapp}
              onChange={(e) => setConsentimientoWhatsapp(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">
                Notificaciones por Email
              </div>
              <div className="text-xs text-gray-400">
                Resúmenes y novedades
              </div>
            </div>
            <input
              type="checkbox"
              checked={consentimientoEmail}
              onChange={(e) => setConsentimientoEmail(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4" /> Guardar cambios
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
