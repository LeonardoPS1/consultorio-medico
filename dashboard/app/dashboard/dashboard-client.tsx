'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Users,
  MessageSquare,
  BarChart3,
  ChevronRight,
  Play,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { NuevoTurnoModal } from '@/components/modals/nuevo-turno-modal';

// ─── Quick Actions definition ─────────────────────────────

const quickActions = [
  {
    label: 'Nuevo Turno',
    icon: Calendar,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/50',
    action: 'turno' as const,
  },
  {
    label: 'Nuevo Paciente',
    icon: Users,
    color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50',
    action: 'paciente' as const,
  },
  {
    label: 'Enviar WhatsApp',
    icon: MessageSquare,
    color: 'text-green-600 bg-green-100 dark:bg-green-950/50',
    action: 'whatsapp' as const,
  },
  {
    label: 'Ver Reportes',
    icon: BarChart3,
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-950/50',
    action: 'reportes' as const,
  },
];

// ─── Props ─────────────────────────────────────────────────

interface DashboardClientProps {
  dateStr: string;
}

// ─── Component ─────────────────────────────────────────────

export function DashboardClient({ dateStr }: DashboardClientProps) {
  const router = useRouter();
  const [showNewTurno, setShowNewTurno] = useState(false);

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleQuickAction = useCallback((action: string) => {
    if (action === 'turno') {
      setShowNewTurno(true);
    }
  }, []);

  return (
    <>
      {/* ─── Header ────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight gradient-text">
            Panel Principal
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
            <span className="truncate line-clamp-1">
              Resumen de la actividad del consultorio &mdash; {dateStr}
            </span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="text-muted-foreground shrink-0 h-9 sm:h-10"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Actualizar</span>
        </Button>
      </div>

      {/* ─── Quick Actions ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          const actionHref =
            action.action === 'paciente'
              ? '/dashboard/pacientes'
              : action.action === 'whatsapp'
                ? '/dashboard/conversaciones'
                : action.action === 'reportes'
                  ? '/dashboard/reportes'
                  : null;

          // 'turno' abre modal, los demás navegan con Link (prefetch automático)
          if (actionHref) {
            return (
              <Link
                key={action.label}
                href={actionHref}
                className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border bg-card hoverable:hover:shadow-card-hover transition-[transform,box-shadow] duration-200 hoverable:hover:-translate-y-0.5 group min-h-[52px] sm:min-h-[60px]"
              >
                <div
                  className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform shrink-0`}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <span className="font-medium text-xs sm:text-sm truncate">{action.label}</span>
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-auto text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0" />
              </Link>
            );
          }

          // 'turno' → abre el modal
          return (
            <button
              key={action.label}
              onClick={() => handleQuickAction('turno')}
              className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border bg-card hoverable:hover:shadow-card-hover transition-[transform,box-shadow] duration-200 hoverable:hover:-translate-y-0.5 group min-h-[52px] sm:min-h-[60px]"
            >
              <div
                className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform shrink-0`}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <span className="font-medium text-xs sm:text-sm truncate">{action.label}</span>
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-auto text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0" />
            </button>
          );
        })}

        {/* Botón directo a Atención */}
        <Link
          href="/dashboard/atencion"
          className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/30 hoverable:hover:shadow-card-hover transition-[transform,box-shadow] duration-200 hoverable:hover:-translate-y-0.5 group min-h-[52px] sm:min-h-[60px]"
        >
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
            <Play className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
          </div>
          <span className="font-medium text-xs sm:text-sm">Atención</span>
          <Badge
            variant="secondary"
            className="ml-auto text-[9px] sm:text-[10px] bg-blue-200 text-blue-700 dark:bg-blue-900 dark:text-blue-300 shrink-0"
          >
            En vivo
          </Badge>
        </Link>
      </div>

      {/* ─── Nuevo Turno Modal ─────────────────────────── */}
      <NuevoTurnoModal
        open={showNewTurno}
        onOpenChange={setShowNewTurno}
        onSubmit={() => setShowNewTurno(false)}
      />
    </>
  );
}
