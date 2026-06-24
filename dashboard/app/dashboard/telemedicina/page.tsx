'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Users,
  Video,
  ExternalLink,
  Loader2,
  AlertCircle,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type TurnoEstado =
  | 'pendiente'
  | 'confirmada'
  | 'en_atencion'
  | 'atendido'
  | 'cancelada'
  | 'no_asistio';

interface TurnoVirtual {
  id: string;
  fecha: string;
  hora: string;
  paciente: string;
  pacienteId: string;
  tipo: string;
  tipoConsulta: 'virtual' | 'presencial' | 'telefonica';
  medico: string;
  medicoId: string;
  estado: TurnoEstado;
  linkVideollamada?: string;
  motivo?: string;
  duracionMinutos?: number;
  inicioAtencionAt?: string;
}

type FiltroEstado = 'todos' | 'proximos' | 'en_curso' | 'finalizados';

export default function TelemedicinaPage() {
  const [turnos, setTurnos] = useState<TurnoVirtual[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('proximos');
  const [filtroMedico, setFiltroMedico] = useState<string | null>(null);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const fetchTurnos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('tipo', 'virtual');
      params.set('limit', '200');

      if (filtroMedico) params.set('medico', filtroMedico);
      if (fechaDesde) params.set('fecha_desde', fechaDesde);
      if (fechaHasta) params.set('fecha_hasta', fechaHasta);

      const res = await fetch(`/api/turnos?${params.toString()}`);
      if (!res.ok) throw new Error('Error al cargar turnos virtuales');
      const data = await res.json();
      setTurnos(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los turnos virtuales',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTurnos();
  }, [filtroMedico, fechaDesde, fechaHasta]);

  // Filtrar por estado
  const ahora = new Date();
  const turnosFiltrados = turnos
    .filter((t) => {
      const turnoFecha = new Date(`${t.fecha}T${t.hora}:00`);

      switch (filtroEstado) {
        case 'proximos':
          return turnoFecha >= ahora && (t.estado === 'pendiente' || t.estado === 'confirmada');
        case 'en_curso':
          return t.estado === 'en_atencion';
        case 'finalizados':
          return t.estado === 'atendido' || t.estado === 'cancelada' || t.estado === 'no_asistio';
        default:
          return true;
      }
    })
    .sort((a, b) => {
      const fechaA = new Date(`${a.fecha}T${a.hora}:00`).getTime();
      const fechaB = new Date(`${b.fecha}T${b.hora}:00`).getTime();
      return filtroEstado === 'finalizados' ? fechaB - fechaA : fechaA - fechaB;
    });

  const medicos = Array.from(new Set(turnos.map((t) => t.medico))).sort();

  const abrirVideollamada = (turno: TurnoVirtual) => {
    if (turno.linkVideollamada) {
      window.open(turno.linkVideollamada, '_blank');
    } else {
      toast({
        title: 'Link no disponible',
        description: 'La sala de videollamada aún no se ha generado',
        variant: 'destructive',
      });
    }
  };

  const getEstadoBadge = (estado: TurnoEstado) => {
    const config: Record<TurnoEstado, { label: string; color: string; bg: string }> = {
      pendiente: {
        label: 'Pendiente',
        color: 'text-amber-700',
        bg: 'bg-amber-100 dark:bg-amber-900/30',
      },
      confirmada: {
        label: 'Confirmada',
        color: 'text-emerald-700',
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      },
      en_atencion: {
        label: 'En atención',
        color: 'text-blue-700',
        bg: 'bg-blue-100 dark:bg-blue-900/30',
      },
      atendido: {
        label: 'Atendido',
        color: 'text-emerald-700',
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      },
      cancelada: { label: 'Cancelada', color: 'text-red-700', bg: 'bg-red-100 dark:bg-red-900/30' },
      no_asistio: {
        label: 'No asistió',
        color: 'text-purple-700',
        bg: 'bg-purple-100 dark:bg-purple-900/30',
      },
    };
    return config[estado];
  };

  const formatearFecha = (fechaStr: string) => {
    try {
      return format(new Date(`${fechaStr}T00:00:00`), "EEEE d 'de' MMMM", { locale: es });
    } catch {
      return fechaStr;
    }
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <PageHeader title="Telemedicina" description="Gestión de videoconsultas virtuales" gradient />

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Filtro por estado */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 h-9 min-w-[160px] justify-between"
                onClick={() => setFiltroEstado(filtroEstado === 'todos' ? 'proximos' : 'todos')}
              >
                <Filter className="h-4 w-4" />
                <span>
                  {filtroEstado === 'todos'
                    ? 'Todos'
                    : filtroEstado === 'proximos'
                      ? 'Próximos'
                      : filtroEstado === 'en_curso'
                        ? 'En curso'
                        : 'Finalizados'}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Filtro por médico */}
            {medicos.length > 0 && (
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 h-9 min-w-[160px] justify-between"
                >
                  <Users className="h-4 w-4" />
                  <span>{filtroMedico ? filtroMedico : 'Todos los médicos'}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Filtro por fecha */}
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="h-9 px-3 text-sm border rounded-lg bg-background"
                title="Fecha desde"
              />
              <span className="text-muted-foreground">a</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="h-9 px-3 text-sm border rounded-lg bg-background"
                title="Fecha hasta"
              />
            </div>

            <Button variant="ghost" size="sm" onClick={fetchTurnos} disabled={loading}>
              <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Próximos',
            count: turnos.filter(
              (t) =>
                new Date(`${t.fecha}T${t.hora}:00`) >= ahora &&
                (t.estado === 'pendiente' || t.estado === 'confirmada'),
            ).length,
            color: 'amber',
          },
          {
            label: 'En curso',
            count: turnos.filter((t) => t.estado === 'en_atencion').length,
            color: 'blue',
          },
          {
            label: 'Atendidos',
            count: turnos.filter((t) => t.estado === 'atendido').length,
            color: 'emerald',
          },
          {
            label: 'Cancelados',
            count: turnos.filter((t) => t.estado === 'cancelada' || t.estado === 'no_asistio')
              .length,
            color: 'red',
          },
        ].map((stat, i) => (
          <Card
            key={i}
            className="border-primary/10 bg-gradient-to-br from-primary/[0.03] to-transparent"
          >
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.count}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
              <div
                className={`h-10 w-10 rounded-full bg-${stat.color}-100 dark:bg-${stat.color}-900/30 flex items-center justify-center`}
              >
                <Video className={`h-5 w-5 text-${stat.color}-600 dark:text-${stat.color}-400`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lista de turnos virtuales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Turnos Virtuales ({turnosFiltrados.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Cargando videoconsultas...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <AlertCircle className="h-10 w-10 text-destructive mb-3" />
              <p className="text-destructive font-medium">Error al cargar</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={fetchTurnos}>
                Reintentar
              </Button>
            </div>
          ) : turnosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Video className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">
                {filtroEstado === 'proximos'
                  ? 'No hay videoconsultas próximas'
                  : 'No hay turnos en este estado'}
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Los turnos virtuales aparecen aquí automáticamente al crearlos con modalidad
                "Virtual"
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {turnosFiltrados.map((turno) => {
                const estadoConfig = getEstadoBadge(turno.estado);
                const turnoFecha = new Date(`${turno.fecha}T${turno.hora}:00`);
                const esProximo =
                  turnoFecha >= ahora &&
                  (turno.estado === 'pendiente' || turno.estado === 'confirmada');
                const esEnCurso = turno.estado === 'en_atencion';
                const tieneLink = !!turno.linkVideollamada;

                return (
                  <div
                    key={turno.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-muted/30 transition-colors group"
                  >
                    {/* Info principal */}
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Hora + fecha */}
                      <div className="flex flex-col items-center sm:items-start text-center sm:text-left min-w-[100px]">
                        <span className="font-mono text-lg font-semibold text-foreground">
                          {turno.hora}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatearFecha(turno.fecha)}
                        </span>
                      </div>

                      {/* Separador vertical */}
                      <div className="hidden sm:block w-px h-8 bg-border mx-2" />

                      {/* Paciente + médico + modalidad */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{turno.paciente}</p>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          >
                            <Video className="h-2.5 w-2.5 mr-1" />
                            Virtual
                          </Badge>
                          {turno.estado === 'en_atencion' && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse"
                            >
                              En vivo
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          Dr/a. {turno.medico} · {turno.tipo || 'Consulta'}
                          {turno.motivo && ` · ${turno.motivo}`}
                        </p>
                      </div>
                    </div>

                    {/* Estado + Acciones */}
                    <div className="flex items-center gap-3 shrink-0 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-xs font-medium ${estadoConfig.color} ${estadoConfig.bg} border-transparent`}
                      >
                        {estadoConfig.label}
                      </Badge>

                      {tieneLink && (esProximo || esEnCurso) && (
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => abrirVideollamada(turno)}
                          disabled={!esProximo && !esEnCurso}
                        >
                          <Video className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Unirse</span>
                        </Button>
                      )}

                      {!tieneLink && (esProximo || esEnCurso) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50"
                          disabled
                          title="La sala se genera automáticamente al crear el turno"
                        >
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Sin link</span>
                        </Button>
                      )}

                      {tieneLink && !esProximo && !esEnCurso && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-muted-foreground"
                          onClick={() => abrirVideollamada(turno)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Ver enlace</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info adicional */}
      <Card className="border-primary/10 bg-gradient-to-br from-primary/[0.03] to-transparent">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Video className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Cómo funciona la telemedicina</p>
              <ul className="list-disc list-inside space-y-0.5 text-[13px]">
                <li>
                  Los turnos con modalidad <strong>Virtual</strong> generan automáticamente una sala
                  LiveKit
                </li>
                <li>El paciente recibe el link por WhatsApp al agendar</li>
                <li>El médico accede desde esta página o desde el Kanban de Atención</li>
                <li>
                  No requiere instalar apps: funciona en navegador (Chrome, Firefox, Safari, Edge)
                </li>
                <li>Permisos de cámara y micrófono son obligatorios</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
