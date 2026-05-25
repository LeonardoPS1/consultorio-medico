'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bot, Globe, Database, Mail, Phone, Calendar, Calendar as CalendarIcon,
  CheckCircle2, XCircle, RefreshCw, Lock, Key, Wifi,
} from 'lucide-react';

// ============================================================
// Tipos
// ============================================================

interface IntegracionesDashboardProps {
  isAdmin: boolean;
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

// ============================================================
// Componente principal
// ============================================================

export default function IntegracionesDashboard({ isAdmin }: IntegracionesDashboardProps) {
  const router = useRouter();
  const [servicios, setServicios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/credenciales');
      const data = await res.json();
      if (res.ok && data.grouped) {
        setServicios(data.grouped);
      }
    } catch (err) {
      console.error('Error cargando estado de integraciones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  // Mapa de iconos y colores por servicio
  const iconMap: Record<string, { icon: React.ReactNode; bg: string }> = {
    twilio: { icon: <Phone className="h-5 w-5 text-red-600 dark:text-red-400" />, bg: 'bg-red-100 dark:bg-red-900/30' },
    ollama: { icon: <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />, bg: 'bg-purple-100 dark:bg-purple-900/30' },
    n8n: { icon: <Globe className="h-5 w-5 text-orange-600 dark:text-orange-400" />, bg: 'bg-orange-100 dark:bg-orange-900/30' },
    smtp: { icon: <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />, bg: 'bg-blue-100 dark:bg-blue-900/30' },
    imap: { icon: <Mail className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />, bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
    postgres: { icon: <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />, bg: 'bg-blue-100 dark:bg-blue-900/30' },
    google_calendar: { icon: <CalendarIcon className="h-5 w-5 text-green-600 dark:text-green-400" />, bg: 'bg-green-100 dark:bg-green-900/30' },
    telefono_doctor: { icon: <Phone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />, bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  };

  const displayNames: Record<string, string> = {
    twilio: 'Twilio (WhatsApp)',
    ollama: 'Ollama (IA Local)',
    n8n: 'n8n (Automatización)',
    smtp: 'SMTP (Correo Saliente)',
    imap: 'IMAP (Correo Entrante)',
    postgres: 'PostgreSQL',
    google_calendar: 'Google Calendar',
    telefono_doctor: 'Teléfono del Médico',
  };

  const descripciones: Record<string, string> = {
    twilio: 'Mensajería WhatsApp',
    ollama: 'Modelo de IA local (Mistral)',
    n8n: 'Servidor de automatización',
    smtp: 'Envío de correos',
    imap: 'Recepción de correos',
    postgres: 'Base de datos principal',
    google_calendar: 'Sincronización de turnos',
    telefono_doctor: 'Contacto para alertas',
  };

  return (
    <>
      {/* Mosaico de integraciones */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Workflows de n8n (card especial) */}
        <Card className="md:col-span-2 xl:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <CardTitle className="text-base">n8n — Workflows Activos</CardTitle>
                  <CardDescription>Estado de las automatizaciones del consultorio</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-emerald-600">5/6 activos</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <WorkflowItem name="WhatsApp AI Agent" active />
              <WorkflowItem name="Gestión de Turnos" active />
              <WorkflowItem name="Recordatorios" active />
              <WorkflowItem name="Correo Inteligente" active={false} />
              <WorkflowItem name="Resumen Diario" active />
              <WorkflowItem name="Recetas" active />
            </div>
          </CardContent>
        </Card>

        {/* Cards de cada servicio */}
        {servicios.map((sv: any) => {
          const srv = sv.servicio;
          const style = iconMap[srv] || { icon: <Globe className="h-5 w-5" />, bg: 'bg-muted' };
          const creds = sv.credenciales || {};
          const campos = sv.config?.campos || [];
          const totalCampos = campos.length;
          const completados = campos.filter((c: any) => creds[c.clave]?.length > 0).length;
          const porcentaje = totalCampos > 0 ? Math.round((completados / totalCampos) * 100) : 0;

          let status: 'success' | 'warning' | 'error' = 'error';
          let statusLabel = 'Sin configurar';
          if (completados === totalCampos && totalCampos > 0) {
            status = 'success';
            statusLabel = 'Configurado';
          } else if (completados > 0) {
            status = 'warning';
            statusLabel = `${completados}/${totalCampos} campos`;
          }

          return (
            <Card key={srv}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-xl ${style.bg} flex items-center justify-center`}>
                      {style.icon}
                    </div>
                    <div>
                      <CardTitle className="text-sm">{displayNames[srv] || srv}</CardTitle>
                      <CardDescription className="text-xs">{descripciones[srv] || ''}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`h-2 w-2 rounded-full ${
                      status === 'success' ? 'bg-emerald-500' :
                      status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                    <span className={`text-[11px] font-medium ${
                      status === 'success' ? 'text-emerald-600' :
                      status === 'warning' ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {totalCampos > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>{completados} de {totalCampos} campos</span>
                      <span>{porcentaje}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          porcentaje === 100 ? 'bg-emerald-500' :
                          porcentaje > 50 ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  {completados > 0 && sv.config?.n8nSync && (
                    <span className="flex items-center gap-1">
                      <Wifi className="h-3 w-3" />
                      Sincronizable con n8n
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Acciones globales */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <>
                <Key className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium">Gestionar credenciales</p>
                  <p className="text-xs text-muted-foreground">
                    Los valores de API keys y tokens se gestionan desde la sección Credenciales
                  </p>
                </div>
              </>
            ) : (
              <>
                <Lock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Solo administradores</p>
                  <p className="text-xs text-muted-foreground">
                    Contactá al administrador del sistema para configurar o modificar integraciones
                  </p>
                </div>
              </>
            )}
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => router.push('/dashboard/admin/sistema')}>
              <Key className="h-4 w-4 mr-1" />
              Ir a Credenciales
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Botón para refrescar estado */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={loadStatus} className="text-xs">
          <RefreshCw className="h-3 w-3 mr-1" />
          Refrescar estado
        </Button>
      </div>
    </>
  );
}
