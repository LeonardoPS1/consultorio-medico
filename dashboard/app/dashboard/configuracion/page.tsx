'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Bot, Twitch as Twilio, Database, Globe, Bell, Shield,
  CheckCircle2, XCircle, Edit3, Save, Plus, Trash2, ChevronRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

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
  const [plantillas, setPlantillas] = useState(plantillasIniciales);
  const [showPlantillaModal, setShowPlantillaModal] = useState(false);
  const [editingPlantilla, setEditingPlantilla] = useState<PlantillaWhatsApp | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configuración</h2>
        <p className="text-muted-foreground">
          Gestioná las integraciones y preferencias del sistema
        </p>
      </div>

      <Tabs defaultValue="integraciones">
        <TabsList className="flex-wrap">
          <TabsTrigger value="integraciones">Integraciones</TabsTrigger>
          <TabsTrigger value="horarios">Horarios</TabsTrigger>
          <TabsTrigger value="ia">IA & Automatización</TabsTrigger>
          <TabsTrigger value="plantillas">Plantillas WhatsApp</TabsTrigger>
          <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
          <TabsTrigger value="equipo">Equipo</TabsTrigger>
        </TabsList>

        {/* ======== INTEGRACIONES ======== */}
        <TabsContent value="integraciones" className="mt-4 space-y-4">
          {/* Twilio */}
          <IntegrationCard
            icon={<Twilio className="h-5 w-5 text-red-600 dark:text-red-400" />}
            title="Twilio (WhatsApp)"
            description="Conectá tu número de WhatsApp Business"
            status="conectado"
            bgColor="bg-red-100 dark:bg-red-900/30"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Account SID</Label>
                <Input value="AC****************************" readOnly />
              </div>
              <div className="space-y-1">
                <Label>Auth Token</Label>
                <Input type="password" value="****************" readOnly />
              </div>
            </div>
            <div className="space-y-1 mt-3">
              <Label>Número de WhatsApp</Label>
              <Input value="whatsapp:+14155238886" readOnly />
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm">Verificar conexión</Button>
              <Button variant="outline" size="sm">Configurar</Button>
            </div>
          </IntegrationCard>

          {/* PostgreSQL */}
          <IntegrationCard
            icon={<Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
            title="PostgreSQL"
            description="Base de datos local en la VPS"
            status="conectado"
            bgColor="bg-blue-100 dark:bg-blue-900/30"
          >
            <div className="space-y-1">
              <Label>Estado</Label>
              <p className="text-sm text-emerald-600 font-medium">✅ Operativa — 2.1 GB usados de 10 GB</p>
            </div>
            <div className="mt-2">
              <Label>URL de conexión</Label>
              <Input value="postgresql://postgres:****@localhost:5432/consultorio_medico" readOnly />
            </div>
          </IntegrationCard>

          {/* Ollama */}
          <IntegrationCard
            icon={<Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
            title="Ollama (IA Local)"
            description="Modelo Mistral corriendo en la VPS"
            status="conectado"
            bgColor="bg-purple-100 dark:bg-purple-900/30"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Modelo activo</Label>
                <Input value="mistral:latest" readOnly />
              </div>
              <div className="space-y-1">
                <Label>Temperatura default</Label>
                <Input value="0.3" readOnly />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm">Probar conexión</Button>
              <Button variant="outline" size="sm">Ver modelos</Button>
            </div>
          </IntegrationCard>

          {/* n8n */}
          <IntegrationCard
            icon={<Globe className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
            title="n8n (Automatización)"
            description="Workflows activos y monitoreo"
            status="warning"
            statusText="1 pendiente"
            bgColor="bg-orange-100 dark:bg-orange-900/30"
          >
            <div className="space-y-2">
              <WorkflowItem name="WhatsApp Inbound" active />
              <WorkflowItem name="Gestión de Turnos" active />
              <WorkflowItem name="Recordatorios" active />
              <WorkflowItem name="Correo Inteligente" active={false} />
              <WorkflowItem name="Resumen Diario" active />
              <WorkflowItem name="Recetas" active />
            </div>
          </IntegrationCard>

          {/* Google Calendar */}
          <IntegrationCard
            icon={<CalendarIcon className="h-5 w-5 text-green-600 dark:text-green-400" />}
            title="Google Calendar"
            description="Sincronización de turnos con Google Calendar"
            status="desconectado"
            bgColor="bg-green-100 dark:bg-green-900/30"
          >
            <p className="text-sm text-muted-foreground mb-3">
              Conectá tu cuenta de Google para sincronizar los turnos automáticamente.
            </p>
            <Button variant="outline" size="sm">Conectar Google Calendar</Button>
          </IntegrationCard>
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

function IntegrationCard({
  icon,
  title,
  description,
  status,
  statusText,
  bgColor,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: 'conectado' | 'desconectado' | 'warning';
  statusText?: string;
  bgColor: string;
  children: React.ReactNode;
}) {
  const statusConfig = {
    conectado: { dot: 'bg-emerald-500', text: 'Conectado', textColor: 'text-emerald-600' },
    desconectado: { dot: 'bg-red-500', text: 'Desconectado', textColor: 'text-red-600' },
    warning: { dot: 'bg-amber-500', text: statusText || 'Atención', textColor: 'text-amber-600' },
  };
  const cfg = statusConfig[status];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl ${bgColor} flex items-center justify-center`}>
              {icon}
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
            <span className={`text-sm font-medium ${cfg.textColor}`}>{cfg.text}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function WorkflowItem({ name, active }: { name: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{name}</span>
      {active ? (
        <span className="text-emerald-600 flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" /> Activo
        </span>
      ) : (
        <span className="text-amber-600 flex items-center gap-1">
          <XCircle className="h-3.5 w-3.5" /> Pendiente
        </span>
      )}
    </div>
  );
}

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

function CalendarIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
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
