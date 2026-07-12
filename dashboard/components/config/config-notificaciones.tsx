'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Save } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface NotifData {
  urgenciasWhatsapp: boolean;
  resumenDiarioEmail: boolean;
  alertasAusentismo: boolean;
  nuevosPacientes: boolean;
  whatsappPersonal: string;
}

interface Props {
  notificaciones: NotifData | null;
  loading: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onNotificacionesChange: (n: NotifData) => void;
}

function SwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
  defaultChecked,
}: {
  label: string;
  description: string;
  checked?: boolean;
  onCheckedChange?: (v: boolean) => void;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} defaultChecked={defaultChecked} />
    </div>
  );
}

export function ConfigNotificaciones({
  notificaciones,
  loading,
  soundEnabled,
  onToggleSound,
  onNotificacionesChange,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificaciones</CardTitle>
        <CardDescription>Configurí cómo y cuíndo recibir alertas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 skeleton rounded-lg" />
            ))}
          </div>
        ) : notificaciones ? (
          <>
            <SwitchRow
              label="Urgencias por WhatsApp"
              description="Recibir notificación al WhatsApp personal cuando se detecte una urgencia"
              checked={notificaciones.urgenciasWhatsapp}
              onCheckedChange={(v) =>
                onNotificacionesChange({ ...notificaciones, urgenciasWhatsapp: v })
              }
            />
            <SwitchRow
              label="Resumen diario por email"
              description="Cada mañana con los turnos del día, nuevos pacientes y pendientes"
              checked={notificaciones.resumenDiarioEmail}
              onCheckedChange={(v) =>
                onNotificacionesChange({ ...notificaciones, resumenDiarioEmail: v })
              }
            />
            <SwitchRow
              label="Alertas de ausentismo"
              description="Cuando un paciente no confirma el turno después del recordatorio"
              checked={notificaciones.alertasAusentismo}
              onCheckedChange={(v) =>
                onNotificacionesChange({ ...notificaciones, alertasAusentismo: v })
              }
            />
            <SwitchRow
              label="Nuevos pacientes"
              description="Notificar cuando un nuevo paciente se registra vía WhatsApp"
              checked={notificaciones.nuevosPacientes}
              onCheckedChange={(v) =>
                onNotificacionesChange({ ...notificaciones, nuevosPacientes: v })
              }
            />
            <SwitchRow
              label="Efectos de sonido"
              description="Reproducir sonidos al hacer clic, recibir notificaciones y navegar"
              checked={soundEnabled}
              onCheckedChange={onToggleSound}
            />
            <div className="pt-3">
              <Label>WhatsApp personal para urgencias</Label>
              <Input
                value={notificaciones.whatsappPersonal}
                onChange={(e) =>
                  onNotificacionesChange({ ...notificaciones, whatsappPersonal: e.target.value })
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Número donde recibirís las alertas de urgencia
              </p>
            </div>
            <Button
              onClick={async () => {
                try {
                  const res = await fetch('/api/notificaciones', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(notificaciones),
                  });
                  if (res.ok) toast({ title: 'Preferencias guardadas' });
                  else toast({ title: 'Error al guardar', variant: 'destructive' });
                } catch {
                  toast({ title: 'Error de conexión', variant: 'destructive' });
                }
              }}
            >
              <Save className="h-4 w-4 mr-1" />
              Guardar preferencias
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No se pudieron cargar las preferencias.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
