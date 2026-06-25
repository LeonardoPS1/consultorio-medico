/**
 * Portal Perfil Client — Editar datos del perfil del paciente
 * Incluye campos chilenos: RUT, sistema salud, región, comuna
 *
 * "regionalización chilena completa"
 */

'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Phone, Shield, Save, MapPin, Heart } from 'lucide-react';
import { ISAPRES_CHILENAS } from '@/lib/isapres';
import { PushNotificationToggle } from '@/components/portal/PushNotificationToggle';

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

export default function PortalPerfilClient({ paciente }: Props) {
  const [email, setEmail] = useState(paciente.email || '');
  const [sistemaSalud, setSistemaSalud] = useState(paciente.sistemaSalud || '');
  const [isapreNombre, setIsapreNombre] = useState(paciente.isapreNombre || '');
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

  // Cargar regiones al montar
  useEffect(() => {
    fetch('/api/regiones')
      .then((r) => r.json())
      .then((data) => setRegiones(data.data || []))
      .catch(() => {});
  }, []);

  // Cargar comunas al cambiar región
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
          isapreNombre: sistemaSalud === 'isapre' ? isapreNombre || undefined : undefined,
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
      <h1 className="text-2xl font-bold text-foreground mb-6">Mi Perfil</h1>

      {/* Datos fijos (no editables) */}
      <div className="bg-card rounded-xl border border-border/50 p-4 mb-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Datos personales</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground/50" />
            <div>
              <div className="font-medium text-foreground">
                {paciente.nombre} {paciente.apellido}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-muted-foreground/50" />
            <div>
              <div className="text-foreground/90">{paciente.telefono}</div>
            </div>
          </div>
          {paciente.rut && (
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground/50" />
              <div>
                <div className="text-foreground/90">RUT: {paciente.rut}</div>
              </div>
            </div>
          )}
          {paciente.region && paciente.comuna && (
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground/50" />
              <div>
                <div className="text-foreground/90">
                  {paciente.comuna}, {paciente.region}
                </div>
              </div>
            </div>
          )}
          {paciente.sistemaSalud && (
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-muted-foreground/50" />
              <div>
                <div className="text-foreground/90 capitalize">{paciente.sistemaSalud}</div>
              </div>
            </div>
          )}
          {paciente.obraSocial && (
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground/50" />
              <div>
                <div className="text-foreground/90">{paciente.obraSocial}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Datos editables */}
      <form onSubmit={handleSave} className="bg-card rounded-xl border border-border/50 p-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Configuración y contacto
        </h2>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg mb-3">{error}</div>
        )}

        {saved && (
          <div className="text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg mb-3">
            Cambios guardados correctamente
          </div>
        )}

        <div className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-border/50 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
              placeholder="tu@email.com"
            />
          </div>

          {/* Sistema de salud */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Sistema de Salud</label>
            <select
              value={sistemaSalud}
              onChange={(e) => {
                setSistemaSalud(e.target.value);
                setIsapreNombre('');
              }}
              className="w-full px-3 py-2 border border-border/50 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm bg-white"
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
              <label className="block text-sm font-medium text-foreground/80 mb-1">Isapre</label>
              <select
                value={isapreNombre}
                onChange={(e) => setIsapreNombre(e.target.value)}
                className="w-full px-3 py-2 border border-border/50 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm bg-white"
              >
                <option value="">Selecciona una Isapre...</option>
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
            <label className="block text-sm font-medium text-foreground/80 mb-1">Región</label>
            <select
              value={regionId}
              onChange={(e) => {
                setRegionId(e.target.value);
                setComunaId('');
              }}
              className="w-full px-3 py-2 border border-border/50 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm bg-white"
            >
              <option value="">Seleccionar región...</option>
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
            <label className="block text-sm font-medium text-foreground/80 mb-1">Comuna</label>
            <select
              value={comunaId}
              onChange={(e) => setComunaId(e.target.value)}
              disabled={!regionId || loadingComunas}
              className="w-full px-3 py-2 border border-border/50 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm bg-white disabled:bg-muted disabled:cursor-not-allowed"
            >
              <option value="">{loadingComunas ? 'Cargando...' : 'Seleccionar comuna...'}</option>
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
              <div className="text-sm font-medium text-foreground/80">Notificaciones por WhatsApp</div>
              <div className="text-xs text-muted-foreground/70">Recordatorios y avisos de turnos</div>
            </div>
            <input
              type="checkbox"
              checked={consentimientoWhatsapp}
              onChange={(e) => setConsentimientoWhatsapp(e.target.checked)}
              className="h-5 w-5 rounded border-border/50 text-primary focus:ring-primary/30"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-foreground/80">Notificaciones por Email</div>
              <div className="text-xs text-muted-foreground/70">Resúmenes y novedades</div>
            </div>
            <input
              type="checkbox"
              checked={consentimientoEmail}
              onChange={(e) => setConsentimientoEmail(e.target.checked)}
              className="h-5 w-5 rounded border-border/50 text-primary focus:ring-primary/30"
            />
          </div>

          {/* Push Notifications */}
          <div className="pt-2 border-t border-border/30">
            <PushNotificationToggle />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-2.5 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all duration-200 active:scale-[0.98]"
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
