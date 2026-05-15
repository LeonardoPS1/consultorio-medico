'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Twitch as Twilio, Database, Globe, Bell, Shield } from 'lucide-react';

export default function ConfiguracionPage() {
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
          <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
          <TabsTrigger value="equipo">Equipo</TabsTrigger>
        </TabsList>

        {/* INTEGRACIONES */}
        <TabsContent value="integraciones" className="mt-4 space-y-4">
          {/* Twilio */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Twilio className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Twilio (WhatsApp)</CardTitle>
                    <CardDescription>Conectá tu número de WhatsApp Business</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-sm text-emerald-600 font-medium">Conectado</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
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
              <div className="space-y-1">
                <Label>Número de WhatsApp</Label>
                <Input value="whatsapp:+14155238886" readOnly />
              </div>
              <Button variant="outline" size="sm">Verificar conexión</Button>
            </CardContent>
          </Card>

          {/* Base de Datos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">PostgreSQL</CardTitle>
                    <CardDescription>Base de datos local en la VPS</CardDescription>
                  </div>
                </div>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <Label>Estado</Label>
                <p className="text-sm text-emerald-600 font-medium">✅ Operativa — 2.1 GB usados de 10 GB</p>
              </div>
            </CardContent>
          </Card>

          {/* Ollama */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Ollama (IA Local)</CardTitle>
                    <CardDescription>Modelo Mistral corriendo en la VPS</CardDescription>
                  </div>
                </div>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* n8n */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">n8n (Automatización)</CardTitle>
                    <CardDescription>Workflows activos y monitoreo</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-sm text-emerald-600 font-medium">6 workflows activos</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>WhatsApp Inbound</span>
                  <span className="text-emerald-600">✓ Activo</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Gestión de Turnos</span>
                  <span className="text-emerald-600">✓ Activo</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Recordatorios</span>
                  <span className="text-emerald-600">✓ Activo</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Correo Inteligente</span>
                  <span className="text-amber-600">○ Pendiente configurar</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HORARIOS */}
        <TabsContent value="horarios" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Horarios de Atención</CardTitle>
              <CardDescription>Configurá la disponibilidad del consultorio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((dia) => (
                  <div key={dia} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                    <div className="w-24 font-medium text-sm">{dia}</div>
                    <div className="flex items-center gap-2">
                      <Switch defaultChecked={dia !== 'Sábado'} />
                      <span className="text-sm text-muted-foreground">
                        {dia !== 'Sábado' ? '09:00 - 18:00' : 'Cerrado'}
                      </span>
                    </div>
                  </div>
                ))}
                <Button>Guardar Horarios</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IA */}
        <TabsContent value="ia" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asistente IA</CardTitle>
              <CardDescription>Configuración del comportamiento del asistente virtual</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Respuestas automáticas</Label>
                  <p className="text-sm text-muted-foreground">La IA responde automáticamente mensajes de WhatsApp</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Triaje de urgencias</Label>
                  <p className="text-sm text-muted-foreground">Detectar y notificar mensajes urgentes automáticamente</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Renovación de recetas automática</Label>
                  <p className="text-sm text-muted-foreground">Permitir renovar recetas sin intervención del médico</p>
                </div>
                <Switch />
              </div>
              <div className="space-y-1">
                <Label>Prompt del sistema</Label>
                <div className="p-3 rounded-lg bg-muted text-sm font-mono text-muted-foreground">
                  {`Sos el asistente virtual del Dr. García, un médico clínico. Respondés mensajes de WhatsApp de forma amable y profesional en español argentino. Si detectás una urgencia, priorizala y notificá al médico.`}
                </div>
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
              <Button>Guardar configuración de IA</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plantillas de WhatsApp</CardTitle>
              <CardDescription>Mensajes predeterminados para recordatorios y confirmaciones</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm">Gestionar plantillas →</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOTIFICACIONES */}
        <TabsContent value="notificaciones" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notificaciones</CardTitle>
              <CardDescription>Configurá cómo y cuándo recibir alertas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>Urgencias por WhatsApp</Label>
                    <p className="text-sm text-muted-foreground">Recibir notificación al WhatsApp personal</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>Resumen diario por email</Label>
                    <p className="text-sm text-muted-foreground">Cada mañana con los turnos del día</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>Alertas de ausentismo</Label>
                    <p className="text-sm text-muted-foreground">Cuando un paciente no confirma el turno</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EQUIPO */}
        <TabsContent value="equipo" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Miembros del equipo</CardTitle>
              <CardDescription>Usuarios con acceso al dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { nombre: 'Dr. García', email: 'dr.garcia@consultorio.com', rol: 'Médico', ultimo: 'Hace 5 min' },
                  { nombre: 'Dra. López', email: 'dra.lopez@consultorio.com', rol: 'Médico', ultimo: 'Hace 2 hs' },
                  { nombre: 'Marcela Ruiz', email: 'marcela@consultorio.com', rol: 'Secretaria', ultimo: 'Hace 15 min' },
                ].map((miembro) => (
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
                    </div>
                  </div>
                ))}
              </div>
              <Button className="mt-4" variant="outline" size="sm">
                + Invitar miembro
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
