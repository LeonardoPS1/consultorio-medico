'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Syringe,
  Phone,
  LogOut,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
} from 'lucide-react';
import { formatDate, formatPhone, getTurnoColor, getTurnoLabel } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────

interface TurnoRow {
  id: string;
  fechaHora: string;
  estado: string;
  tipoConsulta: string;
  motivo: string | null;
  medicoNombre: string | null;
  duracionMinutos: number;
}

interface RecetaRow {
  id: string;
  medicamento: string;
  dosis: string;
  frecuencia: string;
  duracion: string | null;
  indicaciones: string | null;
  estado: string;
  fechaInicio: string;
  fechaFin: string | null;
  medicoNombre: string | null;
}

interface PortalData {
  paciente: {
    id: string;
    nombre: string;
    apellido: string;
    telefono: string;
    email: string | null;
    obraSocial: string | null;
  };
  turnos: TurnoRow[];
  recetas: RecetaRow[];
  stats: { totalTurnos: number; totalRecetas: number };
}

// ─── Helpers ──────────────────────────────────────────────

function getEstadoRecetaColor(estado: string) {
  switch (estado) {
    case 'activa': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'vencida': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getEstadoIcon(estado: string) {
  switch (estado) {
    case 'pendiente': return Clock;
    case 'confirmada': return CheckCircle2;
    case 'atendido': return CheckCircle2;
    case 'cancelada': return XCircle;
    case 'no_asistio': return AlertCircle;
    default: return Clock;
  }
}

// ─── Component ─────────────────────────────────────────────

export function PortalDashboardClient({ data }: { data: PortalData }) {
  const router = useRouter();
  const { paciente, turnos, recetas, stats } = data;

  const turnosProximos = turnos.filter((t) =>
    new Date(t.fechaHora) >= new Date() &&
    t.estado !== 'cancelada' &&
    t.estado !== 'no_asistio'
  );

  const turnosPasados = turnos.filter((t) =>
    new Date(t.fechaHora) < new Date() ||
    t.estado === 'cancelada' ||
    t.estado === 'no_asistio'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">
                Hola, {paciente.nombre}
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> {formatPhone(paciente.telefono)}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/portal')}>
            <LogOut className="h-4 w-4 mr-2" /> Salir
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-primary/5 border-0">
            <CardContent className="p-4 text-center">
              <Calendar className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-primary">{stats.totalTurnos}</p>
              <p className="text-xs text-muted-foreground">Turnos totales</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-500/5 border-0">
            <CardContent className="p-4 text-center">
              <Syringe className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-emerald-600">{stats.totalRecetas}</p>
              <p className="text-xs text-muted-foreground">Recetas</p>
            </CardContent>
          </Card>
        </div>

        {/* Datos del paciente */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-medium mb-2">Mis datos</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Nombre</p>
                <p className="font-medium">{paciente.nombre} {paciente.apellido}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Telefono</p>
                <p className="font-medium">{formatPhone(paciente.telefono)}</p>
              </div>
              {paciente.email && (
                <div>
                  <p className="text-muted-foreground text-xs">Email</p>
                  <p className="font-medium">{paciente.email}</p>
                </div>
              )}
              {paciente.obraSocial && (
                <div>
                  <p className="text-muted-foreground text-xs">Obra Social</p>
                  <p className="font-medium">{paciente.obraSocial}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="turnos">
          <TabsList className="w-full">
            <TabsTrigger value="turnos" className="flex-1">
              <Calendar className="h-4 w-4 mr-1" /> Proximos turnos ({turnosProximos.length})
            </TabsTrigger>
            <TabsTrigger value="historial" className="flex-1">
              <Clock className="h-4 w-4 mr-1" /> Historial ({turnosPasados.length})
            </TabsTrigger>
            <TabsTrigger value="recetas" className="flex-1">
              <Syringe className="h-4 w-4 mr-1" /> Recetas ({recetas.length})
            </TabsTrigger>
          </TabsList>

          {/* Turnos proximos */}
          <TabsContent value="turnos" className="mt-4">
            {turnosProximos.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <Calendar className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No tienes turnos próximos</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {turnosProximos.map((t) => (
                  <Card key={t.id} className="border-l-4" style={{ borderLeftColor: getTurnoColor(t.estado) }}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">
                          {formatDate(t.fechaHora, "EEEE d 'de' MMMM")}
                        </p>
                        <Badge
                          style={{ backgroundColor: `${getTurnoColor(t.estado)}20`, color: getTurnoColor(t.estado) }}
                          variant="outline"
                        >
                          {getTurnoLabel(t.estado)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(t.fechaHora, 'HH:mm')} · {t.duracionMinutos}min · {t.motivo || t.tipoConsulta}
                      </p>
                      {t.medicoNombre && (
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Dr/a. {t.medicoNombre}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Historial */}
          <TabsContent value="historial" className="mt-4">
            {turnosPasados.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <Clock className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Sin turnos anteriores</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {turnosPasados.map((t) => {
                  const Icon = getEstadoIcon(t.estado);
                  return (
                    <Card key={t.id} className="opacity-75">
                      <CardContent className="p-4 flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{formatDate(t.fechaHora, "d 'de' MMMM, HH:mm")}</p>
                          <p className="text-xs text-muted-foreground">{t.motivo || t.tipoConsulta}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {getTurnoLabel(t.estado)}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Recetas */}
          <TabsContent value="recetas" className="mt-4">
            {recetas.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <Syringe className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Sin recetas registradas</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {recetas.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Syringe className="h-4 w-4 text-primary" />
                          <p className="font-medium">{r.medicamento}</p>
                        </div>
                        <Badge className={getEstadoRecetaColor(r.estado)} variant="outline">
                          {r.estado}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {r.dosis} · {r.duracion || r.frecuencia}
                      </p>
                      {r.indicaciones && (
                        <p className="text-xs text-muted-foreground/70 mt-1 italic">{r.indicaciones}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {r.fechaInicio && <span>Desde: {formatDate(r.fechaInicio, 'dd/MM/yy')}</span>}
                        {r.fechaFin && <span>Hasta: {formatDate(r.fechaFin, 'dd/MM/yy')}</span>}
                        {r.medicoNombre && <span>Dr/a. {r.medicoNombre}</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Consultorio Medico — Datos solo visibles para {paciente.nombre} {paciente.apellido}
        </p>
      </div>
    </div>
  );
}
