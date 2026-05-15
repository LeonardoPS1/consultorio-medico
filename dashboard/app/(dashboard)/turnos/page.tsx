'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, ChevronLeft, ChevronRight, Filter, List } from 'lucide-react';
import { getTurnoColor, getTurnoLabel, formatTime } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Mock data
const turnosDelDia = [
  { id: '1', hora: '09:00', paciente: 'Juan Pérez', tipo: 'Consulta Médica', medico: 'Dr. García', estado: 'confirmada' },
  { id: '2', hora: '09:30', paciente: 'María Rodríguez', tipo: 'Control', medico: 'Dr. García', estado: 'pendiente' },
  { id: '3', hora: '10:30', paciente: 'Pedro Sánchez', tipo: 'Resultados', medico: 'Dra. López', estado: 'confirmada' },
  { id: '4', hora: '11:00', paciente: 'Ana López', tipo: 'Consulta', medico: 'Dr. García', estado: 'en_consulta' },
  { id: '5', hora: '12:00', paciente: 'Carlos Ruiz', tipo: 'Especialista', medico: 'Dra. López', estado: 'pendiente' },
  { id: '6', hora: '15:30', paciente: 'Laura Martínez', tipo: 'Control', medico: 'Dr. García', estado: 'confirmada' },
  { id: '7', hora: '16:00', paciente: 'Sofía Herrera', tipo: 'Primera vez', medico: 'Dra. López', estado: 'cancelada' },
  { id: '8', hora: '17:00', paciente: 'Diego Torres', tipo: 'Consulta', medico: 'Dr. García', estado: 'pendiente' },
];

export default function TurnosPage() {
  const [view, setView] = useState<'lista' | 'calendario'>('lista');

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Turnos</h2>
          <p className="text-muted-foreground">
            Gestioná los turnos de tus pacientes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border p-1">
            <Button
              variant={view === 'lista' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('lista')}
            >
              <List className="h-4 w-4 mr-1" />
              Lista
            </Button>
            <Button
              variant={view === 'calendario' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('calendario')}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Calendario
            </Button>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Turno
          </Button>
        </div>
      </div>

      {/* Navegación de fecha */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[200px] text-center">
            {new Date().toLocaleDateString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h3>
          <Button variant="outline" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="ml-2">Hoy</Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" />
            Filtros
          </Button>
        </div>
      </div>

      {/* Vista de Lista */}
      {view === 'lista' && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {turnosDelDia.map((turno) => (
                <div
                  key={turno.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  {/* Hora */}
                  <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-primary/10 text-primary font-bold text-sm">
                    {turno.hora}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{turno.paciente}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {turno.tipo} · {turno.medico}
                    </p>
                  </div>

                  {/* Estado */}
                  <Badge
                    className={`
                      ${turno.estado === 'confirmada' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : ''}
                      ${turno.estado === 'pendiente' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : ''}
                      ${turno.estado === 'cancelada' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : ''}
                      ${turno.estado === 'en_consulta' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                    `}
                  >
                    {getTurnoLabel(turno.estado)}
                  </Badge>

                  {/* Acciones */}
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm">Editar</Button>
                    <Button variant="ghost" size="sm" className="text-destructive">Cancelar</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vista Calendario (placeholder con FullCalendar) */}
      {view === 'calendario' && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-96 bg-muted/30 rounded-xl border-2 border-dashed">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  Vista Calendario
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Integración con FullCalendar lista para conectar
                </p>
                <Button variant="outline" className="mt-4" disabled>
                  npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leyenda de estados */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Confirmada
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Pendiente
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500" /> En consulta
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" /> Cancelada
        </span>
      </div>
    </div>
  );
}
