'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { canAccess } from '@/lib/features';
import { MedicosSection } from '@/components/config/medicos-section';
import { useSound } from '@/components/sound-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Bot, CreditCard, Sparkles } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import Setup2FA from '@/components/configuracion/setup-2fa';
import SuscripcionTab from '@/components/configuracion/suscripcion-tab';
import { ChangePasswordForm } from '@/components/configuracion/change-password-form';
import { PageHeader } from '@/components/page-header';
import { PerfilOrganizacion } from '@/components/config/config-perfil';
import { ConfigHorarios } from '@/components/config/config-horarios';
import { ConfigPlantillas } from '@/components/config/config-plantillas';
import { ConfigNotificaciones } from '@/components/config/config-notificaciones';
import { ConfigEquipo } from '@/components/config/config-equipo';

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
  tipo: string;
  inicio: string;
  fin: string;
  inicio2?: string | null;
  fin2?: string | null;
}

interface NotifData {
  urgenciasWhatsapp: boolean;
  resumenDiarioEmail: boolean;
  alertasAusentismo: boolean;
  nuevosPacientes: boolean;
  whatsappPersonal: string;
}

// ============================================================
// Componente principal
// ============================================================

export function ConfiguracionClient() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-96">
          <div className="skeleton h-8 w-48" />
        </div>
      }
    >
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
  const [deletingPlantilla, setDeletingPlantilla] = useState<PlantillaWhatsApp | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const { enabled: soundEnabled, toggle: toggleSound } = useSound();
  const router = useRouter();

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', value);
    router.replace(`/dashboard/configuracion?${params.toString()}`, { scroll: false });
  };
  const [horarios, setHorarios] = useState<HorarioData[]>([]);
  const [notificaciones, setNotificaciones] = useState<NotifData | null>(null);
  const [miembrosEquipo, setMiembrosEquipo] = useState<MiembroEquipo[]>([]);
  const [loading, setLoading] = useState({
    horarios: true,
    notificaciones: true,
    equipo: true,
    plantillas: true,
  });

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
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setHorarios(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading((h) => ({ ...h, horarios: false })));

    fetch('/api/notificaciones')
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setNotificaciones(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading((h) => ({ ...h, notificaciones: false })));

    fetch('/api/equipo')
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setMiembrosEquipo(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading((h) => ({ ...h, equipo: false })));

    fetch('/api/plantillas')
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setPlantillas(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading((h) => ({ ...h, plantillas: false })));
  }, []);

  return (
    <div className="space-y-6 animate-in">
      <div>
        <PageHeader
          title="Configuración"
          description="Gestioná las integraciones y preferencias del sistema"
        />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="overflow-x-auto flex-nowrap w-full gap-1">
          <TabsTrigger value="perfil" className="px-2 sm:px-3 shrink-0">
            <svg
              className="h-4 w-4 sm:mr-1"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="suscripcion" className="px-2 sm:px-3 shrink-0">
            <CreditCard className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Suscripción</span>
          </TabsTrigger>
          {canAccess(userPlan, 'horarios') && (
            <TabsTrigger value="horarios" className="px-2 sm:px-3 shrink-0">
              Horarios
            </TabsTrigger>
          )}
          {canAccess(userPlan, 'plantillas') && (
            <TabsTrigger value="plantillas" className="px-2 sm:px-3 shrink-0">
              Plantillas
            </TabsTrigger>
          )}
          {canAccess(userPlan, 'notificaciones') && (
            <TabsTrigger value="notificaciones" className="px-2 sm:px-3 shrink-0">
              Notificaciones
            </TabsTrigger>
          )}
          {canAccess(userPlan, 'equipo') && (
            <TabsTrigger value="equipo" className="px-2 sm:px-3 shrink-0">
              Equipo
            </TabsTrigger>
          )}
        </TabsList>

        {/* ======== PERFIL / ORGANIZACIÓN ======== */}
        <TabsContent value="perfil" className="mt-4 space-y-4">
          <PerfilOrganizacion />
          <ChangePasswordForm />
          <Setup2FA />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  Asistente de Configuración IA
                </CardTitle>
                <CardDescription>
                  Guía paso a paso para conectar WhatsApp, agregar médicos, configurar horarios y
                  mís
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
            <ConfigHorarios
              horarios={horarios}
              loading={loading.horarios}
              onHorariosChange={setHorarios}
            />
          </TabsContent>
        )}

        {/* ======== PLANTILLAS WHATSAPP ======== */}
        {canAccess(userPlan, 'plantillas') && (
          <TabsContent value="plantillas" className="mt-4 space-y-4">
            <ConfigPlantillas
              plantillas={plantillas}
              loading={loading.plantillas}
              onNew={() => {
                setEditingPlantilla(null);
                setShowPlantillaModal(true);
              }}
              onEdit={(p) => {
                setEditingPlantilla(p);
                setShowPlantillaModal(true);
              }}
              onPreview={(p) => setPreviewPlantilla(p)}
              onDelete={(p) => setDeletingPlantilla(p)}
            />

            <PlantillaModal
              open={showPlantillaModal}
              onOpenChange={setShowPlantillaModal}
              plantilla={editingPlantilla}
              onSave={async (data) => {
                try {
                  if (editingPlantilla) {
                    await fetch('/api/plantillas', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: editingPlantilla.id, ...data }),
                    });
                    setPlantillas((prev) =>
                      prev.map((p) => (p.id === editingPlantilla.id ? { ...p, ...data } : p)),
                    );
                  } else {
                    const res = await fetch('/api/plantillas', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data),
                    });
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

            <PreviewPlantillaModal
              plantilla={previewPlantilla}
              onClose={() => setPreviewPlantilla(null)}
            />

            <AlertDialog
              open={!!deletingPlantilla}
              onOpenChange={(open) => { if (!open) setDeletingPlantilla(null); }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará la plantilla "{deletingPlantilla?.nombre}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      if (!deletingPlantilla) return;
                      await fetch('/api/plantillas', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: deletingPlantilla.id }),
                      });
                      setPlantillas((prev) =>
                        prev.filter((p) => p.id !== deletingPlantilla.id),
                      );
                      toast({ title: 'Plantilla eliminada' });
                      setDeletingPlantilla(null);
                    }}
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
        )}

        {/* ======== NOTIFICACIONES ======== */}
        {canAccess(userPlan, 'notificaciones') && (
          <TabsContent value="notificaciones" className="mt-4">
            <ConfigNotificaciones
              notificaciones={notificaciones}
              loading={loading.notificaciones}
              soundEnabled={soundEnabled}
              onToggleSound={toggleSound}
              onNotificacionesChange={setNotificaciones}
            />
          </TabsContent>
        )}

        {/* ======== EQUIPO ======== */}
        {canAccess(userPlan, 'equipo') && (
          <TabsContent value="equipo" className="mt-4">
            <ConfigEquipo
              miembros={miembrosEquipo}
              loading={loading.equipo}
              onInvite={() => setShowInviteModal(true)}
            />

            <InviteModal open={showInviteModal} onOpenChange={setShowInviteModal} />

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
  onSave: (data: {
    nombre: string;
    contenido: string;
    categoria: string;
    variables: string[];
  }) => void;
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
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Recordatorio 24hs"
              required
            />
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
                  {'{{'}
                  {v}
                  {'}}'}
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
  recordatorios: {
    nombre: 'María',
    fecha_hora: 'lunes 25/05 a las 10:30',
    medico_nombre: 'Dr. García',
  },
  turnos: {
    paciente_nombre: 'María',
    fecha_hora: '25/05/2026 10:30',
    medico_nombre: 'Dr. García',
    motivo: 'control general',
  },
  recetas: {
    paciente_nombre: 'María',
    medicamento: 'Amoxicilina 500mg',
    dosis: '1 comprimido cada 8hs',
    frecuencia: '7 días',
  },
  alertas: {
    paciente_nombre: 'María',
    motivo: 'Presión arterial elevada',
    medico_nombre: 'Dr. García',
  },
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
          <DialogDescription>Completí las variables para ver el mensaje final</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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

          <div className="space-y-2">
            <Label>Vista previa</Label>
            <div className="p-4 rounded-lg bg-muted/50 border min-h-[80px] whitespace-pre-wrap text-sm">
              {preview || plantilla.contenido}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Variables:</span>
            {plantilla.variables.map((v) => (
              <Badge key={v} variant="outline" className="text-[10px] font-mono">
                {'{{'}
                {v}
                {'}}'}
              </Badge>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Modal Invitar Miembro
// ============================================================

function InviteModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('medico');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Invitar miembro al equipo</DialogTitle>
          <DialogDescription>Se enviarí un email de invitación</DialogDescription>
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
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                onOpenChange(false);
              }}
              disabled={!email}
            >
              Enviar invitación
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
