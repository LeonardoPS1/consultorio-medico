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

import { useState, useEffect } from 'react';
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
import { Save, Loader2, Settings, Brain, Link, Key, Shield } from 'lucide-react';
import IntegracionesDashboard from '@/components/configuracion/integraciones-dashboard';
import CredencialesTab from '@/components/configuracion/credenciales-tab';
import ApiKeysTab from '@/components/configuracion/api-keys-tab';
import type { FeatureId } from '@/lib/features';
import { FEATURE_PLAN, getFeatureRequiredPlan } from '@/lib/features';

// ─── Features toggleables ────────────────────────────────────

interface ToggleFeature {
  id: FeatureId;
  label: string;
  description: string;
  category: 'core' | 'avanzado' | 'sistema';
}

const TOGGLEABLE_FEATURES: ToggleFeature[] = [
  { id: 'horarios', label: 'Horarios configurables', description: 'Médicos pueden configurar sus horarios de atención', category: 'core' },
  { id: 'notificaciones', label: 'Notificaciones', description: 'Alertas por WhatsApp y email', category: 'core' },
  { id: 'portal-paciente', label: 'Portal del Paciente', description: 'Acceso web para que pacientes vean turnos y recetas', category: 'core' },
  { id: 'reportes-avanzados', label: 'Reportes Avanzados', description: 'Gráficos, exportación Excel y PDF', category: 'avanzado' },
  { id: 'ia-assistant', label: 'Asistente IA', description: 'Respuestas automáticas y triaje con IA', category: 'avanzado' },
  { id: 'plantillas', label: 'Plantillas WhatsApp', description: 'Mensajes predefinidos para recordatorios', category: 'avanzado' },
  { id: '2fa', label: 'Autenticación 2FA', description: 'Segundo factor de autenticación para médicos', category: 'avanzado' },
  { id: 'equipo', label: 'Gestión de Equipo', description: 'Múltiples médicos y profesionales', category: 'avanzado' },
  { id: 'integraciones', label: 'Integraciones n8n', description: 'Workflows de automatización avanzados', category: 'sistema' },
  { id: 'api-publica', label: 'API Pública', description: 'Endpoints para integraciones externas', category: 'sistema' },
  { id: 'auditoria', label: 'Auditoría', description: 'Registro de accesos y acciones', category: 'sistema' },
  { id: 'backup-encriptado', label: 'Backup Encriptado', description: 'Respaldo automático encriptado de la BD', category: 'sistema' },
  { id: 'webhooks-log', label: 'Log de Webhooks', description: 'Registro de llamadas webhook entrantes', category: 'sistema' },
];

// ─── Props ───────────────────────────────────────────────────

interface SistemaTabProps {
  isAdmin: boolean;
}

export default function SistemaTab({ isAdmin }: SistemaTabProps) {
  const { toast } = useToast();
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cargar toggles actuales
  useEffect(() => {
    fetch('/api/admin/features')
      .then(r => r.json())
      .then(data => {
        if (data.features) {
          // Inicializar: features no listados = true (habilitado por defecto)
          const initial: Record<string, boolean> = {};
          TOGGLEABLE_FEATURES.forEach(f => {
            initial[f.id] = data.features[f.id] !== false;
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
        toast({ title: 'Toggles actualizados', description: 'Los cambios se aplicarán en la próxima recarga.' });
      } else {
        toast({ title: 'Error al guardar', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error de conexión', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const coreFeatures = TOGGLEABLE_FEATURES.filter(f => f.category === 'core');
  const advancedFeatures = TOGGLEABLE_FEATURES.filter(f => f.category === 'avanzado');
  const systemFeatures = TOGGLEABLE_FEATURES.filter(f => f.category === 'sistema');

  return (
    <div className="space-y-6">
      {/* ─── Feature Toggles ───────────────────────────────── */}
      <Card>
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
              {/* Funcionalidades principales */}
              <SectionLabel label="Principales" />
              <div className="space-y-2">
                {coreFeatures.map(f => (
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

      {/* ─── IA ────────────────────────────────────────────── */}
      <Card>
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
            plan=""
            checked
            onCheckedChange={() => {}}
            compact
          />
          <ToggleRow
            label="Triaje de urgencias"
            description="Detectar y notificar mensajes urgentes automáticamente"
            plan=""
            checked
            onCheckedChange={() => {}}
            compact
          />
          <ToggleRow
            label="Renovación de recetas automática"
            description="Permitir renovar recetas sin intervención del médico"
            plan=""
            checked={false}
            onCheckedChange={() => {}}
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
      </Card>

      {/* ─── Integraciones ─────────────────────────────────── */}
      <Card>
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
      </Card>

      {/* ─── Credenciales ──────────────────────────────────── */}
      <Card>
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
      </Card>

      {/* ─── API Keys ──────────────────────────────────────── */}
      <Card>
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
      </Card>
    </div>
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
