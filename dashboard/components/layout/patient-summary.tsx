'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  Phone,
  Mail,
  Calendar,
  Syringe,
  Activity,
  Stethoscope,
  ArrowRight,
  Clock,
  Shield,
  AlertTriangle,
  Pill,
  ExternalLink,
} from 'lucide-react';
import { usePatientPanel } from '@/lib/hooks/use-patient-panel';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, getInitials, formatRelative } from '@/lib/utils';
import type { PatientSummaryLite } from '@/lib/types/patient-panel';

// ============================================================
// Collapsible section
// ============================================================

function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = false,
  badge,
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="space-y-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-1 py-1.5 rounded-md hover:bg-accent/50 transition-colors text-left"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex-1">
          {title}
        </span>
        {badge}
      </button>
      {open && <div className="pl-5 space-y-1.5">{children}</div>}
    </div>
  );
}

// ============================================================
// Health system badge
// ============================================================

function SistemaSaludBadge({ sistema, isapre }: { sistema: string | null; isapre: string | null }) {
  if (!sistema) return null;

  const colorMap: Record<string, string> = {
    fonasa: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    isapre: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    particular: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    otro: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
  };

  const color = colorMap[sistema.toLowerCase()] || colorMap.otro;
  const label = isapre || sistema.charAt(0).toUpperCase() + sistema.slice(1);

  return (
    <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium', color)}>
      {label}
    </span>
  );
}

// ============================================================
// Patient summary
// ============================================================

export function PatientSummary() {
  const { data, isLoadingDetail, clearPatient, close } = usePatientPanel();
  const router = useRouter();
  const [scoresMap, setScoresMap] = useState<Record<string, { score: number; nivel: string }>>({});

  const patient = data?.patient ?? null;

  // Fetch scoring for current patient
  useEffect(() => {
    if (!patient) return;
    fetch(`/api/pacientes/scoring?ids=${patient.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data?.scores) {
          const map: Record<string, { score: number; nivel: string }> = {};
          for (const s of json.data.scores) {
            map[s.pacienteId] = { score: s.score, nivel: s.nivel || 'bajo' };
          }
          setScoresMap(map);
        }
      })
      .catch(() => {});
  }, [patient]);

  const goToDetail = useCallback(() => {
    if (!patient) return;
    router.push(`/dashboard/pacientes/${patient.id}`);
    close();
  }, [patient, router, close]);

  if (!patient) return null;

  const score = scoresMap[patient.id];
  const scoringDot = score
    ? score.nivel === 'alto'
      ? 'bg-red-500'
      : score.nivel === 'medio'
        ? 'bg-yellow-500'
        : 'bg-green-500'
    : null;

  const age = patient.fechaNacimiento
    ? Math.floor((Date.now() - new Date(patient.fechaNacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <ScrollArea className="flex-1 -mx-6 px-6">
      <div className="space-y-4 pb-4">
        {/* ── Back button ── */}
        <button
          onClick={clearPatient}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-3 w-3 rotate-180" />
          Buscar paciente
        </button>

        {/* ── Patient header ── */}
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {getInitials(patient.nombre, patient.apellido)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold truncate leading-tight">
                {patient.nombre} {patient.apellido}
              </h3>
              {scoringDot && (
                <span
                  className={cn('inline-block w-2 h-2 rounded-full shrink-0', scoringDot)}
                  title={`Score: ${score!.score} - Riesgo ${score!.nivel}`}
                />
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <SistemaSaludBadge sistema={patient.sistemaSalud} isapre={patient.isapreNombre} />
              {age !== null && (
                <span className="text-[11px] text-muted-foreground">{age} años</span>
              )}
              {patient.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {patient.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0 h-4 font-normal">
                      {tag}
                    </Badge>
                  ))}
                  {patient.tags.length > 3 && (
                    <span className="text-[9px] text-muted-foreground">+{patient.tags.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Quick actions row ── */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 flex-1"
            onClick={goToDetail}
          >
            <ExternalLink className="h-3 w-3" />
            Ver ficha
          </Button>
          {patient.telefono && (
            <a
              href={`https://wa.me/${patient.telefono.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                <Phone className="h-3 w-3" />
              </Button>
            </a>
          )}
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Turnos', value: patient.totalTurnos, icon: Calendar },
            { label: 'Recetas', value: patient.totalRecetas, icon: Syringe },
            { label: 'Historial', value: patient.totalHistorial, icon: Activity },
            { label: 'SOAP', value: patient.totalNotasSoap, icon: Stethoscope },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-0.5 rounded-lg bg-muted/50 py-1.5 px-1"
            >
              <stat.icon className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-semibold leading-none">{stat.value}</span>
              <span className="text-[9px] text-muted-foreground leading-none">{stat.label}</span>
            </div>
          ))}
        </div>

        <hr className="border-border/50" />

        {/* Loading detail indicator */}
        {isLoadingDetail && (
          <div className="flex items-center justify-center py-4 gap-2 text-xs text-muted-foreground">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Cargando detalle...
          </div>
        )}

        {/* ── Info Personal (open by default) ── */}
        <CollapsibleSection title="Info Personal" icon={Shield} defaultOpen>
          <div className="space-y-1">
            {patient.telefono && (
              <div className="flex items-center gap-2 text-xs">
                <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">{patient.telefono}</span>
              </div>
            )}
            {patient.email && (
              <div className="flex items-center gap-2 text-xs">
                <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">{patient.email}</span>
              </div>
            )}
            {patient.dni && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground shrink-0 font-mono text-[10px]">RUT</span>
                <span>{patient.dni}</span>
              </div>
            )}
            {!patient.telefono && !patient.email && !patient.dni && (
              <span className="text-[11px] text-muted-foreground">Sin datos de contacto</span>
            )}
          </div>
        </CollapsibleSection>

        {/* ── Alergias / Medicación (open by default if present) ── */}
        {(patient.alergias || patient.medicacionCronica) && (
          <CollapsibleSection
            title="Alergias y Medicación"
            icon={AlertTriangle}
            defaultOpen={!!patient.alergias}
          >
            {patient.alergias && (
              <div className="rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                  <span className="text-[10px] font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider">
                    Alergias
                  </span>
                </div>
                <p className="text-[11px] text-red-600 dark:text-red-400 leading-relaxed">
                  {patient.alergias}
                </p>
              </div>
            )}
            {patient.medicacionCronica && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Pill className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    Medicación Crónica
                  </span>
                </div>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
                  {patient.medicacionCronica}
                </p>
              </div>
            )}
          </CollapsibleSection>
        )}

        {/* ── Próximo Turno (open by default) ── */}
        {data?.upcomingTurnos && data.upcomingTurnos.length > 0 && (
          <CollapsibleSection
            title="Próximos Turnos"
            icon={Calendar}
            defaultOpen
            badge={
              <span className="text-[10px] font-medium text-primary bg-primary/10 rounded px-1.5 py-0.5">
                {data.upcomingTurnos.length}
              </span>
            }
          >
            {data.upcomingTurnos.map((turno) => (
              <div
                key={turno.id}
                className="flex items-start gap-2 rounded-md bg-muted/40 p-2 text-xs"
              >
                <Calendar className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium leading-tight">
                    {new Date(turno.fechaHora).toLocaleDateString('es-CL', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    <span className="text-muted-foreground">
                      {new Date(turno.fechaHora).toLocaleTimeString('es-CL', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </p>
                  {turno.tipoConsulta && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{turno.tipoConsulta}</p>
                  )}
                  {turno.medicoNombre && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">Dr. {turno.medicoNombre}</p>
                  )}
                  {turno.duracionMinutos && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">{turno.duracionMinutos} min</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CollapsibleSection>
        )}

        {/* ── Recetas Activas (collapsed) ── */}
        {data?.activeRecetas && data.activeRecetas.length > 0 && (
          <CollapsibleSection
            title="Recetas Activas"
            icon={Syringe}
            badge={
              <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 rounded px-1.5 py-0.5">
                {data.activeRecetas.length}
              </span>
            }
          >
            {data.activeRecetas.map((receta) => (
              <div
                key={receta.id}
                className="rounded-md bg-muted/40 p-2 text-xs"
              >
                <p className="font-medium leading-tight">{receta.medicamento}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {receta.dosis} — {receta.frecuencia}
                </p>
                {receta.fechaFin && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Hasta {new Date(receta.fechaFin).toLocaleDateString('es-CL')}
                  </p>
                )}
              </div>
            ))}
          </CollapsibleSection>
        )}

        {/* ── Último SOAP (collapsed) ── */}
        {data?.lastSoap && (
          <CollapsibleSection
            title="Última Nota SOAP"
            icon={Stethoscope}
            badge={
              data.lastSoap.cie10Codigo ? (
                <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded px-1 py-0.5">
                  {data.lastSoap.cie10Codigo}
                </span>
              ) : undefined
            }
          >
            <div className="rounded-md bg-muted/40 p-2 text-xs space-y-1.5">
              <p className="text-[10px] text-muted-foreground mb-1">
                {formatRelative(data.lastSoap.createdAt)} — {data.lastSoap.medicoNombre || 'Médico'}
              </p>
              {data.lastSoap.subjetivo && (
                <div>
                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">S</span>{' '}
                  <span className="text-[11px] leading-relaxed">{data.lastSoap.subjetivo}</span>
                </div>
              )}
              {data.lastSoap.objetivo && (
                <div>
                  <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">O</span>{' '}
                  <span className="text-[11px] leading-relaxed">{data.lastSoap.objetivo}</span>
                </div>
              )}
              {data.lastSoap.assessment && (
                <div>
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">A</span>{' '}
                  <span className="text-[11px] leading-relaxed">{data.lastSoap.assessment}</span>
                </div>
              )}
              {data.lastSoap.plan && (
                <div>
                  <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">P</span>{' '}
                  <span className="text-[11px] leading-relaxed">{data.lastSoap.plan}</span>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}
      </div>
    </ScrollArea>
  );
}
