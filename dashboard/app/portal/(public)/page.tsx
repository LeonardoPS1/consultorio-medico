/**
 * Portal del Paciente — Login
 * El paciente ingresa su número de teléfono y recibe un magic link por WhatsApp.
 */

'use client';

import { useState } from 'react';
import { Phone, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';

export default function PortalLogin() {
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const cleanPhone = telefono.replace(/[\s\-()]/g, '');
    // Validar número chileno: +569XXXXXXX (12 dígitos) o 9XXXXXXX (8 dígitos)
    if (!/^(\+569?|569?|9)?\d{8,9}$/.test(cleanPhone)) {
      setError('Ingresá un número de teléfono chileno válido (ej: +56 9 1234 5678)');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/portal/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono: cleanPhone }),
      });

      const data = await res.json();

      if (res.ok) {
        setSent(true);
      } else {
        setError(data.error || 'Error al solicitar acceso');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Listo!</h1>
          <p className="text-gray-600 mb-6">
            Te enviamos un enlace de acceso por WhatsApp al número{' '}
            <strong>{telefono}</strong>.<br />
            Abrí el enlace para ingresar a tu portal.
          </p>
          <p className="text-sm text-gray-400">
            El enlace expira en 10 minutos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-blue-100 mb-4">
            <Phone className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Portal del Paciente</h1>
          <p className="text-gray-500 mt-2">
            Ingresá tu número de teléfono y recibí un enlace de acceso por WhatsApp.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de teléfono
            </label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+54 11 5555-0101"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              autoFocus
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || telefono.length < 10}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Enviar enlace <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Solo se muestran datos asociados a tu número. No compartas tu enlace de acceso.
        </p>
      </div>
    </div>
  );
}
