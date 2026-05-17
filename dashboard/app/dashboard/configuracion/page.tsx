'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Bot, Globe, Shield,
  Edit3, Save, Plus, Trash2, Key,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ImageUpload } from '@/components/ui/image-upload';
import CredencialesTab from '@/components/configuracion/credenciales-tab';
import IntegracionesDashboard from '@/components/configuracion/integraciones-dashboard';

// ============================================================
// Tipos
// ============================================================

interface PlantillaWhatsApp {
  id: string;
  nombre: string;
  contenido: string;
  categoria: string;
  variables: string[];
}

interface MiembroEquipo {
  nombre: string;
  email: string;
  rol: string;
  ultimo: string;
}

// ============================================================
// Mock Data
// ============================================================

const plantillasIniciales: PlantillaWhatsApp[] = [
  {
    id: '1',
    nombre: 'Recordatorio 24hs',
    contenido: 'Hola {{paciente}}, te recordamos que tenés un turno con el Dr. {{medico}} mañana a las {{hora}}. Respondé "CONFIRMAR" para confirmar asistencia o "CANCELAR" si necesitás reprogramar.',
    categoria: 'recordatorios',
    variables: ['paciente', 'medico', 'hora'],
  },
  {
    id: '2',
    nombre: 'Recordatorio 1h',
    contenido: 'Recordatorio: {{paciente}}, tu turno con el Dr. {{medico}} es en 1 hora ({{hora}}). Te esperamos!',
    categoria: 'recordatorios',
    variables: ['paciente', 'medico', 'hora'],
  },
  {
    id: '3',
    nombre: 'Confirmación turno',
    contenido: '¡Gracias {{paciente}}! Tu turno con el Dr. {{medico}} el día {{fecha}} a las {{hora}} fue confirmado. Cualquier cambio nos avisás.',
    categoria: 'turnos',
    variables: ['paciente', 'medico', 'fecha', 'hora'],
  },
  {
    id: '4',
    nombre: 'Cancelación turno',
    contenido: 'Hola {{paciente}}, te confirmamos que tu turno del {{fecha}} a las {{hora}} fue cancelado. Si querés agendar un nuevo turno, escribinos.',
    categoria: 'turnos',
    variables: ['paciente', 'fecha', 'hora'],
  },
  {
    id: '5',
    nombre: 'Receta lista',
    contenido: '{{paciente}}, tu receta de {{medicamento}} ya está lista. Pasá a retirarla por el consultorio o decinos si querés que te la enviemos por WhatsApp.',
    categoria: 'recetas',
    variables: ['paciente', 'medicamento'],
  },
  {
    id: '6',
    nombre: 'Urgencia detectada',
    contenido: '⚠️ Alerta de urgencia: {{paciente}} reportó: "{{mensaje}}". Comunicarse a la brevedad.',
    categoria: 'alertas',
    variables: ['paciente', 'mensaje'],
  },
];

const miembrosEquipo: MiembroEquipo[] = [
  { nombre: 'Dr. García', email: 'dr.garcia@consultorio.com', rol: 'Médico', ultimo: 'Hace 5 min' },
  { nombre: 'Dra. López', email: 'dra.lopez@consultorio.com', rol: 'Médico', ultimo: 'Hace 2 hs' },
  { nombre: 'Marcela Ruiz', email: 'marcela@consultorio.com', rol: 'Secretaria', ultimo: 'Hace 15 min' },
];

// ============================================================
// Componente principal
// ============================================================

export default function ConfiguracionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96"><div className="skeleton h-8 w-48" /></div>}>
      <ConfigContent />
    </Suspense>
  );
}

function ConfigContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === 'admin';
  const tabFromUrl = searchParams.get('tab') || 'perfil';
  const [plantillas, setPlantillas] = useState(plantillasIniciales);
  const [showPlantillaModal, setShowPlantillaModal] = useState(false);
  const [editingPlantilla, setEditingPlantilla] = useState<PlantillaWhatsApp | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Sincronizar tabs con la URL
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams, activeTab]);

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configuración</h2>
        <p className="text-muted-foreground">
          Gestioná las integraciones y preferencias del sistema
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="perfil">
            <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Perfil
          </TabsTrigger>
          <TabsTrigger value="integraciones">Integraciones</TabsTrigger>
          <TabsTrigger value="horarios">Horarios</TabsTrigger>
          <TabsTrigger value="ia">IA & Automatización</TabsTrigger>
          <TabsTrigger value="plantillas">Plantillas WhatsApp</TabsTrigger>
          <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
          <TabsTrigger value="equipo">Equipo</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="credenciales" className="text-amber-600 dark:text-amber-400">
              <Key className="h-4 w-4 mr-1" />
              Credenciales
            </TabsTrigger>
          )}
        </TabsList>

        {/* ======== PERFIL / ORGANIZACIÓN ======== */}
        <TabsContent value="perfil" className="mt-4">
          <PerfilOrganizacion />
        </TabsContent>

        {/* ======== INTEGRACIONES ======== */}
        <TabsContent value="integraciones" className="mt-4 space-y-4">
          <IntegracionesDashboard isAdmin={isAdmin} />
        </TabsContent>

        {/* ======== HORARIOS ======== */}
        <TabsContent value="horarios" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Horarios de Atención</CardTitle>
              <CardDescription>Configurá la disponibilidad del consultorio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { dia: 'Lunes', activo: true, inicio: '09:00', fin: '18:00' },
                  { dia: 'Martes', activo: true, inicio: '09:00', fin: '18:00' },
                  { dia: 'Miércoles', activo: true, inicio: '09:00', fin: '18:00' },
                  { dia: 'Jueves', activo: true, inicio: '09:00', fin: '18:00' },
                  { dia: 'Viernes', activo: true, inicio: '09:00', fin: '18:00' },
                  { dia: 'Sábado', activo: false, inicio: '09:00', fin: '13:00' },
                ].map((dia) => (
                  <div key={dia.dia} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                    <div className="w-24 font-medium text-sm">{dia.dia}</div>
                    <Switch defaultChecked={dia.activo} />
                    {dia.activo ? (
                      <div className="flex items-center gap-2">
                        <Input type="time" defaultValue={dia.inicio} className="w-24 h-8 text-sm" />
                        <span className="text-muted-foreground">a</span>
                        <Input type="time" defaultValue={dia.fin} className="w-24 h-8 text-sm" />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Cerrado</span>
                    )}
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button>Guardar Horarios</Button>
                  <Button variant="outline">Restablecer</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======== IA & AUTOMATIZACIÓN ======== */}
        <TabsContent value="ia" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asistente IA</CardTitle>
              <CardDescription>Configuración del comportamiento del asistente virtual</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SwitchRow
                label="Respuestas automáticas"
                description="La IA responde automáticamente mensajes de WhatsApp"
                defaultChecked
              />
              <SwitchRow
                label="Triaje de urgencias"
                description="Detectar y notificar mensajes urgentes automáticamente"
                defaultChecked
              />
              <SwitchRow
                label="Renovación de recetas automática"
                description="Permitir renovar recetas sin intervención del médico"
              />
              <div className="space-y-2">
                <Label>Prompt del sistema</Label>
                <Textarea
                  defaultValue={`Sos el asistente virtual del Dr. García, un médico clínico. Respondés mensajes de WhatsApp de forma amable y profesional en español argentino. Si detectás una urgencia, priorizala y notificá al médico.`}
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

          {/* n8n Webhook URLs */}
          <Card>
            <CardHeader>
              <CardTitle>URLs de Webhook (n8n)</CardTitle>
              <CardDescription>Endpoints para conectar los workflows de automatización</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>WhatsApp Inbound</Label>
                <Input value="https://n8n.tudominio.com/webhook/whatsapp-inbound" readOnly />
              </div>
              <div className="space-y-1">
                <Label>Gestión de Turnos</Label>
                <Input value="https://n8n.tudominio.com/webhook/gestion-turnos" readOnly />
              </div>
              <div className="space-y-1">
                <Label>Recetas</Label>
                <Input value="https://n8n.tudominio.com/webhook/recetas" readOnly />
              </div>
              <div className="space-y-1">
                <Label>Status Callback (Twilio)</Label>
                <Input value="https://n8n.tudominio.com/webhook/twilio-status" readOnly />
              </div>
              <p className="text-xs text-muted-foreground">
                Reemplazá &quot;n8n.tudominio.com&quot; por la URL real de tu VPS cuando configures el dominio.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======== PLANTILLAS WHATSAPP ======== */}
        <TabsContent value="plantillas" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {plantillas.length} plantillas configuradas
              </p>
            </div>
            <Button onClick={() => { setEditingPlantilla(null); setShowPlantillaModal(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              Nueva Plantilla
            </Button>
          </div>

          {plantillas.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-48">
                <div className="text-center">
                  <Bot className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Sin plantillas</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Creá tu primera plantilla de mensaje</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {['recordatorios', 'turnos', 'recetas', 'alertas'].map((cat) => {
                const plantillasCat = plantillas.filter((p) => p.categoria === cat);
                if (plantillasCat.length === 0) return null;
                return (
                  <Card key={cat}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base capitalize">{cat}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {plantillasCat.map((plantilla) => (
                        <div key={plantilla.id} className="p-4 rounded-lg bg-muted/30 border">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm">{plantilla.nombre}</p>
                                <Badge variant="outline" className="text-[10px] font-mono">
                                  {plantilla.variables.length} vars
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {plantilla.contenido}
                              </p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditingPlantilla(plantilla);
                                  setShowPlantillaModal(true);
                                }}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Modal Plantilla */}
          <PlantillaModal
            open={showPlantillaModal}
            onOpenChange={setShowPlantillaModal}
            plantilla={editingPlantilla}
            onSave={(data) => {
              if (editingPlantilla) {
                setPlantillas((prev) => prev.map((p) => p.id === editingPlantilla.id ? { ...p, ...data } : p));
              } else {
                setPlantillas((prev) => [...prev, { id: String(Date.now()), ...data }]);
              }
              setShowPlantillaModal(false);
            }}
          />
        </TabsContent>

        {/* ======== NOTIFICACIONES ======== */}
        <TabsContent value="notificaciones" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notificaciones</CardTitle>
              <CardDescription>Configurá cómo y cuándo recibir alertas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SwitchRow
                label="Urgencias por WhatsApp"
                description="Recibir notificación al WhatsApp personal cuando se detecte una urgencia"
                defaultChecked
              />
              <SwitchRow
                label="Resumen diario por email"
                description="Cada mañana con los turnos del día, nuevos pacientes y pendientes"
                defaultChecked
              />
              <SwitchRow
                label="Alertas de ausentismo"
                description="Cuando un paciente no confirma el turno después del recordatorio"
                defaultChecked
              />
              <SwitchRow
                label="Nuevos pacientes"
                description="Notificar cuando un nuevo paciente se registra vía WhatsApp"
              />
              <div className="pt-3">
                <Label>WhatsApp personal para urgencias</Label>
                <Input defaultValue="+5491155550000" className="mt-1" />
                <p className="text-xs text-muted-foreground mt-1">
                  Número donde recibirás las alertas de urgencia
                </p>
              </div>
              <Button>
                <Save className="h-4 w-4 mr-1" />
                Guardar preferencias
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======== CREDENCIALES (solo admin) ======== */}
        {isAdmin && (
          <TabsContent value="credenciales" className="mt-4">
            <CredencialesTab />
          </TabsContent>
        )}

        {/* ======== EQUIPO ======== */}
        <TabsContent value="equipo" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Miembros del equipo</CardTitle>
                <CardDescription>Usuarios con acceso al dashboard</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowInviteModal(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Invitar miembro
              </Button>
            </CardHeader>
            <CardContent>
              {miembrosEquipo.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Sin miembros en el equipo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {miembrosEquipo.map((miembro) => (
                    <div key={miembro.email} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                          {miembro.nombre.split(' ').map(p => p[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{miembro.nombre}</p>
                          <p className="text-xs text-muted-foreground">{miembro.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">{miembro.rol}</Badge>
                        <span className="text-xs text-muted-foreground">{miembro.ultimo}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modal Invitar */}
          <InviteModal open={showInviteModal} onOpenChange={setShowInviteModal} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Subcomponentes
// ============================================================

function SwitchRow({ label, description, defaultChecked }: { label: string; description: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

// ============================================================
// Modal Plantilla WhatsApp
// ============================================================

function PlantillaModal({
  open,
  onOpenChange,
  plantilla,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantilla: PlantillaWhatsApp | null;
  onSave: (data: { nombre: string; contenido: string; categoria: string; variables: string[] }) => void;
}) {
  const [nombre, setNombre] = useState(plantilla?.nombre || '');
  const [contenido, setContenido] = useState(plantilla?.contenido || '');
  const [categoria, setCategoria] = useState(plantilla?.categoria || 'recordatorios');

  const variables = (contenido.match(/\{\{(\w+)\}\}/g) || []).map((v) => v.replace(/[{}]/g, ''));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ nombre, contenido, categoria, variables });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{plantilla ? 'Editar Plantilla' : 'Nueva Plantilla'}</DialogTitle>
          <DialogDescription>
            Las variables se escriben entre llaves dobles, ej: {'{{paciente}}'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Recordatorio 24hs" required />
          </div>
          <div className="space-y-2">
            <Label>Categoría</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              <option value="recordatorios">Recordatorios</option>
              <option value="turnos">Turnos</option>
              <option value="recetas">Recetas</option>
              <option value="alertas">Alertas</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Contenido del mensaje</Label>
            <Textarea
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              placeholder="Escribí el mensaje usando {{variables}}"
              rows={5}
              required
            />
          </div>
          {variables.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Variables detectadas:</span>
              {variables.map((v) => (
                <Badge key={v} variant="secondary" className="text-[10px] font-mono">
                  {'{{'}{v}{'}}'}
                </Badge>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!nombre || !contenido}>
              {plantilla ? 'Guardar cambios' : 'Crear plantilla'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Modal Invitar Miembro
// ============================================================

// ============================================================
// Componente Perfil de la Organización
// ============================================================

function PerfilOrganizacion() {
  const [data, setData] = useState({
    nombre: 'Consultorio Médico',
    eslogan: 'Tu salud, nuestra prioridad',
    descripcion: 'Centro médico especializado en atención clínica general.',
    logoUrl: '',
    avatarUrl: '',
    fondoUrl: '',
    firmaNombre: 'Dr. García',
    colorPrimario: '#2563eb',
    colorSecundario: '#7c3aed',
    direccion: 'Av. Corrientes 1234',
    ciudad: 'CABA',
    provincia: 'Buenos Aires',
    telefono: '+54 11 5555-0000',
    telefonoSecundario: '',
    whatsapp: '+5491155550000',
    email: 'info@consultorio.com',
    sitioWeb: 'https://consultorio.com',
    instagram: '',
    facebook: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [previewColor, setPreviewColor] = useState(data.colorPrimario);

  // Cargar datos al montar
  useEffect(() => {
    fetch('/api/organization')
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setData((prev) => ({ ...prev, ...res.data, redesSociales: undefined }));
          setPreviewColor(res.data.colorPrimario || '#2563eb');
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setGuardando(true);
    setMensaje('');
    try {
      const res = await fetch('/api/organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setMensaje('✅ Configuración guardada correctamente');
        setPreviewColor(data.colorPrimario);
        // Notificar a sidebar y header para que se actualicen
        window.dispatchEvent(new CustomEvent('organization-updated'));
        setTimeout(() => setMensaje(''), 3000);
      } else {
        setMensaje('❌ Error al guardar');
      }
    } catch {
      setMensaje('❌ Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  return (
      <div className="space-y-4">
      {/* Banner del perfil - fondo + avatar único */}
      <Card className="overflow-hidden">
        <div
          className="h-28 relative bg-cover bg-center transition-all"
          style={
            data.fondoUrl
              ? { backgroundImage: `url(${data.fondoUrl})` }
              : { background: `linear-gradient(135deg, ${previewColor}, ${data.colorSecundario || previewColor})` }
          }
        >
          {/* Botón para cambiar fondo */}
          <ImageUpload
            value=""
            onChange={(url) => updateField('fondoUrl', url)}
            onRemove={() => updateField('fondoUrl', '')}
            shape="square"
            size="sm"
            label="Fondo"
            className="absolute bottom-2 right-2"
            fallback={
              <span className="text-white text-[9px] flex items-center gap-1 bg-black/30 rounded-md px-2 py-1">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                Fondo
              </span>
            }
          />
        </div>
        <CardContent className="relative -mt-10 flex items-end gap-4 pb-4">
          {/* AVATAR único */}
          <ImageUpload
            value={data.avatarUrl}
            onChange={(url) => updateField('avatarUrl', url)}
            onRemove={() => updateField('avatarUrl', '')}
            shape="circle"
            size="md"
            label="Foto"
            className="shrink-0"
            fallback={
              <span className="text-xl font-bold" style={{ color: previewColor }}>
                {data.firmaNombre ? data.firmaNombre.charAt(0).toUpperCase() : '👤'}
              </span>
            }
          />
          <div className="pb-1 flex-1">
            <h3 className="text-lg font-bold">{data.firmaNombre || 'Dr. García'}</h3>
            <p className="text-sm text-muted-foreground">{data.nombre || 'Mi Consultorio'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{data.email}</p>
          </div>
        </CardContent>
      </Card>

      {mensaje && (
        <div className="text-sm font-medium p-3 rounded-lg bg-muted text-center">
          {mensaje}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Datos básicos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos del Consultorio</CardTitle>
            <CardDescription>Información principal que se muestra en la interfaz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Nombre del consultorio / médico" value={data.nombre} onChange={(v) => updateField('nombre', v)} />
            <Field label="Nombre del profesional (firma)" value={data.firmaNombre} onChange={(v) => updateField('firmaNombre', v)} placeholder="Ej: Dr. Juan García" />
            <Field label="Eslogan" value={data.eslogan} onChange={(v) => updateField('eslogan', v)} />
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Textarea
                value={data.descripcion}
                onChange={(e) => updateField('descripcion', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Colores */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personalización Visual</CardTitle>
            <CardDescription>Colores principales de la interfaz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ColorField
              label="Color primario"
              value={data.colorPrimario}
              onChange={(v) => { updateField('colorPrimario', v); setPreviewColor(v); }}
            />
            <ColorField
              label="Color secundario"
              value={data.colorSecundario}
              onChange={(v) => updateField('colorSecundario', v)}
            />
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-2">Vista previa de los colores:</p>
              <div className="flex gap-2">
                <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: data.colorPrimario }} />
                <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: data.colorSecundario }} />
                <div className="h-8 w-8 rounded-lg" style={{ background: `linear-gradient(135deg, ${data.colorPrimario}, ${data.colorSecundario})` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dirección */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dirección y Contacto</CardTitle>
            <CardDescription>Datos de ubicación del consultorio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Dirección" value={data.direccion} onChange={(v) => updateField('direccion', v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ciudad" value={data.ciudad} onChange={(v) => updateField('ciudad', v)} />
              <Field label="Provincia" value={data.provincia} onChange={(v) => updateField('provincia', v)} />
            </div>
          </CardContent>
        </Card>

        {/* Teléfonos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Teléfonos y Email</CardTitle>
            <CardDescription>Canales de comunicación</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Teléfono principal" value={data.telefono} onChange={(v) => updateField('telefono', v)} />
            <Field label="Teléfono secundario" value={data.telefonoSecundario} onChange={(v) => updateField('telefonoSecundario', v)} />
            <Field label="WhatsApp" value={data.whatsapp} onChange={(v) => updateField('whatsapp', v)} />
            <Field label="Email" type="email" value={data.email} onChange={(v) => updateField('email', v)} />
            <Field label="Sitio web" value={data.sitioWeb} onChange={(v) => updateField('sitioWeb', v)} />
          </CardContent>
        </Card>

        {/* Redes Sociales */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Redes Sociales</CardTitle>
            <CardDescription>Vinculá las redes del consultorio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Instagram" value={data.instagram} onChange={(v) => updateField('instagram', v)} placeholder="@usuario" />
              <Field label="Facebook" value={data.facebook} onChange={(v) => updateField('facebook', v)} placeholder="facebook.com/pagina" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => {
          setMensaje(''); fetch('/api/organization').then(r => r.json()).then(res => {
            if (res.data) setData(res.data);
          });
        }}>
          Restablecer
        </Button>
        <Button onClick={handleSave} disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Subcomponentes de Perfil
// ============================================================

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <div className="h-10 w-10 rounded-md border shrink-0" style={{ backgroundColor: value }} />
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-10 cursor-pointer p-1"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="w-28 font-mono text-xs" />
      </div>
    </div>
  );
}

function InviteModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('medico');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Invitar miembro al equipo</DialogTitle>
          <DialogDescription>Se enviará un email de invitación</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="email@consultorio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={rol}
              onChange={(e) => setRol(e.target.value)}
            >
              <option value="medico">Médico</option>
              <option value="secretaria">Secretaria</option>
              <option value="recepcionista">Recepcionista</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => { onOpenChange(false); }} disabled={!email}>Enviar invitación</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
