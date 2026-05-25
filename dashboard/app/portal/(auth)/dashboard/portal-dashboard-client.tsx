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
  ClipboardList,
  MapPin,
  Shield,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

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

interface HistorialRow {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  createdAt: string;
}

interface PacienteData {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string | null;
  rut: string | null;
  sistemaSalud: string | null;
  region: string | null;
  comuna: string | null;
  direccion: string | null;
}

// ─── Helpers ──────────────────────────────────────────────

function formatCLDate(dateStr: string, pattern: string = "d 'de' MMMM, HH:mm") {
  const d = new Date(dateStr);
  return format(d, pattern, { locale: es });
}

function formatCLShort(dateStr: string) {
  const d = new Date(dateStr);
  return format(d, 'dd/MM/yyyy', { locale: es });
}

function formatCLPhone(phone: string) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('569') && cleaned.length === 11) {
    const n = cleaned.slice(3);
    return `+56 9 ${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
  }
  if (cleaned.startsWith('9') && cleaned.length === 9) {
    return `+56 9 ${cleaned.slice(1, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

function getTurnoColor(estado: string) {
  const colors: Record<string, string> = {
    pendiente: '#F59E0B',
    confirmada: '#10B981',
    en_consulta: '#3B82F6',
    en_atencion: '#2563EB',
    atendido: '#059669',
    completada: '#6B7280',
    cancelada: '#EF4444',
    no_asistio: '#EC4899',
  };
  return colors[estado] || '#6B7280';
}

function getTurnoLabel(estado: string) {
  const labels: Record<string, string> = {
    pendiente: 'Pendiente',
    confirmada: 'Confirmada',
    en_consulta: 'En consulta',
    en_atencion: 'En atención',
    atendido: 'Atendido',
    completada: 'Completada',
    cancelada: 'Cancelada',
    no_asistio: 'No asistió',
  };
  return labels[estado] || estado;
}

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

function getSistemaSaludLabel(s: string | null) {
  if (!s) return null;
  const labels: Record<string, string> = {
    fonasa: 'FONASA',
    isapre: 'ISAPRE',
    particular: 'Particular',
    particular_convenio: 'Particular con convenio',
  };
  return labels[s] || s;
}

function getSistemaSaludBadge(s: string | null) {
  if (!s) return null;
  const colors: Record<string, string> = {
    fonasa: 'bg-blue-100 text-blue-700 border-blue-200',
    isapre: 'bg-purple-100 text-purple-700 border-purple-200',
    particular: 'bg-green-100 text-green-700 border-green-200',
    particular_convenio: 'bg-amber-100 text-amber-700 border-amber-200',
  };
  return colors[s] || 'bg-gray-100 text-gray-700';
}

// ─── Component ─────────────────────────────────────────────

export default function PortalDashboardClient({
  paciente,
  turnos,
  recetas,
  historial,
}: {
  paciente: PacienteData;
  turnos: TurnoRow[];
  recetas: RecetaRow[];
  historial: HistorialRow[];
}) {
  const router = useRouter();

  const ahora = new Date();
  const turnosProximos = turnos.filter((t) =>
    new Date(t.fechaHora) >= ahora &&
    t.estado !== 'cancelada' &&
    t.estado !== 'no_asistio'
  );
  const turnosPasados = turnos.filter((t) =>
    new Date(t.fechaHora) < ahora ||
    t.estado === 'cancelada' ||
    t.estado === 'no_asistio'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Hola, {paciente.nombre}
            </h1>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Phone className="h-3 w-3" /> {formatCLPhone(paciente.telefono)}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/portal')} className="text-red-500 hover:text-red-700 hover:bg-red-50">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-blue-50 border-0">
          <CardContent className="p-3 text-center">
            <Calendar className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-blue-700">{turnos.length}</p>
            <p className="text-[10px] text-blue-600/70">Turnos</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-0">
          <CardContent className="p-3 text-center">
            <Clock className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-emerald-700">{turnosProximos.length}</p>
            <p className="text-[10px] text-emerald-600/70">Próximos</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-0">
          <CardContent className="p-3 text-center">
            <Syringe className="h-5 w-5 text-purple-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-purple-700">{recetas.length}</p>
            <p className="text-[10px] text-purple-600/70">Recetas</p>
          </CardContent>
        </Card>
      </div>

      {/* Datos del paciente (chilenos) */}
      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold text-sm text-gray-500 mb-3 uppercase tracking-wider">Mis datos</h2>
          <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
            <div>
              <p className="text-xs text-gray-400">Nombre completo</p>
              <p className="font-medium text-gray-900">{paciente.nombre} {paciente.apellido}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Teléfono</p>
              <p className="font-medium text-gray-900">{formatCLPhone(paciente.telefono)}</p>
            </div>
            {paciente.rut && (
              <div>
                <p className="text-xs text-gray-400">RUT</p>
                <p className="font-medium text-gray-900">{paciente.rut}</p>
              </div>
            )}
            {paciente.email && (
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="font-medium text-gray-900 truncate">{paciente.email}</p>
              </div>
            )}
            {paciente.sistemaSalud && (
              <div>
                <p className="text-xs text-gray-400">Sistema de salud</p>
                <Badge variant="outline" className={`mt-0.5 ${getSistemaSaludBadge(paciente.sistemaSalud)}`}>
                  <Shield className="h-3 w-3 mr-1" />
                  {getSistemaSaludLabel(paciente.sistemaSalud)}
                </Badge>
              </div>
            )}
            {(paciente.comuna || paciente.region) && (
              <div>
                <p className="text-xs text-gray-400">Ubicación</p>
                <p className="font-medium text-gray-900 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-gray-400" />
                  {[paciente.comuna, paciente.region].filter(Boolean).join(', ')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs principales */}
      <Tabs defaultValue="proximos">
        <TabsList className="w-full bg-gray-100">
          <TabsTrigger value="proximos" className="flex-1 text-xs sm:text-sm">
            <Calendar className="h-4 w-4 mr-1" />
            Próximos ({turnosProximos.length})
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex-1 text-xs sm:text-sm">
            <Clock className="h-4 w-4 mr-1" />
            Historial ({turnosPasados.length})
          </TabsTrigger>
          <TabsTrigger value="recetas" className="flex-1 text-xs sm:text-sm">
            <Syringe className="h-4 w-4 mr-1" />
            Recetas ({recetas.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Próximos turnos ── */}
        <TabsContent value="proximos" className="mt-4">
          {turnosProximos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <Calendar className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No tienes turnos próximos</p>
                <p className="text-xs text-gray-400 mt-1">Los turnos aparecerán aquí cuando los agendes</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {turnosProximos.map((t) => (
                <Card key={t.id} className="border-l-4 overflow-hidden" style={{ borderLeftColor: getTurnoColor(t.estado) }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {formatCLDate(t.fechaHora, "EEEE d 'de' MMMM")}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatCLDate(t.fechaHora, 'HH:mm')} · {t.duracionMinutos} min
                        </p>
                      </div>
                      <Badge
                        style={{ backgroundColor: `${getTurnoColor(t.estado)}18`, color: getTurnoColor(t.estado) }}
                        variant="outline"
                        className="border-0 text-xs font-semibold"
                      >
                        {getTurnoLabel(t.estado)}
                      </Badge>
                    </div>
                    {t.motivo && (
                      <p className="text-sm text-gray-600 mb-1">{t.motivo}</p>
                    )}
                    {t.medicoNombre && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <User className="h-3 w-3" /> Dr/a. {t.medicoNombre}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Historial ── */}
        <TabsContent value="historial" className="mt-4">
          {turnosPasados.length === 0 && historial.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <ClipboardList className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">Sin historial aún</p>
                <p className="text-xs text-gray-400 mt-1">Tus visitas anteriores aparecerán aquí</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Turnos pasados */}
              {turnosPasados.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Visitas</h3>
                  {turnosPasados.map((t) => {
                    const Icon = getEstadoIcon(t.estado);
                    return (
                      <Card key={t.id} className="mb-2 opacity-80">
                        <CardContent className="p-3 flex items-center gap-3">
                          <Icon className="h-5 w-5 text-gray-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {formatCLDate(t.fechaHora, "d 'de' MMMM, HH:mm")}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{t.motivo || t.tipoConsulta}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {getTurnoLabel(t.estado)}
                          </Badge>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Historial médico */}
              {historial.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Registros médicos
                  </h3>
                  {historial.map((h) => (
                    <Card key={h.id} className="mb-2">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <p className="font-medium text-sm text-gray-900">{h.titulo}</p>
                          <span className="text-[10px] text-gray-400">{formatCLShort(h.createdAt)}</span>
                        </div>
                        {h.descripcion && (
                          <p className="text-xs text-gray-600 mt-1">{h.descripcion}</p>
                        )}
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          {h.tipo}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Recetas ── */}
        <TabsContent value="recetas" className="mt-4">
          {recetas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <Syringe className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">Sin recetas activas</p>
                <p className="text-xs text-gray-400 mt-1">Las recetas aparecerán aquí cuando el médico las recete</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recetas.map((r) => (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Syringe className="h-4 w-4 text-blue-600" />
                        <p className="font-semibold text-gray-900">{r.medicamento}</p>
                      </div>
                      <Badge className={getEstadoRecetaColor(r.estado)} variant="outline">
                        {r.estado === 'activa' ? 'Activa' : 'Vencida'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {r.dosis} · {r.frecuencia}
                    </p>
                    {r.duracion && (
                      <p className="text-xs text-gray-500 mt-1">Duración: {r.duracion}</p>
                    )}
                    {r.indicaciones && (
                      <p className="text-xs text-gray-500 mt-1 italic bg-gray-50 p-2 rounded">
                        {r.indicaciones}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-400">
                      {r.fechaInicio && <span>Desde: {formatCLShort(r.fechaInicio)}</span>}
                      {r.fechaFin && <span>Hasta: {formatCLShort(r.fechaFin)}</span>}
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
      <p className="text-center text-[10px] text-gray-400 pb-4">
        Portal del Paciente — Datos visibles solo para {paciente.nombre} {paciente.apellido}
      </p>
    </div>
  );
}
