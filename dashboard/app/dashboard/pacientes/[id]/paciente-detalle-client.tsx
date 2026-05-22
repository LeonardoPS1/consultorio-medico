'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Clock,
  FileText,
  Syringe,
  Activity,
  MessageSquare,
  Plus,
  Edit3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Shield,
  Cake,
  MapPin,
} from 'lucide-react';
import { formatPhone, getInitials, formatDate, getTurnoColor, getTurnoLabel } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

// ─── Types ────────────────────────────────────────────────

interface TurnoRow {
  id: string;
  fechaHora: string;
  estado: string;
  tipoConsulta: string;
  motivo: string | null;
  medicoNombre: string | null;
  duracionMinutos: number;
  notasMedico: string | null;
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
  tipo: string;
  titulo: string;
  descripcion: string | null;
  diagnosticoCodigo: string | null;
  diagnosticoDescripcion: string | null;
  fecha: string;
}

interface PacienteData {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string | null;
  dni: string | null;
  fechaNacimiento: string | null;
  direccion: string | null;
  obraSocial: string | null;
  numeroAfiliado: string | null;
  alergias: string | null;
  medicacionCronica: string | null;
  notasMedicas: string | null;
  tags: string[];
  consentimientoWhatsapp: boolean;
  createdAt: string;
}

interface Stats {
  totalTurnos: number;
  totalRecetas: number;
  totalHistorial: number;
  turnosPorEstado: Record<string, number>;
  recetasPorEstado: Record<string, number>;
}

interface Props {
  paciente: PacienteData;
  turnos: TurnoRow[];
  recetas: RecetaRow[];
  historial: HistorialRow[];
  ultimaConversacion: { id: string; estado: string } | null;
  stats: Stats;
}

// ─── Helpers ──────────────────────────────────────────────

function getEstadoRecetaColor(estado: string) {
  switch (estado) {
    case 'activa': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'vencida': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getHistorialIcon(tipo: string) {
  switch (tipo) {
    case 'consulta': return Activity;
    case 'diagnostico': return Shield;
    case 'procedimiento': return Syringe;
    case 'estudio': return FileText;
    default: return FileText;
  }
}

// ─── Component ─────────────────────────────────────────────

export function PacienteDetalleClient({
  paciente,
  turnos,
  recetas,
  historial,
  ultimaConversacion,
  stats,
}: Props) {
  const router = useRouter();
  const [turnosList, setTurnosList] = useState(turnos);

  const handleEstadoTurno = async (id: string, nuevoEstado: string) => {
    setTurnosList((prev) =>
      prev.map((t) => (t.id === id ? { ...t, estado: nuevoEstado } : t)),
    );
    try {
      await fetch(`/api/turnos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' });
    }
  };

  const edad = paciente.fechaNacimiento
    ? Math.floor((Date.now() - new Date(paciente.fechaNacimiento).getTime()) / 31557600000)
    : null;

  return (
    <div className="space-y-6 animate-in pb-8">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a pacientes
      </Button>

      {/* Header card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {getInitials(paciente.nombre, paciente.apellido)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">
                  {paciente.nombre} {paciente.apellido}
                </h1>
                {paciente.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {formatPhone(paciente.telefono)}
                </span>
                {paciente.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {paciente.email}
                  </span>
                )}
                {paciente.dni && (
                  <span className="flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5" /> DNI {paciente.dni}
                  </span>
                )}
                {edad !== null && (
                  <span className="flex items-center gap-1">
                    <Cake className="h-3.5 w-3.5" /> {edad} años
                  </span>
                )}
                {paciente.direccion && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {paciente.direccion}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {paciente.obraSocial && (
                  <Badge variant="secondary" className="text-xs">
                    {paciente.obraSocial}
                    {paciente.numeroAfiliado && ` #${paciente.numeroAfiliado}`}
                  </Badge>
                )}
                {paciente.consentimientoWhatsapp && (
                  <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> WhatsApp OK
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/conversaciones`)}>
                <MessageSquare className="h-4 w-4 mr-2" /> Mensaje
              </Button>
              <Button size="sm">
                <Calendar className="h-4 w-4 mr-2" /> Nuevo Turno
              </Button>
            </div>
          </div>

          {/* Alergias / Medicacion */}
          {(paciente.alergias || paciente.medicacionCronica) && (
            <div className="flex gap-4 mt-4 pt-4 border-t">
              {paciente.alergias && (
                <div className="flex items-start gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-red-600">Alergias</p>
                    <p className="text-muted-foreground">{paciente.alergias}</p>
                  </div>
                </div>
              )}
              {paciente.medicacionCronica && (
                <div className="flex items-start gap-2 text-sm">
                  <Syringe className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-600">Medicacion cronica</p>
                    <p className="text-muted-foreground">{paciente.medicacionCronica}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-0">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.totalTurnos}</p>
            <p className="text-xs text-muted-foreground">Turnos</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-0">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.totalRecetas}</p>
            <p className="text-xs text-muted-foreground">Recetas</p>
          </CardContent>
        </Card>
        <Card className="bg-violet-500/5 border-0">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-violet-600">{stats.totalHistorial}</p>
            <p className="text-xs text-muted-foreground">Historial</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-0">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {Object.values(stats.recetasPorEstado).filter((_, i, arr) => arr[i] > 0).length || 0}
            </p>
            <p className="text-xs text-muted-foreground">Estados receta</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="turnos">
        <TabsList>
          <TabsTrigger value="turnos">
            <Calendar className="h-4 w-4 mr-1" /> Turnos ({turnosList.length})
          </TabsTrigger>
          <TabsTrigger value="recetas">
            <Syringe className="h-4 w-4 mr-1" /> Recetas ({recetas.length})
          </TabsTrigger>
          <TabsTrigger value="historial">
            <Activity className="h-4 w-4 mr-1" /> Historial ({historial.length})
          </TabsTrigger>
          {paciente.notasMedicas && (
            <TabsTrigger value="notas">
              <FileText className="h-4 w-4 mr-1" /> Notas
            </TabsTrigger>
          )}
        </TabsList>

        {/* Turnos */}
        <TabsContent value="turnos" className="mt-4">
          {turnosList.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Sin turnos registrados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {turnosList.map((t) => (
                <Card key={t.id} className="hoverable:hover:bg-muted/30 transition-colors">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: `${getTurnoColor(t.estado)}15`,
                        color: getTurnoColor(t.estado),
                      }}
                    >
                      {formatDate(t.fechaHora, 'dd/MM')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {formatDate(t.fechaHora, "d 'de' MMMM, HH:mm")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.motivo || t.tipoConsulta} {t.medicoNombre && `· ${t.medicoNombre}`} · {t.duracionMinutos}min
                      </p>
                      {t.notasMedico && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5 italic">{t.notasMedico}</p>
                      )}
                    </div>
                    <Badge
                      style={{
                        backgroundColor: `${getTurnoColor(t.estado)}20`,
                        color: getTurnoColor(t.estado),
                        borderColor: `${getTurnoColor(t.estado)}40`,
                      }}
                      variant="outline"
                    >
                      {getTurnoLabel(t.estado)}
                    </Badge>
                    {(t.estado === 'pendiente' || t.estado === 'confirmada') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => handleEstadoTurno(t.id, 'atendido')}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Atendido
                      </Button>
                    )}
                    {t.estado !== 'cancelada' && t.estado !== 'atendido' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 text-destructive"
                        onClick={() => handleEstadoTurno(t.id, 'cancelada')}
                      >
                        <XCircle className="h-3 w-3 mr-1" /> Cancelar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Recetas */}
        <TabsContent value="recetas" className="mt-4">
          {recetas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Syringe className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Sin recetas registradas</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recetas.map((r) => (
                <Card key={r.id} className="hoverable:hover:bg-muted/30 transition-colors">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Syringe className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{r.medicamento}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.dosis} · {r.duracion || r.frecuencia}
                        {r.medicoNombre && ` · ${r.medicoNombre}`}
                      </p>
                      {r.indicaciones && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5 italic">{r.indicaciones}</p>
                      )}
                    </div>
                    <div className="text-right text-xs">
                      <Badge className={getEstadoRecetaColor(r.estado)}>
                        {r.estado}
                      </Badge>
                      {r.fechaInicio && (
                        <p className="text-muted-foreground mt-1">
                          {formatDate(r.fechaInicio, 'dd/MM/yy')}
                          {r.fechaFin && ` - ${formatDate(r.fechaFin, 'dd/MM/yy')}`}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Historial */}
        <TabsContent value="historial" className="mt-4">
          {historial.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Sin entradas en el historial</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {historial.map((h) => {
                const Icon = getHistorialIcon(h.tipo);
                return (
                  <Card key={h.id} className="hoverable:hover:bg-muted/30 transition-colors">
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{h.titulo}</p>
                          <Badge variant="outline" className="text-[10px]">{h.tipo}</Badge>
                        </div>
                        {h.descripcion && (
                          <p className="text-xs text-muted-foreground mt-1">{h.descripcion}</p>
                        )}
                        {h.diagnosticoCodigo && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5 font-mono">
                            {h.diagnosticoCodigo} {h.diagnosticoDescripcion && `— ${h.diagnosticoDescripcion}`}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">
                        {formatDate(h.fecha, 'dd/MM/yy')}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Notas médicas */}
        {paciente.notasMedicas && (
          <TabsContent value="notas" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Edit3 className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium mb-2">Notas del medico</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {paciente.notasMedicas}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Info extra */}
      {ultimaConversacion && (
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Conversacion activa</p>
                <p className="text-xs text-muted-foreground">
                  Ultima interaccion: {formatDate(ultimaConversacion.estado === 'activa' ? paciente.createdAt : '', "d 'de' MMMM, HH:mm")}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/conversaciones`)}
            >
              <MessageSquare className="h-4 w-4 mr-2" /> Ver conversacion
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
