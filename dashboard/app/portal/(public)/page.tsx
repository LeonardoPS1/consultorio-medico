/**
 * Portal del Paciente — Login / Landing público
 *
 * Muestra una pantalla de bienvenida con información del consultorio
 * y opción de ingresar vía magic link por WhatsApp.
 * Si PORTAL_BYPASS=true, muestra botón de acceso directo de prueba.
 */

'use client';

import { useState, useEffect } from 'react';
import { Phone, ArrowRight, CheckCircle, AlertCircle, Bug, Activity, Calendar, Shield } from 'lucide-react';
import { isValidPhone } from '@/lib/utils';

export default function PortalLogin() {
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [bypassActivo, setBypassActivo] = useState(false);
  const [statusChecked, setStatusChecked] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

  useEffect(() => {
    fetch('/api/portal/auth/status')
      .then((r) => r.json())
      .then((data) => {
        setBypassActivo(data.bypass === true);
      })
      .catch(() => {
        // si falla, no mostrar bypass
      })
      .finally(() => setStatusChecked(true));
  }, []);

  async function handleTestAccess() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/portal/auth/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.redirect) {
        window.location.href = data.redirect;
      } else {
        setError(data.error || 'Error al acceder en modo prueba');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const cleanPhone = telefono.replace(/[\s\-()]/g, '');
    if (!isValidPhone(cleanPhone)) {
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
        <div className="max-w-sm w-full text-center animate-fade-in-up">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Enlace enviado!</h1>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Te enviamos un enlace de acceso por WhatsApp al número{' '}
            <strong className="text-gray-900">{telefono}</strong>.
          </p>
          <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-blue-800 font-medium mb-1">📱 No te llega el mensaje?</p>
            <p className="text-xs text-blue-600">
              Verificá que el número ingresado sea el mismo que registraste en el consultorio.
              Si el problema persiste, contactanos por WhatsApp.
            </p>
          </div>
          <p className="text-sm text-gray-400">
            El enlace expira en <strong>10 minutos</strong> y solo funciona una vez.
          </p>
          <button
            onClick={() => { setSent(false); setTelefono(''); }}
            className="mt-6 text-sm text-blue-600 hover:text-blue-700 underline transition-colors"
          >
            Ingresar otro número
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 via-blue-500 to-blue-400 flex flex-col">
      {/* Hero section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-8 text-center">
        <div className="max-w-sm w-full">
          {/* Logo / Brand */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4 shadow-lg">
              <Activity className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">AicoreMed</h1>
            <p className="text-blue-100 text-sm">Portal del Paciente</p>
          </div>

          {!mostrarForm ? (
            <>
              {/* Landing cards */}
              <div className="space-y-3 mb-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-left flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-blue-200 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-white font-medium text-sm">Agendá tus horas</p>
                    <p className="text-blue-200 text-xs">Sin llamar, desde tu celular</p>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-left flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-200 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-white font-medium text-sm">Tus documentos siempre disponibles</p>
                    <p className="text-blue-200 text-xs">Recetas, certificados y más</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setMostrarForm(true)}
                className="w-full bg-white text-blue-700 font-semibold py-3.5 rounded-xl hover:bg-blue-50 transition-all shadow-lg shadow-blue-700/20 active:scale-[0.98]"
              >
                Ingresar al Portal
              </button>
            </>
          ) : (
            <>
              {/* Login form */}
              <div className="bg-white rounded-2xl shadow-xl p-6 text-left">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Ingresá al Portal</h2>
                <p className="text-sm text-gray-500 mb-5">
                  Recibí un enlace mágico por WhatsApp
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg text-sm">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Número de teléfono
                    </label>
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="+56 9 1234 5678"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg outline-none transition-shadow"
                      autoFocus
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !isValidPhone(telefono.replace(/[\s\-()]/g, ''))}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
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

                <button
                  onClick={() => setMostrarForm(false)}
                  className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors text-center w-full"
                >
                  ← Volver
                </button>
              </div>
            </>
          )}

          {/* Bypass button */}
          {bypassActivo && statusChecked && (
            <div className="mt-6">
              <div className="border-t border-white/20 pt-6">
                <p className="text-xs text-blue-200 text-center mb-3">
                  🛠️ Modo desarrollo — acceso directo sin autenticación
                </p>
                <button
                  onClick={handleTestAccess}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white font-medium py-3 rounded-xl hover:bg-white/20 disabled:opacity-50 transition-all border border-white/20"
                >
                  <Bug className="h-5 w-5" />
                  {loading ? 'Ingresando...' : 'Acceder sin autenticación (prueba)'}
                </button>
              </div>
            </div>
          )}

          {!statusChecked && (
            <div className="mt-8">
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 text-center">
        <p className="text-xs text-blue-200">
          Solo se muestran datos asociados a tu número registrado.
        </p>
      </div>
    </div>
  );
}
