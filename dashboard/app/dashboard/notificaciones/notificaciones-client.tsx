'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Bell,
  BellOff,
  Calendar,
  MessageSquare,
  Syringe,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
  CheckCheck,
  Loader2,
  Smartphone,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { PushNotificationToggle } from '@/components/push-notification-toggle';
import { formatRelative } from '@/lib/utils';
import { useNotifications } from '@/lib/hooks/use-notifications';

// ============================================================
// Tipos
// ============================================================

interface NotificacionData {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: 'turno' | 'mensaje' | 'receta' | 'urgencia' | 'sistema';
  prioridad: number;
  leido: boolean;
  href: string | null;
  createdAt: string;
}

interface NotificacionesClientProps {
  initialNotificaciones: NotificacionData[];
  initialTotal: number;
  initialNoLeidas: number;
}

const iconosNotificacion: Record<string, React.ElementType> = {
  turno: Calendar,
  mensaje: MessageSquare,
  receta: Syringe,
  urgencia: AlertTriangle,
  sistema: Bell,
};

const coloresNotificacion: Record<string, string> = {
  turno: 'text-blue-500 bg-blue-100 dark:bg-blue-950/50',
  mensaje: 'text-green-500 bg-green-100 dark:bg-green-950/50',
  receta: 'text-purple-500 bg-purple-100 dark:bg-purple-950/50',
  urgencia: 'text-red-500 bg-red-100 dark:bg-red-950/50',
  sistema: 'text-amber-500 bg-amber-100 dark:bg-amber-950/50',
};

const TIPOS = ['urgencia', 'receta', 'turno', 'mensaje', 'sistema'] as const;
const labelsTipo: Record<string, string> = {
  urgencia: 'Urgencias',
  receta: 'Recetas',
  turno: 'Turnos',
  mensaje: 'Mensajes',
  sistema: 'Sistema',
};

/** Descripción para cada tipo de silencio */
const descripcionesTipo: Record<string, string> = {
  urgencia: 'Alertas críticas y emergencias',
  receta: 'Recetas por autorizar y renovaciones',
  turno: 'Confirmaciones, cancelaciones y recordatorios',
  mensaje: 'Mensajes de pacientes y conversaciones',
  sistema: 'Notificaciones generales del sistema',
};

// ============================================================
// Componente
// ============================================================

export function NotificacionesClient({
  initialNotificaciones,
  initialTotal,
  initialNoLeidas,
}: NotificacionesClientProps) {
  const router = useRouter();
  const {
    notificaciones,
    noLeidas,
    conteoPorTipo,
    silenciadas,
    marcarLeida,
    marcarNoLeida,
    eliminar,
    marcarTodasLeidas,
    silenciarCategoria,
    refetch,
    isError,
    error,
  } = useNotifications();

  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);

  // Filtrar локально (los datos ya vienen del hook)
  const notificacionesFiltradas = notificaciones.filter((n) => {
    if (filtroTipo && n.tipo !== filtroTipo) return false;
    if (soloNoLeidas && n.leido) return false;
    return true;
  });

  const total = notificaciones.length;

  const handleSilenciar = (tipo: string, silenciado: boolean) => {
    const nuevasSilenciadas = { ...silenciadas, [tipo]: silenciado };
    silenciarCategoria(nuevasSilenciadas);
  };

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="Notificaciones"
        description="Todas las notificaciones del sistema"
        icon={<Bell className="w-5 h-5" />}
        action={
          noLeidas > 0 ? (
            <Button variant="outline" size="sm" onClick={() => marcarTodasLeidas()}>
              <CheckCheck className="h-4 w-4 mr-1.5" />
              Marcar todas leídas
            </Button>
          ) : undefined
        }
      />

      {/* ─── Error banner ─────────────────────────────────── */}
      {isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">Error al cargar notificaciones</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {error instanceof Error ? error.message : 'No se pudieron cargar las notificaciones. Intentá de nuevo más tarde.'}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-xs font-medium text-destructive hover:underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ─── Filtros con conteo por tipo ────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={!filtroTipo && !soloNoLeidas ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => {
            setFiltroTipo(null);
            setSoloNoLeidas(false);
          }}
        >
          Todas ({total})
        </Badge>
        <Badge
          variant={soloNoLeidas ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => {
            setSoloNoLeidas(!soloNoLeidas);
            setFiltroTipo(null);
          }}
        >
          <Bell className="h-3 w-3 mr-1" />
          No leídas ({noLeidas})
        </Badge>
        {TIPOS.map((tipo) => {
          const count = conteoPorTipo[tipo] ?? 0;
          const TipoIcon = iconosNotificacion[tipo];
          return (
            <Badge
              key={tipo}
              variant={filtroTipo === tipo ? 'default' : 'outline'}
              className="cursor-pointer capitalize"
              onClick={() => {
                setFiltroTipo(tipo);
                setSoloNoLeidas(false);
              }}
            >
              <TipoIcon className="h-3 w-3 mr-1" />
              {labelsTipo[tipo] || tipo}
              {count > 0 && (
                <span className="ml-1 text-[10px] font-bold opacity-70">({count})</span>
              )}
            </Badge>
          );
        })}
      </div>

      {/* ─── Silenciar categorías ─────────────────────────── */}
      <div className="rounded-xl border bg-card/50 divide-y">
        <div className="flex items-center gap-2 px-4 py-3">
          <Volume2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Silenciar categorías</span>
          <span className="text-xs text-muted-foreground ml-1">
            — Las categorías silenciadas no muestran badge en el header
          </span>
        </div>
        {TIPOS.map((tipo) => {
          const TipoIcon = iconosNotificacion[tipo];
          const isSilenciada = silenciadas[tipo] ?? false;
          return (
            <div
              key={tipo}
              className="flex items-center justify-between px-4 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`h-7 w-7 rounded-lg ${coloresNotificacion[tipo]} flex items-center justify-center`}
                >
                  <TipoIcon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{labelsTipo[tipo]}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {descripcionesTipo[tipo]}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isSilenciada && (
                  <VolumeX className="h-3.5 w-3.5 text-muted-foreground/50" />
                )}
                <Switch
                  checked={isSilenciada}
                  onCheckedChange={(checked) => handleSilenciar(tipo, checked)}
                  aria-label={`Silenciar notificaciones de ${labelsTipo[tipo]}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Push Notification Toggle ────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl border bg-card/50">
        <Smartphone className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground font-medium">
          Notificaciones en este dispositivo:
        </span>
        <PushNotificationToggle />
      </div>

      {/* ─── Lista ───────────────────────────────────────── */}
      <div className="rounded-xl border bg-card">
        {notificacionesFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BellOff className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No hay notificaciones</p>
            <p className="text-xs mt-1">
              {soloNoLeidas
                ? 'No tienes notificaciones sin leer'
                : 'No hay notificaciones para mostrar con este filtro'}
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(100vh-420px)]">
            {notificacionesFiltradas.map((notif, idx) => {
              const Icon = iconosNotificacion[notif.tipo] || Bell;
              const isLast = idx === notificacionesFiltradas.length - 1;
              return (
                <div
                  key={notif.id}
                  className={`group flex items-start gap-4 px-5 py-4 transition-colors ${
                    !notif.leido ? 'bg-primary/[0.03]' : ''
                  } ${!isLast ? 'border-b' : ''} hover:bg-muted/30`}
                >
                  {/* Icono */}
                  <div
                    className={`h-9 w-9 rounded-xl ${coloresNotificacion[notif.tipo] || ''} flex items-center justify-center shrink-0 mt-0.5`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className={`text-sm ${!notif.leido ? 'font-semibold' : ''}`}>
                            {notif.titulo}
                          </p>
                          <span
                            className={`shrink-0 inline-flex items-center rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wide ${
                              coloresNotificacion[notif.tipo] || ''
                            }`}
                          >
                            {notif.tipo}
                          </span>
                        </div>
                        {notif.descripcion && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notif.descripcion}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap shrink-0 mt-0.5">
                        {formatRelative(notif.createdAt)}
                      </span>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1 mt-2">
                      {notif.href && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-primary"
                          onClick={() => router.push(notif.href!)}
                        >
                          Ver detalle
                        </Button>
                      )}
                      {!notif.leido ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground"
                          onClick={() => marcarLeida(notif.id)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Marcar leída
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground"
                          onClick={() => marcarNoLeida(notif.id)}
                        >
                          <EyeOff className="h-3 w-3 mr-1" />
                          Marcar no leída
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive/70 hover:text-destructive"
                        onClick={() => eliminar(notif.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </div>

                  {/* Indicador no leído */}
                  {!notif.leido && (
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </div>
              );
            })}
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
