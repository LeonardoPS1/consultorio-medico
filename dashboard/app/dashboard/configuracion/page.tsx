'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { canAccess } from '@/lib/features';
import { MedicosSection } from '@/components/config/medicos-section';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  Bot, Globe, Shield, CreditCard,
  Edit3, Save, Plus, Trash2, Key, Eye, Send, Sparkles,
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
import Setup2FA from '@/components/configuracion/setup-2fa';
import SuscripcionTab from '@/components/configuracion/suscripcion-tab';
import { ChangePasswordForm } from '@/components/configuracion/change-password-form';
import { PageHeader } from '@/components/page-header';

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
  id?: string;
  nombre: string;
  email: string;
  rol: string;
  ultimo: string;
}

interface HorarioData {
  id?: string;
  dia: string;
  activo: boolean;
  inicio: string;
  fin: string;
}

interface NotifData {
  urgenciasWhatsapp: boolean;
  resumenDiarioEmail: boolean;
  alertasAusentismo: boolean;
  nuevosPacientes: boolean;
  whatsappPersonal: string;
}

// ============================================================
// Los datos se cargan desde las APIs (/api/horarios, /api/notificaciones, /api/equipo, /api/plantillas)
// ============================================================

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
  const userRole = session?.user?.role;
  const userPlan = session?.user?.plan ?? 'free';
  const isAdmin = userRole === 'admin';
  const tabFromUrl = searchParams?.get('tab') || 'perfil';
  const [plantillas, setPlantillas] = useState<PlantillaWhatsApp[]>([]);
  const [showPlantillaModal, setShowPlantillaModal] = useState(false);
  const [editingPlantilla, setEditingPlantilla] = useState<PlantillaWhatsApp | null>(null);
  const [previewPlantilla, setPreviewPlantilla] = useState<PlantillaWhatsApp | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [horarios, setHorarios] = useState<HorarioData[]>([]);
  const [notificaciones, setNotificaciones] = useState<NotifData | null>(null);
  const [miembrosEquipo, setMiembrosEquipo] = useState<MiembroEquipo[]>([]);
  const [loading, setLoading] = useState({ horarios: true, notificaciones: true, equipo: true, plantillas: true });

  // Sincronizar tabs con la URL
  useEffect(() => {
    const urlTab = searchParams?.get('tab');
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams, activeTab]);

  // Cargar datos desde APIs
  useEffect(() => {
    fetch('/api/horarios')
      .then(r => r.json())
      .then(res => { if (res.data) setHorarios(res.data); })
      .catch(() => {})
      .finally(() => setLoading(h => ({ ...h, horarios: false })));

    fetch('/api/notificaciones')
      .then(r => r.json())
      .then(res => { if (res.data) setNotificaciones(res.data); })
      .catch(() => {})
      .finally(() => setLoading(h => ({ ...h, notificaciones: false })));

    fetch('/api/equipo')
      .then(r => r.json())
      .then(res => { if (res.data) setMiembrosEquipo(res.data); })
      .catch(() => {})
      .finally(() => setLoading(h => ({ ...h, equipo: false })));

    fetch('/api/plantillas')
      .then(r => r.json())
      .then(res => { if (res.data) setPlantillas(res.data); })
      .catch(() => {})
      .finally(() => setLoading(h => ({ ...h, plantillas: false })));
  }, []);

  return (
    <div className="space-y-6 animate-in">
      <div>
        <PageHeader title="Configuración" description="Gestioná las integraciones y preferencias del sistema" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="overflow-x-auto flex-nowrap w-full gap-1">
          <TabsTrigger value="perfil" className="px-2 sm:px-3 shrink-0">
            <svg className="h-4 w-4 sm:mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="suscripcion" className="px-2 sm:px-3 shrink-0">
            <CreditCard className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Suscripción</span>
          </TabsTrigger>
          {canAccess(userPlan, 'horarios') && (
            <TabsTrigger value="horarios" className="px-2 sm:px-3 shrink-0">Horarios</TabsTrigger>
          )}
          {canAccess(userPlan, 'plantillas') && (
            <TabsTrigger value="plantillas" className="px-2 sm:px-3 shrink-0">Plantillas</TabsTrigger>
          )}
          {canAccess(userPlan, 'notificaciones') && (
            <TabsTrigger value="notificaciones" className="px-2 sm:px-3 shrink-0">Notificaciones</TabsTrigger>
          )}
          {canAccess(userPlan, 'equipo') && (
            <TabsTrigger value="equipo" className="px-2 sm:px-3 shrink-0">Equipo</TabsTrigger>
          )}

        </TabsList>

        {/* ======== PERFIL / ORGANIZACIÓN ======== */}
        <TabsContent value="perfil" className="mt-4 space-y-4">
          <PerfilOrganizacion />
          <ChangePasswordForm />
          <Setup2FA />

          {/* Asistente de configuración IA */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  Asistente de Configuración IA
                </CardTitle>
                <CardDescription>
                  Guía paso a paso para conectar WhatsApp, agregar médicos, configurar horarios y más
                </CardDescription>
              </div>
              <Button asChild>
                <Link href="/dashboard/onboarding?reiniciar=true">
                  <Sparkles className="h-4 w-4 mr-1" />
                  Re-ejecutar asistente
                </Link>
              </Button>
            </CardHeader>
          </Card>
        </TabsContent>

        {/* ======== SUSCRIPCIÓN ======== */}
        <TabsContent value="suscripcion" className="mt-4">
          <SuscripcionTab />
        </TabsContent>

        {/* ======== HORARIOS ======== */}
        {canAccess(userPlan, 'horarios') && (
        <TabsContent value="horarios" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Horarios de Atención</CardTitle>
              <CardDescription>Configurá la disponibilidad del consultorio</CardDescription>
            </CardHeader>
            <CardContent>
              {loading.horarios ? (
                <div className="space-y-3">
                  {[1,2,3,4,5,6].map(i => <div key={i} className="h-12 skeleton rounded-lg" />)}
                </div>
              ) : (
              <div className="space-y-4">
                {horarios.map((dia, idx) => (
                  <div key={dia.dia} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg bg-muted/30">
                    <div className="w-16 sm:w-24 font-medium text-sm">{dia.dia}</div>
                    <Switch
                      checked={dia.activo}
                      onCheckedChange={(checked) => {
                        const nuevos = [...horarios];
                        nuevos[idx] = { ...nuevos[idx], activo: checked };
                        setHorarios(nuevos);
                      }}
                    />
                    {dia.activo ? (
                      <div className="flex items-center gap-2">
                        <Input type="time" value={dia.inicio} onChange={e => {
                          const nuevos = [...horarios];
                          nuevos[idx] = { ...nuevos[idx], inicio: e.target.value };
                        }} className="w-[5.5rem] sm:w-24 h-8 text-sm" />
                        <span className="text-muted-foreground text-sm">a</span>
                        <Input type="time" value={dia.fin} onChange={e => {
                          const nuevos = [...horarios];
                          nuevos[idx] = { ...nuevos[idx], fin: e.target.value };
                        }} className="w-[5.5rem] sm:w-24 h-8 text-sm" />
                        <span className="text-muted-foreground">a</span>
                        <Input type="time" value={dia.fin} onChange={e => {
                          const nuevos = [...horarios];
                          nuevos[idx] = { ...nuevos[idx], fin: e.target.value };
                          setHorarios(nuevos);
                        }} className="w-24 h-8 text-sm" />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Cerrado</span>
                    )}
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button onClick={async () => {
                    try {
                      const res = await fetch('/api/horarios', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ horarios }),
                      });
                      if (res.ok) toast({ title: 'Horarios guardados' });
                      else toast({ title: 'Error al guardar', variant: 'destructive' });
                    } catch { toast({ title: 'Error de conexión', variant: 'destructive' }); }
                  }}>
                    <Save className="h-4 w-4 mr-1" />
                    Guardar Horarios
                  </Button>
                  <Button variant="outline" onClick={() => {
                    fetch('/api/horarios').then(r => r.json()).then(res => {
                      if (res.data) setHorarios(res.data);
                    });
                  }}>
                    Restablecer
                  </Button>
                </div>
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* ======== PLANTILLAS WHATSAPP ======== */}
        {canAccess(userPlan, 'plantillas') && (
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                                title="Vista previa"
                                onClick={() => setPreviewPlantilla(plantilla)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
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
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
                                if (confirm('¿Eliminar plantilla?')) {
                                  await fetch('/api/plantillas', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: plantilla.id }) });
                                  setPlantillas((prev) => prev.filter((p) => p.id !== plantilla.id));
                                  toast({ title: 'Plantilla eliminada' });
                                }
                              }}>
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
            onSave={async (data) => {
              try {
                if (editingPlantilla) {
                  await fetch('/api/plantillas', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingPlantilla.id, ...data }) });
                  setPlantillas((prev) => prev.map((p) => p.id === editingPlantilla.id ? { ...p, ...data } : p));
                } else {
                  const res = await fetch('/api/plantillas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                  const result = await res.json();
                  if (result.data) setPlantillas((prev) => [...prev, result.data]);
                }
                setShowPlantillaModal(false);
                setEditingPlantilla(null);
                toast({ title: editingPlantilla ? 'Plantilla actualizada' : 'Plantilla creada' });
              } catch {
                toast({ title: 'Error al guardar', variant: 'destructive' });
              }
            }}
          />

          {/* Preview Plantilla */}
          <PreviewPlantillaModal
            plantilla={previewPlantilla}
            onClose={() => setPreviewPlantilla(null)}
          />
        </TabsContent>
        )}

        {/* ======== NOTIFICACIONES ======== */}
        {canAccess(userPlan, 'notificaciones') && (
        <TabsContent value="notificaciones" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notificaciones</CardTitle>
              <CardDescription>Configurá cómo y cuándo recibir alertas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading.notificaciones ? (
                <div className="space-y-4">
                  {[1,2,3,4].map(i => <div key={i} className="h-12 skeleton rounded-lg" />)}
                </div>
              ) : notificaciones ? (
                <>
              <SwitchRow
                label="Urgencias por WhatsApp"
                description="Recibir notificación al WhatsApp personal cuando se detecte una urgencia"
                checked={notificaciones.urgenciasWhatsapp}
                onCheckedChange={(v) => setNotificaciones({...notificaciones, urgenciasWhatsapp: v})}
              />
              <SwitchRow
                label="Resumen diario por email"
                description="Cada mañana con los turnos del día, nuevos pacientes y pendientes"
                checked={notificaciones.resumenDiarioEmail}
                onCheckedChange={(v) => setNotificaciones({...notificaciones, resumenDiarioEmail: v})}
              />
              <SwitchRow
                label="Alertas de ausentismo"
                description="Cuando un paciente no confirma el turno después del recordatorio"
                checked={notificaciones.alertasAusentismo}
                onCheckedChange={(v) => setNotificaciones({...notificaciones, alertasAusentismo: v})}
              />
              <SwitchRow
                label="Nuevos pacientes"
                description="Notificar cuando un nuevo paciente se registra vía WhatsApp"
                checked={notificaciones.nuevosPacientes}
                onCheckedChange={(v) => setNotificaciones({...notificaciones, nuevosPacientes: v})}
              />
              <div className="pt-3">
                <Label>WhatsApp personal para urgencias</Label>
                <Input value={notificaciones.whatsappPersonal} onChange={e => setNotificaciones({...notificaciones, whatsappPersonal: e.target.value})} className="mt-1" />
                <p className="text-xs text-muted-foreground mt-1">
                  Número donde recibirás las alertas de urgencia
                </p>
              </div>
              <Button onClick={async () => {
                try {
                  const res = await fetch('/api/notificaciones', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(notificaciones),
                  });
                  if (res.ok) toast({ title: 'Preferencias guardadas' });
                  else toast({ title: 'Error al guardar', variant: 'destructive' });
                } catch { toast({ title: 'Error de conexión', variant: 'destructive' }); }
              }}>
                <Save className="h-4 w-4 mr-1" />
                Guardar preferencias
              </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No se pudieron cargar las preferencias.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* ======== EQUIPO ======== */}
        {canAccess(userPlan, 'equipo') && (
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
              {loading.equipo ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-16 skeleton rounded-lg" />)}
                </div>
              ) : miembrosEquipo.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Sin miembros en el equipo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {miembrosEquipo.map((miembro) => (
                    <div key={miembro.email} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm shrink-0">
                          {miembro.nombre.split(' ').map(p => p[0]).join('')}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{miembro.nombre}</p>
                          <p className="text-xs text-muted-foreground truncate">{miembro.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Badge variant="outline" className="text-xs shrink-0">{miembro.rol}</Badge>
                        <span className="text-xs text-muted-foreground hidden sm:inline">{miembro.ultimo}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0">
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

          {/* Sección Médicos */}
          <div className="mt-4">
            <MedicosSection plan={userPlan} />
          </div>
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ============================================================
// Subcomponentes
// ============================================================

function SwitchRow({ label, description, checked, onCheckedChange, defaultChecked }: {
  label: string; description: string;
  checked?: boolean; onCheckedChange?: (v: boolean) => void;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        defaultChecked={defaultChecked}
      />
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
// Preview Plantilla WhatsApp
// ============================================================

const SAMPLE_DATA: Record<string, Record<string, string>> = {
  recordatorios: { nombre: 'María', fecha_hora: 'lunes 25/05 a las 10:30', medico_nombre: 'Dr. García' },
  turnos: { paciente_nombre: 'María', fecha_hora: '25/05/2026 10:30', medico_nombre: 'Dr. García', motivo: 'control general' },
  recetas: { paciente_nombre: 'María', medicamento: 'Amoxicilina 500mg', dosis: '1 comprimido cada 8hs', frecuencia: '7 días' },
  alertas: { paciente_nombre: 'María', motivo: 'Presión arterial elevada', medico_nombre: 'Dr. García' },
};

function PreviewPlantillaModal({
  plantilla,
  onClose,
}: {
  plantilla: PlantillaWhatsApp | null;
  onClose: () => void;
}) {
  const [datosEdit, setDatosEdit] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState('');

  useEffect(() => {
    if (!plantilla) return;
    // Pre-fill con datos de muestra según categoría
    const sample = SAMPLE_DATA[plantilla.categoria] || {};
    const initial: Record<string, string> = {};
    for (const v of plantilla.variables) {
      initial[v] = sample[v] || `[${v}]`;
    }
    setDatosEdit(initial);
  }, [plantilla]);

  useEffect(() => {
    if (!plantilla) return;
    let result = plantilla.contenido;
    for (const [key, value] of Object.entries(datosEdit)) {
      result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'), value || '');
    }
    setPreview(result);
  }, [plantilla, datosEdit]);

  if (!plantilla) return null;

  return (
    <Dialog open={!!plantilla} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Vista previa: {plantilla.nombre}</DialogTitle>
          <DialogDescription>
            Completá las variables para ver el mensaje final
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Variables editables */}
          {plantilla.variables.length > 0 && (
            <div className="space-y-2">
              <Label>Variables</Label>
              <div className="grid grid-cols-2 gap-2">
                {plantilla.variables.map((v) => (
                  <div key={v} className="space-y-1">
                    <span className="text-xs font-mono text-muted-foreground">{`{{${v}}}`}</span>
                    <Input
                      size={1}
                      value={datosEdit[v] || ''}
                      onChange={(e) => setDatosEdit((prev) => ({ ...prev, [v]: e.target.value }))}
                      placeholder={v}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview del mensaje */}
          <div className="space-y-2">
            <Label>Vista previa</Label>
            <div className="p-4 rounded-lg bg-muted/50 border min-h-[80px] whitespace-pre-wrap text-sm">
              {preview || plantilla.contenido}
            </div>
          </div>

          {/* Variables detectadas */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Variables:</span>
            {plantilla.variables.map((v) => (
              <Badge key={v} variant="outline" className="text-[10px] font-mono">
                {'{{'}{v}{'}}'}
              </Badge>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
          </DialogFooter>
        </div>
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
      .catch(() => console.warn('[Config] Error al cargar organización'));
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
              <span className="text-foreground text-[9px] flex items-center gap-1 bg-background/60 backdrop-blur-sm rounded-md px-2 py-1">
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
