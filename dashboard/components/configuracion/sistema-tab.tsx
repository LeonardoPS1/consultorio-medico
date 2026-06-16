'use client';

/**
 * Sistema Tab — Panel de administración del sistema
 *
 * Solo visible para admins. Contiene:
 * 1. Feature Toggles — Activar/desactivar funcionalidades
 * 2. IA — Configuración del asistente
 * 3. Integraciones — Conexiones n8n
 * 4. Credenciales — Gestión centralizada
 * 5. API Keys — Keys para API pública
 */

import { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Save, Loader2, Settings, Brain, Link, Key, Shield, Lock, Users, Search, ChevronDown } from 'lucide-react';
import IntegracionesDashboard from '@/components/configuracion/integraciones-dashboard';
import CredencialesTab from '@/components/configuracion/credenciales-tab';
import ApiKeysTab from '@/components/configuracion/api-keys-tab';
import { useFeatureFlags } from '@/lib/feature-flags-context';
import type { FeatureId } from '@/lib/features';
import { FEATURE_PLAN, getFeatureRequiredPlan } from '@/lib/features';

// ─── Features toggleables ────────────────────────────────────

interface ToggleFeature {
  id: FeatureId;
  label: string;
  description: string;
  category: 'modulos' | 'avanzado' | 'sistema';
}

const TOGGLEABLE_FEATURES: ToggleFeature[] = [
  // ─── Módulos principales (sidebar) ───────────────────────
  { id: 'panel-principal', label: 'Panel Principal', description: 'Dashboard principal con KPIs y actividad reciente', category: 'modulos' },
  { id: 'atencion', label: 'Atención', description: 'Kanban de atención diaria', category: 'modulos' },
  { id: 'turnos', label: 'Turnos', description: 'Gestión de turnos y agenda', category: 'modulos' },
  { id: 'pacientes', label: 'Pacientes', description: 'Ficha de pacientes y datos de contacto', category: 'modulos' },
  { id: 'conversaciones', label: 'Conversaciones', description: 'Bandeja de mensajes de WhatsApp', category: 'modulos' },
  { id: 'recetas', label: 'Recetas', description: 'Prescripciones y recetas digitales', category: 'modulos' },
  { id: 'reportes', label: 'Reportes', description: 'Estadísticas y reportes del consultorio', category: 'modulos' },
  { id: 'horarios', label: 'Horarios', description: 'Configuración de horarios de atención', category: 'modulos' },
  { id: 'notificaciones', label: 'Notificaciones', description: 'Alertas por WhatsApp y email', category: 'modulos' },
  { id: 'portal-paciente', label: 'Portal del Paciente', description: 'Acceso web para que pacientes vean turnos y recetas', category: 'modulos' },
  { id: 'encuestas', label: 'Encuestas Post-Consulta', description: 'Encuestas de satisfacción automáticas por WhatsApp', category: 'modulos' },
  { id: 'pwa', label: 'PWA (App Instalable)', description: 'Progressive Web App con modo offline y actualizaciones automáticas', category: 'modulos' },
  { id: 'notas-soap', label: 'Notas SOAP', description: 'Evolución clínica estructurada con CIE-10 en la ficha del paciente', category: 'modulos' },
  { id: 'telemedicina', label: 'Telemedicina', description: 'Videoconsultas en vivo con LiveKit y envío automático del link por WhatsApp', category: 'modulos' },

  // ─── Funcionalidades avanzadas ──────────────────────────
  { id: 'reportes-avanzados', label: 'Reportes Avanzados', description: 'Gráficos, exportación Excel y PDF', category: 'avanzado' },
  { id: 'ia-assistant', label: 'Asistente IA', description: 'Respuestas automáticas y triaje con IA', category: 'avanzado' },
  { id: 'plantillas', label: 'Plantillas WhatsApp', description: 'Mensajes predefinidos para recordatorios', category: 'avanzado' },
  { id: '2fa', label: 'Autenticación 2FA', description: 'Segundo factor de autenticación para médicos', category: 'avanzado' },
  { id: 'equipo', label: 'Gestión de Equipo', description: 'Múltiples médicos y profesionales', category: 'avanzado' },
  { id: 'credenciales', label: 'Credenciales', description: 'Gestión de credenciales de servicios externos', category: 'avanzado' },
  { id: 'firma-digital', label: 'Firma Digital QR', description: 'Hash de verificación SHA-256 en recetas con QR público', category: 'avanzado' },
  { id: 'exportacion', label: 'Exportación Excel/PDF', description: 'Exportar pacientes y recetas a Excel y PDF', category: 'avanzado' },
  { id: 'certificados-qr', label: 'Certificados Médicos QR', description: 'Certificados médicos con hash SHA-256 y verificación pública', category: 'avanzado' },
  { id: 'lista-espera', label: 'Lista de Espera', description: 'Lista de espera inteligente con ofertas automáticas al cancelar turnos', category: 'avanzado' },
  { id: 'multi-sucursal', label: 'Multi-sucursal', description: 'Múltiples sucursales o consultorios', category: 'avanzado' },
  { id: 'derivaciones', label: 'Derivaciones', description: 'Derivación de pacientes entre especialistas del equipo', category: 'avanzado' },
  { id: 'blacklist', label: 'Lista Negra', description: 'Gestión de pacientes bloqueados con motivo y control de acceso', category: 'avanzado' },
  { id: 'alertas-inteligentes', label: 'Alertas Inteligentes', description: 'Notificaciones proactivas por stock bajo, pacientes críticos y cumpleaños', category: 'avanzado' },
  { id: 'consentimiento-informado', label: 'Consentimiento Informado', description: 'Registro y gestión de consentimientos informados de pacientes', category: 'avanzado' },

  // ─── Sistema ────────────────────────────────────────────
  { id: 'integraciones', label: 'Integraciones n8n', description: 'Workflows de automatización avanzados', category: 'sistema' },
  { id: 'api-publica', label: 'API Pública', description: 'Endpoints para integraciones externas', category: 'sistema' },
  { id: 'auditoria', label: 'Auditoría', description: 'Registro de accesos y acciones del sistema', category: 'sistema' },
  { id: 'backup-encriptado', label: 'Backup Encriptado', description: 'Respaldo automático encriptado de la BD', category: 'sistema' },
  { id: 'webhooks-log', label: 'Log de Webhooks', description: 'Registro de llamadas webhook entrantes', category: 'sistema' },
  { id: 'gcal-sync', label: 'Google Calendar Sync', description: 'Sincronización bidireccional de turnos con Google Calendar', category: 'sistema' },
  { id: 'n8n-monitor', label: 'n8n Monitor', description: 'Dashboard de monitoreo de workflows n8n en vivo', category: 'sistema' },
];

// ─── Props ───────────────────────────────────────────────────

interface SistemaTabProps {
  isAdmin: boolean;
  section?: 'toggles' | 'ia' | 'integraciones' | 'credenciales' | 'apikeys' | 'privacidad';
}

export default function SistemaTab({ isAdmin, section }: SistemaTabProps) {
  const { toast } = useToast();
  const { refresh: refreshFeatureFlags } = useFeatureFlags();
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cargar toggles actuales
  useEffect(() => {
    fetch('/api/admin/features')
      .then(r => r.json())
      .then(data => {
        const features = data.data?.features ?? data.features;
        if (features) {
          // Inicializar: features no listados = true (habilitado por defecto)
          const initial: Record<string, boolean> = {};
          TOGGLEABLE_FEATURES.forEach(f => {
            initial[f.id] = features[f.id] !== false;
          });
          setToggles(initial);
        } else {
          // Todo habilitado por defecto
          const initial: Record<string, boolean> = {};
          TOGGLEABLE_FEATURES.forEach(f => { initial[f.id] = true; });
          setToggles(initial);
        }
        setLoading(false);
      })
      .catch(() => {
        const initial: Record<string, boolean> = {};
        TOGGLEABLE_FEATURES.forEach(f => { initial[f.id] = true; });
        setToggles(initial);
        setLoading(false);
      });
  }, []);

  const handleToggle = (featureId: string, checked: boolean) => {
    setToggles(prev => ({ ...prev, [featureId]: checked }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toggles),
      });
      if (res.ok) {
        toast({ title: 'Toggles actualizados', description: 'Los cambios ya están activos.' });
        await refreshFeatureFlags();
      } else {
        toast({ title: 'Error al guardar', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error de conexión', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const modulosFeatures = TOGGLEABLE_FEATURES.filter(f => f.category === 'modulos');
  const advancedFeatures = TOGGLEABLE_FEATURES.filter(f => f.category === 'avanzado');
  const systemFeatures = TOGGLEABLE_FEATURES.filter(f => f.category === 'sistema');

  const showAll = !section;

  // ─── User list ──────────────────────────────────────────────────
  interface UserOption {
    id: string;
    email: string;
    nombre: string;
    plan: string;
  }
  const [users, setUsers] = useState<UserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // ─── User-specific feature overrides ────────────────────────────
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userOverrides, setUserOverrides] = useState<Record<string, boolean>>({});
  const [loadingUserOverrides, setLoadingUserOverrides] = useState(false);

  // Fetch users on mount
  useEffect(() => {
    setUsersLoading(true);
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(data => {
        const list = data.data?.users ?? data.users ?? [];
        setUsers(list.map((u: any) => ({ id: u.id, email: u.email, nombre: u.nombre, plan: u.plan })));
      })
      .catch(() => {})
      .finally(() => setUsersLoading(false));
  }, []);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredUsers = users.filter(u =>
    u.nombre.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const selectedUser = users.find(u => u.id === selectedUserId);

  // Cargar overrides de usuario cuando se selecciona un usuario
  useEffect(() => {
    if (!selectedUserId) {
      setUserOverrides({});
      return;
    }

    setLoadingUserOverrides(true);
    fetch(`/api/admin/users/${selectedUserId}/feature-overrides`)
      .then(r => r.json())
      .then(data => {
        const overridesList = data.data?.overrides ?? data.overrides;
        if (overridesList) {
          const overridesMap: Record<string, boolean> = {};
          overridesList.forEach((override: { featureId: string; enabled: boolean }) => {
            overridesMap[override.featureId] = override.enabled;
          });
          setUserOverrides(overridesMap);
        } else {
          setUserOverrides({});
        }
      })
      .catch(() => {
        setUserOverrides({});
      })
      .finally(() => {
        setLoadingUserOverrides(false);
      });
  }, [selectedUserId]);

  const handleUserOverrideToggle = (featureId: string, checked: boolean) => {
    setUserOverrides(prev => ({ ...prev, [featureId]: checked }));
  };

  const handleSaveUserOverrides = async () => {
    if (!selectedUserId) return;

    setSaving(true);
    try {
      const overrides = Object.entries(userOverrides)
        .filter(([_, enabled]) => enabled)
        .map(([featureId]) => ({ featureId }));

      const res = await fetch(`/api/admin/users/${selectedUserId}/feature-overrides`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides }),
      });

      if (res.ok) {
        toast({ title: 'Overrides de usuario actualizados', description: 'Los cambios ya están activos para este usuario.' });
        await refreshFeatureFlags();
      } else {
        toast({ title: 'Error al guardar overrides de usuario', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error de conexión', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Feature Toggles ───────────────────────────────── */}
      {(showAll || section === 'toggles') && <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Feature Toggles
          </CardTitle>
          <CardDescription>
            Activá o desactivá funcionalidades del sistema. Los cambios se aplican a todo el consultorio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex items-center gap-2 py-8 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-muted-foreground">Cargando configuración...</span>
            </div>
          ) : (
            <>
              {/* Módulos principales (sidebar) */}
              <SectionLabel label="Módulos" />
              <div className="space-y-2">
                {modulosFeatures.map(f => (
                  <ToggleRow
                    key={f.id}
                    label={f.label}
                    description={f.description}
                    plan={getFeatureRequiredPlan(f.id)}
                    checked={toggles[f.id] ?? true}
                    onCheckedChange={(c) => handleToggle(f.id, c)}
                  />
                ))}
              </div>

              <hr className="my-2 border-border" />

              {/* Funcionalidades avanzadas */}
              <SectionLabel label="Avanzadas" />
              <div className="space-y-2">
                {advancedFeatures.map(f => (
                  <ToggleRow
                    key={f.id}
                    label={f.label}
                    description={f.description}
                    plan={getFeatureRequiredPlan(f.id)}
                    checked={toggles[f.id] ?? true}
                    onCheckedChange={(c) => handleToggle(f.id, c)}
                  />
                ))}
              </div>

              <hr className="my-2 border-border" />

              {/* Funcionalidades de sistema */}
              <SectionLabel label="Sistema" />
              <div className="space-y-2">
                {systemFeatures.map(f => (
                  <ToggleRow
                    key={f.id}
                    label={f.label}
                    description={f.description}
                    plan={getFeatureRequiredPlan(f.id)}
                    checked={toggles[f.id] ?? true}
                    onCheckedChange={(c) => handleToggle(f.id, c)}
                  />
                ))}
              </div>

              <div className="pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Guardar Toggles
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      }

      {/* ─── User-specific Feature Overrides ───────────────────────────────── */}
      {(showAll || section === 'toggles') && <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Overrides de Usuario
          </CardTitle>
          <CardDescription>
            Asignar features específicos a usuarios individuales (sobrescribe el plan del usuario)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1 relative" ref={userDropdownRef}>
              <Label htmlFor="user-select">Seleccionar Usuario</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="user-select"
                  placeholder="Buscar por nombre o email..."
                  value={selectedUser ? `${selectedUser.nombre} (${selectedUser.email})` : userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setSelectedUserId('');
                    setUserDropdownOpen(true);
                  }}
                  onFocus={() => setUserDropdownOpen(true)}
                  className="pl-8"
                />
                {selectedUser && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    onClick={() => {
                      setSelectedUserId('');
                      setUserSearch('');
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              {userDropdownOpen && !selectedUserId && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-y-auto">
                  {usersLoading ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                      Cargando usuarios...
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      {userSearch ? 'Sin resultados' : 'No hay usuarios cargados'}
                    </div>
                  ) : (
                    filteredUsers.map(u => (
                      <button
                        key={u.id}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-accent flex items-center justify-between"
                        onClick={() => {
                          setSelectedUserId(u.id);
                          setUserSearch('');
                          setUserDropdownOpen(false);
                        }}
                      >
                        <div>
                          <span className="font-medium">{u.nombre}</span>
                          <span className="text-muted-foreground ml-2">{u.email}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize">{u.plan}</Badge>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <Button 
              onClick={handleSaveUserOverrides} 
              disabled={saving || !selectedUserId || loadingUserOverrides}
              className="mb-0.5"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Guardar Overrides
            </Button>
          </div>

          {loadingUserOverrides ? (
            <div className="flex items-center gap-2 py-8 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-muted-foreground">Cargando overrides del usuario...</span>
            </div>
          ) : selectedUserId ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Editando overrides para usuario: <Badge variant="secondary">{selectedUserId}</Badge>
              </div>
              <div className="grid gap-2 max-h-96 overflow-y-auto">
                {TOGGLEABLE_FEATURES.map(f => (
                  <ToggleRow
                    key={f.id}
                    label={f.label}
                    description={f.description}
                    plan={getFeatureRequiredPlan(f.id)}
                    checked={userOverrides[f.id] ?? false}
                    onCheckedChange={(c) => handleUserOverrideToggle(f.id, c)}
                    compact
                  />
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                Nota: Los overrides de usuario tienen máxima prioridad. Si una feature está habilitada aquí, el usuario puede usarla aunque su plan no la incluya.
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Selecciona un usuario para editar sus overrides de features</p>
            </div>
          )}
        </CardContent>
      </Card>}

      {/* ─── IA ────────────────────────────────────────────── */}
      {(showAll || section === 'ia') && <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Asistente IA
          </CardTitle>
          <CardDescription>Configuración del comportamiento del asistente virtual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Respuestas automáticas"
            description="La IA responde automáticamente mensajes de WhatsApp"
            plan={getFeatureRequiredPlan('ia-autorespuestas')}
            checked={toggles['ia-autorespuestas'] ?? true}
            onCheckedChange={(c) => handleToggle('ia-autorespuestas', c)}
            compact
          />
          <ToggleRow
            label="Triaje de urgencias"
            description="Detectar y notificar mensajes urgentes automáticamente"
            plan={getFeatureRequiredPlan('ia-triaje')}
            checked={toggles['ia-triaje'] ?? true}
            onCheckedChange={(c) => handleToggle('ia-triaje', c)}
            compact
          />
          <ToggleRow
            label="Renovación de recetas automática"
            description="Permitir renovar recetas sin intervención del médico"
            plan={getFeatureRequiredPlan('ia-renovacion')}
            checked={toggles['ia-renovacion'] ?? true}
            onCheckedChange={(c) => handleToggle('ia-renovacion', c)}
            compact
          />
          <div className="space-y-2">
            <Label>Prompt del sistema</Label>
            <Textarea
              defaultValue="Sos el asistente virtual del consultorio médico. Respondés mensajes de WhatsApp de forma amable y profesional en español argentino. Si detectás una urgencia, priorizala y notificá al médico."
              rows={4}
              className="font-mono text-sm"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Máx. tokens por respuesta</Label>
              <Input type="number" defaultValue={300} />
            </div>
            <div className="space-y-1">
              <Label>Temperatura (0-1)</Label>
              <Input type="number" defaultValue={0.3} step={0.1} min={0} max={1} />
            </div>
          </div>
          <Button>
            <Save className="h-4 w-4 mr-1" />
            Guardar configuración de IA
          </Button>
        </CardContent>
      </Card>}

      {/* ─── Integraciones ─────────────────────────────────── */}
      {(showAll || section === 'integraciones') && <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Integraciones
          </CardTitle>
          <CardDescription>Conexión con n8n y servicios externos</CardDescription>
        </CardHeader>
        <CardContent>
          <IntegracionesDashboard isAdmin={isAdmin} />
        </CardContent>
      </Card>}

      {/* ─── Credenciales ──────────────────────────────────── */}
      {(showAll || section === 'credenciales') && <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Credenciales
          </CardTitle>
          <CardDescription>Gestión centralizada de credenciales para servicios externos</CardDescription>
        </CardHeader>
        <CardContent>
          <CredencialesTab />
        </CardContent>
      </Card>}

      {/* ─── API Keys ──────────────────────────────────────── */}
      {(showAll || section === 'apikeys') && <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>Keys para integraciones externas vía API pública</CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeysTab />
        </CardContent>
      </Card>}

      {/* ─── Privacidad ─────────────────────────────────────── */}
      {(showAll || section === 'privacidad') && <PrivacidadConfigSection />}
    </div>
  );
}

// ─── Privacidad Config Section ─────────────────────────────────

function PrivacidadConfigSection() {
  const { toast } = useToast();
  const [config, setConfig] = useState<{ periodoRetencionBajaDias: number }>({
    periodoRetencionBajaDias: 90,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/privacidad-config')
      .then(r => r.json())
      .then(data => {
        const configData = data.data?.config ?? data.config;
        if (configData) {
          setConfig(configData);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/privacidad-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        toast({ title: 'Configuración guardada', description: 'El período de retención fue actualizado.' });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Error al guardar', description: err.error || 'Error desconocido', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error de conexión', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Privacidad y Protección de Datos
        </CardTitle>
        <CardDescription>
          Configuración de retención de datos y privacidad según normativa ARCO
          (Ley 19.628 Chile / Ley 25.326 Argentina / RGPD).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center gap-2 py-4 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-muted-foreground">Cargando configuración...</span>
          </div>
        ) : (
          <>
            <div className="max-w-sm space-y-2">
              <Label htmlFor="retencion-dias">
                Período de retención post-baja (días)
              </Label>
              <p className="text-xs text-muted-foreground">
                Tiempo que los datos del paciente se conservan después de
                confirmar la baja, antes de ser anonimizados permanentemente.
              </p>
              <div className="flex items-center gap-3">
                <Input
                  id="retencion-dias"
                  type="number"
                  min={1}
                  max={365}
                  value={config.periodoRetencionBajaDias}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      periodoRetencionBajaDias: parseInt(e.target.value) || 90,
                    }))
                  }
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">días</span>
              </div>
            </div>

            <div className="rounded-lg border border-primary/10 bg-primary/5 p-4 space-y-2">
              <h4 className="text-sm font-semibold">¿Cómo funciona?</h4>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Cuando un paciente solicita la baja, se registra la solicitud y se le notifica</li>
                <li>Al confirmar la baja, sus datos personales se anonimizan inmediatamente (nombre, email, teléfono, RUT)</li>
                <li>Los datos clínicos se conservan de forma anonimizada durante el período configurado</li>
                <li>Pasado ese período, un job automático (n8n WF-09) elimina definitivamente los datos residuales</li>
                <li>El paciente puede solicitar la portabilidad de sus datos antes de la baja</li>
              </ul>
            </div>

            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Guardar configuración
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Sub-componentes ─────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
      {label}
    </h4>
  );
}

function ToggleRow({
  label,
  description,
  plan,
  checked,
  onCheckedChange,
  compact = false,
}: {
  label: string;
  description: string;
  plan: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex items-center justify-between py-1.5">
        <div>
          <Label className="text-sm">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-1.5 px-3 rounded-md hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm cursor-pointer" onClick={() => onCheckedChange(!checked)}>
            {label}
          </Label>
          {plan && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
              {plan}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
