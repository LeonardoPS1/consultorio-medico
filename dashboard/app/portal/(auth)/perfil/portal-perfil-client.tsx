/**
 * Portal Perfil Client — Editar datos del perfil del paciente
 * Rediseñado con portal design system tokens.
 * Incluye campos chilenos: RUT, sistema salud, región, comuna
 */

'use client';

import { useState, useEffect } from 'react';
import { User, Phone, Shield, Save, MapPin, Heart } from 'lucide-react';
import { ISAPRES_CHILENAS } from '@/lib/isapres';
import { PushNotificationToggle } from '@/components/portal/PushNotificationToggle';
import { PortalCard } from '@/components/portal/portal-card';
import { PortalButton } from '@/components/portal/portal-button';

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

const inputStyle: React.CSSProperties = {
  border: '1px solid hsl(var(--portal-border-light))',
  background: 'hsl(var(--portal-muted) / 0.3)',
  color: 'hsl(var(--portal-foreground))',
  borderRadius: '0.75rem',
};

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
  const [comunas, setComunas] = useState<Comuna[]>([]);
  const [loadingComunas, setLoadingComunas] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/regiones')
      .then((r) => r.json())
      .then((data) => setRegiones(data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!regionId) {
      setComunas([]);
      return;
    }
    setLoadingComunas(true);
    fetch(`/api/comunas?region_id=${regionId}`)
      .then((r) => r.json())
      .then((data) => setComunas(data.data || []))
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
      <h1
        className="text-2xl font-bold mb-6"
        style={{ color: 'hsl(var(--portal-foreground))' }}
      >
        Mi Perfil
      </h1>

      {/* ── Datos fijos ── */}
      <PortalCard padding="md" className="mb-6">
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'hsl(var(--portal-muted-foreground))' }}
        >
          Datos personales
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <User
              className="h-5 w-5 shrink-0"
              style={{ color: 'hsl(var(--portal-muted-foreground) / 0.5)' }}
            />
            <div>
              <div
                className="font-medium"
                style={{ color: 'hsl(var(--portal-foreground))' }}
              >
                {paciente.nombre} {paciente.apellido}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone
              className="h-5 w-5 shrink-0"
              style={{ color: 'hsl(var(--portal-muted-foreground) / 0.5)' }}
            />
            <div>
              <div
                style={{ color: 'hsl(var(--portal-foreground) / 0.9)' }}
              >
                {paciente.telefono}
              </div>
            </div>
          </div>
          {paciente.rut && (
            <div className="flex items-center gap-3">
              <Shield
                className="h-5 w-5 shrink-0"
                style={{ color: 'hsl(var(--portal-muted-foreground) / 0.5)' }}
              />
              <div>
                <div
                  style={{ color: 'hsl(var(--portal-foreground) / 0.9)' }}
                >
                  RUT: {paciente.rut}
                </div>
              </div>
            </div>
          )}
          {paciente.region && paciente.comuna && (
            <div className="flex items-center gap-3">
              <MapPin
                className="h-5 w-5 shrink-0"
                style={{ color: 'hsl(var(--portal-muted-foreground) / 0.5)' }}
              />
              <div>
                <div
                  style={{ color: 'hsl(var(--portal-foreground) / 0.9)' }}
                >
                  {paciente.comuna}, {paciente.region}
                </div>
              </div>
            </div>
          )}
          {paciente.sistemaSalud && (
            <div className="flex items-center gap-3">
              <Heart
                className="h-5 w-5 shrink-0"
                style={{ color: 'hsl(var(--portal-muted-foreground) / 0.5)' }}
              />
              <div>
                <div
                  className="capitalize"
                  style={{ color: 'hsl(var(--portal-foreground) / 0.9)' }}
                >
                  {paciente.sistemaSalud}
                </div>
              </div>
            </div>
          )}
          {paciente.obraSocial && (
            <div className="flex items-center gap-3">
              <Shield
                className="h-5 w-5 shrink-0"
                style={{ color: 'hsl(var(--portal-muted-foreground) / 0.5)' }}
              />
              <div>
                <div
                  style={{ color: 'hsl(var(--portal-foreground) / 0.9)' }}
                >
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
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'hsl(var(--portal-muted-foreground))' }}
          >
            Configuración y contacto
          </h2>

          {error && (
            <div
              className="text-sm px-3 py-2 rounded-lg mb-3"
              style={{
                color: 'hsl(var(--portal-destructive))',
                background: 'hsl(var(--portal-destructive) / 0.1)',
              }}
            >
              {error}
            </div>
          )}

          {saved && (
            <div
              className="text-sm px-3 py-2 rounded-lg mb-3"
              style={{
                color: 'hsl(var(--portal-primary))',
                background: 'hsl(var(--portal-primary) / 0.1)',
              }}
            >
              Cambios guardados correctamente
            </div>
          )}

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'hsl(var(--portal-foreground) / 0.8)' }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm outline-none transition-all"
                style={inputStyle}
                placeholder="tu@email.com"
                onFocus={(e) => {
                  e.currentTarget.style.borderColor =
                    'hsl(var(--portal-primary) / 0.5)';
                  e.currentTarget.style.boxShadow =
                    '0 0 0 3px hsl(var(--portal-primary) / 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    'hsl(var(--portal-border-light))';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Sistema de salud */}
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'hsl(var(--portal-foreground) / 0.8)' }}
              >
                Sistema de Salud
              </label>
              <select
                value={sistemaSalud}
                onChange={(e) => {
                  setSistemaSalud(e.target.value);
                  setIsapreNombre('');
                }}
                className="w-full px-3 py-2 text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor =
                    'hsl(var(--portal-primary) / 0.5)';
                  e.currentTarget.style.boxShadow =
                    '0 0 0 3px hsl(var(--portal-primary) / 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    'hsl(var(--portal-border-light))';
                  e.currentTarget.style.boxShadow = 'none';
                }}
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
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'hsl(var(--portal-foreground) / 0.8)' }}
                >
                  Isapre
                </label>
                <select
                  value={isapreNombre}
                  onChange={(e) => setIsapreNombre(e.target.value)}
                  className="w-full px-3 py-2 text-sm outline-none transition-all"
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor =
                      'hsl(var(--portal-primary) / 0.5)';
                    e.currentTarget.style.boxShadow =
                      '0 0 0 3px hsl(var(--portal-primary) / 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      'hsl(var(--portal-border-light))';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
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
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'hsl(var(--portal-foreground) / 0.8)' }}
              >
                Región
              </label>
              <select
                value={regionId}
                onChange={(e) => {
                  setRegionId(e.target.value);
                  setComunaId('');
                }}
                className="w-full px-3 py-2 text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor =
                    'hsl(var(--portal-primary) / 0.5)';
                  e.currentTarget.style.boxShadow =
                    '0 0 0 3px hsl(var(--portal-primary) / 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    'hsl(var(--portal-border-light))';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="">Seleccionar región...</option>
                {regiones.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.numeroRomano
                      ? `${r.numeroRomano} - `
                      : ''}
                    {r.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Comuna */}
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'hsl(var(--portal-foreground) / 0.8)' }}
              >
                Comuna
              </label>
              <select
                value={comunaId}
                onChange={(e) => setComunaId(e.target.value)}
                disabled={!regionId || loadingComunas}
                className="w-full px-3 py-2 text-sm outline-none transition-all disabled:cursor-not-allowed"
                style={{
                  ...inputStyle,
                  opacity: !regionId || loadingComunas ? 0.6 : 1,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor =
                    'hsl(var(--portal-primary) / 0.5)';
                  e.currentTarget.style.boxShadow =
                    '0 0 0 3px hsl(var(--portal-primary) / 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    'hsl(var(--portal-border-light))';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="">
                  {loadingComunas
                    ? 'Cargando...'
                    : 'Seleccionar comuna...'}
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
                <div
                  className="text-sm font-medium"
                  style={{ color: 'hsl(var(--portal-foreground) / 0.8)' }}
                >
                  Notificaciones por WhatsApp
                </div>
                <div
                  className="text-xs"
                  style={{
                    color: 'hsl(var(--portal-muted-foreground) / 0.7)',
                  }}
                >
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
                <div
                  className="text-sm font-medium"
                  style={{ color: 'hsl(var(--portal-foreground) / 0.8)' }}
                >
                  Notificaciones por Email
                </div>
                <div
                  className="text-xs"
                  style={{
                    color: 'hsl(var(--portal-muted-foreground) / 0.7)',
                  }}
                >
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
            <div
              className="pt-2"
              style={{
                borderTop: '1px solid hsl(var(--portal-border-light))',
              }}
            >
              <PushNotificationToggle />
            </div>

            <PortalButton type="submit" disabled={saving} fullWidth loading={saving}>
              <Save className="h-4 w-4" /> Guardar cambios
            </PortalButton>
          </div>
        </form>
      </PortalCard>
    </div>
  );
}
