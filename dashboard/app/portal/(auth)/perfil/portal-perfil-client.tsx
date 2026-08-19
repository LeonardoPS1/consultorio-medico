/**
 * Portal Perfil Client — Editar datos del perfil del paciente
 * Rediseñado con portal design system tokens.
 * Incluye campos chilenos: RUT, sistema salud, región, comuna
 */

'use client';

import {
  User,
  Phone,
  Shield,
  Save,
  MapPin,
  Heart,
  Download,
  Trash2,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { PortalButton } from '@/components/portal/portal-button';
import { PortalCard } from '@/components/portal/portal-card';
import { PortalBadge } from '@/components/portal/portal-badge';
import { PushNotificationToggle } from '@/components/portal/PushNotificationToggle';
import { AvatarInitials } from '@/components/portal/avatar-initials';
import { ISAPRES_CHILENAS } from '@/lib/isapres';

interface Region {
  id: string;
  nombre: string;
  numeroRomano: string | null;
}

interface Comuna {
  id: string;
  nombre: string;
}

interface PacienteData {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  email?: string;
  rut?: string;
  obraSocial?: string;
  sistemaSalud?: string;
  isapreNombre?: string;
  regionId?: string;
  comunaId?: string;
  region?: string;
  comuna?: string;
  consentimientoWhatsapp?: boolean;
  consentimientoEmail?: boolean;
}

interface Props {
  paciente: PacienteData;
}

const SISTEMAS_SALUD = [
  { value: '', label: 'Seleccionar...' },
  { value: 'fonasa', label: 'FONASA' },
  { value: 'isapre', label: 'ISAPRE' },
  { value: 'particular', label: 'Particular' },
  { value: 'otro', label: 'Otro' },
];

const inputClass = 'w-full px-3 py-2 text-sm outline-none transition-all border border-portal-border bg-white dark:bg-[#1C1C22] rounded-xl focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/20';

/**
 *
 * @param root0
 * @param root0.paciente
 */
export default function PortalPerfilClient({
  paciente,
}: Props) {
  const [email, setEmail] = useState(paciente.email || '');
  const [sistemaSalud, setSistemaSalud] = useState(
    paciente.sistemaSalud || '',
  );
  const [isapreNombre, setIsapreNombre] = useState(
    paciente.isapreNombre || '',
  );
  const [regionId, setRegionId] = useState(paciente.regionId || '');
  const [comunaId, setComunaId] = useState(paciente.comunaId || '');
  const [consentimientoWhatsapp, setConsentimientoWhatsapp] = useState(
    paciente.consentimientoWhatsapp || false,
  );
  const [consentimientoEmail, setConsentimientoEmail] = useState(
    paciente.consentimientoEmail || false,
  );

  const [regiones, setRegiones] = useState<Region[]>([]);
  const [loadingRegiones, setLoadingRegiones] = useState(true);
  const [comunas, setComunas] = useState<Comuna[]>([]);
  const [loadingComunas, setLoadingComunas] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showEliminarModal, setShowEliminarModal] = useState(false);
  const [solicitarLoading, setSolicitarLoading] = useState(false);
  const [solicitarResult, setSolicitarResult] = useState<
    { ok: boolean; message: string } | null
  >(null);

  const handleDescargarDatos = () => {
    window.location.href = '/api/portal/mis-datos/exportar';
  };

  const handleSolicitarEliminacion = async () => {
    setSolicitarLoading(true);
    setSolicitarResult(null);
    try {
      const res = await fetch('/api/portal/mis-datos/solicitar-eliminacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (res.ok && data?.ok) {
        setSolicitarResult({
          ok: true,
          message:
            'Tu solicitud fue registrada. La revisará el equipo de la clínica — no se eliminan datos automáticamente.',
        });
        setShowEliminarModal(false);
      } else {
        setSolicitarResult({
          ok: false,
          message: data?.error || 'No se pudo registrar la solicitud.',
        });
      }
    } catch {
      setSolicitarResult({
        ok: false,
        message: 'Error de conexión. Intentá de nuevo.',
      });
    } finally {
      setSolicitarLoading(false);
    }
  };

  useEffect(() => {
// eslint-disable-next-line react-hooks/set-state-in-effect -- setState tras fetch asincrono en mount
    setLoadingRegiones(true);
    fetch('/api/regiones')
      .then((r) => r.json())
      .then((data: { data: Region[] }) => setRegiones(data.data || []))
      .catch(() => {})
      .finally(() => setLoadingRegiones(false));
  }, []);

  useEffect(() => {
    if (!regionId) {
// eslint-disable-next-line react-hooks/set-state-in-effect -- setState tras fetch asincrono en mount
      setComunas([]);
      return;
    }
    setLoadingComunas(true);
    fetch(`/api/comunas?region_id=${regionId}`)
      .then((r) => r.json())
      .then((data: { data: Comuna[] }) => setComunas(data.data || []))
      .catch(() => {})
      .finally(() => setLoadingComunas(false));
  }, [regionId]);

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
          sistemaSalud: sistemaSalud || undefined,
          isapreNombre:
            sistemaSalud === 'isapre'
              ? isapreNombre || undefined
              : undefined,
          regionId: regionId || undefined,
          comunaId: comunaId || undefined,
          consentimientoWhatsapp,
          consentimientoEmail,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json() as { error?: string };
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
      <h1 className="text-[20px] font-semibold tracking-[0.01em] mb-6 text-portal-fg">
        Mi Perfil
      </h1>

      {/* ── Datos fijos ── */}
      <PortalCard padding="md" className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 text-portal-muted-fg">
          Datos personales
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <AvatarInitials
              nombre={paciente.nombre || ''}
              apellido={paciente.apellido || ''}
              className="h-12 w-12 text-base"
            />
            <div>
              <div className="font-medium text-portal-fg">
                {paciente.nombre} {paciente.apellido}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 shrink-0 text-portal-muted-fg/50" />
            <div>
              <div className="text-portal-fg/90">
                {paciente.telefono}
              </div>
            </div>
          </div>
          {paciente.rut && (
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 shrink-0 text-portal-muted-fg/50" />
              <div>
                <div className="text-portal-fg/90">
                  RUT: {paciente.rut}
                </div>
              </div>
            </div>
          )}
          {paciente.region && paciente.comuna && (
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 shrink-0 text-portal-muted-fg/50" />
              <div>
                <div className="text-portal-fg/90">
                  {paciente.comuna}, {paciente.region}
                </div>
              </div>
            </div>
          )}
          {paciente.sistemaSalud && (
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 shrink-0 text-portal-muted-fg/50" />
              <div>
                <div className="capitalize text-portal-fg/90">
                  {paciente.sistemaSalud}
                  {paciente.isapreNombre && (
                    <PortalBadge variant="primary" className="ml-2 text-[10px]">
                      {paciente.isapreNombre}
                    </PortalBadge>
                  )}
                </div>
              </div>
            </div>
          )}
          {paciente.obraSocial && (
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 shrink-0 text-portal-muted-fg/50" />
              <div>
                <div className="text-portal-fg/90">
                  {paciente.obraSocial}
                </div>
              </div>
            </div>
          )}
        </div>
      </PortalCard>

      {/* ── Datos editables ── */}
      <PortalCard padding="md">
        <form onSubmit={handleSave}>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 text-portal-muted-fg">
            Configuración y contacto
          </h2>

          {error && (
            <div className="text-sm px-3 py-2 rounded-lg mb-3 text-portal-destructive bg-portal-destructive/10">
              {error}
            </div>
          )}

          {saved && (
            <div className="text-sm px-3 py-2 rounded-lg mb-3 text-portal-primary bg-portal-primary/10">
              Cambios guardados correctamente
            </div>
          )}

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1 text-portal-fg/80">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="tu@email.com"
              />
            </div>

            {/* Sistema de salud */}
            <div>
              <label className="block text-sm font-medium mb-1 text-portal-fg/80">
                Sistema de Salud
              </label>
              <select
                value={sistemaSalud}
                onChange={(e) => {
                  setSistemaSalud(e.target.value);
                  setIsapreNombre('');
                }}
                className={inputClass}
              >
                {SISTEMAS_SALUD.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {sistemaSalud === 'isapre' && (
              <div>
                <label className="block text-sm font-medium mb-1 text-portal-fg/80">
                  Isapre
                </label>
                <select
                  value={isapreNombre}
                  onChange={(e) => setIsapreNombre(e.target.value)}
                  className={inputClass}
                >
                  <option value="">
                    Selecciona una Isapre...
                  </option>
                  {ISAPRES_CHILENAS.map((i) => (
                    <option key={i.value} value={i.value}>
                      {i.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Región */}
            <div>
              <label className="block text-sm font-medium mb-1 text-portal-fg/80">
                Región
              </label>
              <select
                value={regionId}
                onChange={(e) => {
                  setRegionId(e.target.value);
                  setComunaId('');
                }}
                className={inputClass}
              >
                <option value="">
                  {loadingRegiones ? 'Cargando...' : 'Seleccionar región...'}
                </option>
                {regiones.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.numeroRomano ? `${r.numeroRomano} - ` : ''}
                    {r.nombre}
                  </option>
                ))}
              </select>
            </div>

{/* Comuna */}
            <div>
              <label className="block text-sm font-medium mb-1 text-portal-fg/80">
                Comuna
              </label>
              <select
                value={comunaId}
                onChange={(e) => setComunaId(e.target.value)}
                disabled={!regionId || loadingComunas}
                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <option value="">
                  {loadingComunas ? 'Cargando...' : 'Seleccionar comuna...'}
                </option>
                {comunas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Consentimientos */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-portal-fg/80">
                  Notificaciones por WhatsApp
                </div>
                <div className="text-xs text-portal-muted-fg/70">
                  Recordatorios y avisos de turnos
                </div>
              </div>
              <input
                type="checkbox"
                checked={consentimientoWhatsapp}
                onChange={(e) =>
                  setConsentimientoWhatsapp(e.target.checked)
                }
                className="h-5 w-5 rounded"
                style={{
                  accentColor: 'hsl(var(--portal-primary))',
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-portal-fg/80">
                  Notificaciones por Email
                </div>
                <div className="text-xs text-portal-muted-fg/70">
                  Resúmenes y novedades
                </div>
              </div>
              <input
                type="checkbox"
                checked={consentimientoEmail}
                onChange={(e) =>
                  setConsentimientoEmail(e.target.checked)
                }
                className="h-5 w-5 rounded"
                style={{
                  accentColor: 'hsl(var(--portal-primary))',
                }}
              />
            </div>

            {/* Push Notifications */}
            <div className="pt-2 border-t border-portal-border-light">
              <PushNotificationToggle />
            </div>

            <PortalButton type="submit" disabled={saving} fullWidth loading={saving}>
              <Save className="h-4 w-4" /> Guardar cambios
            </PortalButton>
          </div>
        </form>
      </PortalCard>

      {/* Tus datos — exportación y solicitud de eliminación */}
      <PortalCard padding="md" className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-portal-muted-fg/60" />
          <h2 className="text-lg font-semibold text-portal-fg">
            Tus datos
          </h2>
        </div>
        <p className="text-sm text-portal-muted-fg/80 mb-5">
          Tenés derecho a solicitar una copia de tus datos personales o su
          eliminación, según la Ley 19.628 (protección de datos personales).
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <PortalButton variant="secondary" onClick={handleDescargarDatos}>
            <Download className="h-4 w-4" /> Descargar mis datos
          </PortalButton>
          <PortalButton
            variant="ghost"
            onClick={() => {
              setSolicitarResult(null);
              setShowEliminarModal(true);
            }}
            className="text-portal-destructive"
          >
            <Trash2 className="h-4 w-4" /> Solicitar eliminación de mis datos
          </PortalButton>
        </div>
      </PortalCard>

      {/* Modal de confirmación — solicitud de eliminación */}
      {showEliminarModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setShowEliminarModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{
              background: 'var(--portal-bg-alt)',
              border: '1px solid hsl(var(--portal-border-light))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-portal-destructive" />
                <h3 className="text-lg font-semibold text-portal-fg">
                  Solicitar eliminación de datos
                </h3>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setShowEliminarModal(false)}
                className="rounded-full p-1 text-portal-muted-fg/60 hover:bg-portal-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-portal-fg/80 mb-2">
              Al solicitar la eliminación, el equipo de la clínica revisará
              tu solicitud de forma manual. La eliminación no es automática
              ni inmediata.
            </p>
            <p className="text-sm text-portal-fg/80 mb-5">
              La solicitud quedará registrada y recibirás una respuesta por
              el canal de contacto que tengas activo.
            </p>
            {solicitarResult && (
              <div
                className={`mb-4 rounded-xl px-4 py-3 text-sm ${
                  solicitarResult.ok
                    ? 'text-portal-primary bg-portal-primary/10'
                    : 'text-portal-destructive bg-portal-destructive/10'
                }`}
              >
                {solicitarResult.message}
              </div>
            )}
            <div className="flex flex-wrap gap-3 justify-end">
              <PortalButton
                variant="ghost"
                onClick={() => setShowEliminarModal(false)}
              >
                Cancelar
              </PortalButton>
              <PortalButton
                onClick={handleSolicitarEliminacion}
                loading={solicitarLoading}
                className="bg-portal-destructive hover:bg-portal-destructive/90 shadow-none"
              >
                <Trash2 className="h-4 w-4" /> Confirmar solicitud
              </PortalButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
