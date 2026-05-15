'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, ChevronLeft, ChevronRight, Filter, List } from 'lucide-react';
import { getTurnoColor, getTurnoLabel } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarView, type CalendarioTurno } from '@/components/calendar/calendar-view';
import { NuevoTurnoModal } from '@/components/modals/nuevo-turno-modal';

// Mock data extendida con fechas
const hoy = new Date();
const hoyStr = hoy.toISOString().split('T')[0];
const mananaStr = new Date(hoy.getTime() + 86400000).toISOString().split('T')[0];

const turnosDelDia = [
  { id: '1', hora: '09:00', paciente: 'Juan Pérez', tipo: 'Consulta Médica', medico: 'Dr. García', estado: 'confirmada', fecha: hoyStr },
  { id: '2', hora: '09:30', paciente: 'María Rodríguez', tipo: 'Control', medico: 'Dr. García', estado: 'pendiente', fecha: hoyStr },
  { id: '3', hora: '10:30', paciente: 'Pedro Sánchez', tipo: 'Resultados', medico: 'Dra. López', estado: 'confirmada', fecha: hoyStr },
  { id: '4', hora: '11:00', paciente: 'Ana López', tipo: 'Consulta', medico: 'Dr. García', estado: 'en_consulta', fecha: hoyStr },
  { id: '5', hora: '12:00', paciente: 'Carlos Ruiz', tipo: 'Especialista', medico: 'Dra. López', estado: 'pendiente', fecha: hoyStr },
  { id: '6', hora: '15:30', paciente: 'Laura Martínez', tipo: 'Control', medico: 'Dr. García', estado: 'confirmada', fecha: hoyStr },
  { id: '7', hora: '16:00', paciente: 'Sofía Herrera', tipo: 'Primera vez', medico: 'Dra. López', estado: 'cancelada', fecha: hoyStr },
  { id: '8', hora: '17:00', paciente: 'Diego Torres', tipo: 'Consulta', medico: 'Dr. García', estado: 'pendiente', fecha: hoyStr },
  { id: '9', hora: '10:00', paciente: 'Elena Martínez', tipo: 'Control', medico: 'Dr. García', estado: 'confirmada', fecha: mananaStr },
  { id: '10', hora: '11:30', paciente: 'Roberto Fernández', tipo: 'Primera vez', medico: 'Dra. López', estado: 'pendiente', fecha: mananaStr },
];

export default function TurnosPage() {
  const [view, setView] = useState<'lista' | 'calendario'>('lista');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showNewTurno, setShowNewTurno] = useState(false);
  const [turnos, setTurnos] = useState(turnosDelDia);

  const filteredByDate = turnos.filter((t) => {
    const tDate = new Date(t.fecha);
    return (
      tDate.getFullYear() === selectedDate.getFullYear() &&
      tDate.getMonth() === selectedDate.getMonth() &&
      tDate.getDate() === selectedDate.getDate()
    );
  });

  const navigateDate = (delta: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + delta);
    setSelectedDate(newDate);
  };

  const goToToday = () => setSelectedDate(new Date());

  const handleNuevoTurno = (data: { paciente: string; tipo: string; medico: string; hora: string; fecha: string }) => {
    const newTurno = {
      id: String(Date.now()),
      hora: data.hora,
      paciente: data.paciente,
      tipo: data.tipo,
      medico: data.medico,
      estado: 'pendiente' as const,
      fecha: data.fecha || hoyStr,
    };
    setTurnos((prev) => [newTurno, ...prev]);
  };

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
          <Button onClick={() => setShowNewTurno(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Turno
          </Button>
        </div>
      </div>

      {/* Navegación de fecha (solo en vista lista) */}
      {view === 'lista' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold min-w-[200px] text-center">
              {selectedDate.toLocaleDateString('es-AR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </h3>
            <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="ml-2" onClick={goToToday}>
              Hoy
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-1" />
              Filtros
            </Button>
          </div>
        </div>
      )}

      {/* Vista de Lista */}
      {view === 'lista' && (
        <Card>
          <CardContent className="p-0">
            {filteredByDate.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Sin turnos para esta fecha</p>
                <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
                  No hay turnos agendados para este día
                </p>
                <Button onClick={() => setShowNewTurno(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Turno
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {filteredByDate
                  .sort((a, b) => a.hora.localeCompare(b.hora))
                  .map((turno) => (
                    <div
                      key={turno.id}
                      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer border-l-4"
                      style={{ borderLeftColor: getTurnoColor(turno.estado) }}
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
                        style={{
                          backgroundColor: `${getTurnoColor(turno.estado)}20`,
                          color: getTurnoColor(turno.estado),
                          borderColor: `${getTurnoColor(turno.estado)}40`,
                        }}
                        variant="outline"
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
            )}
          </CardContent>
        </Card>
      )}

      {/* Vista Calendario */}
      {view === 'calendario' && (
        <CalendarView
          turnos={turnos}
          onDateChange={setSelectedDate}
          onTurnoClick={(turno) => console.log('Turno clicked:', turno)}
        />
      )}

      {/* Leyenda de estados */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getTurnoColor('confirmada') }} /> Confirmada
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getTurnoColor('pendiente') }} /> Pendiente
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getTurnoColor('en_consulta') }} /> En consulta
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getTurnoColor('cancelada') }} /> Cancelada
        </span>
      </div>

      {/* Modal Nuevo Turno */}
      <NuevoTurnoModal
        open={showNewTurno}
        onOpenChange={setShowNewTurno}
        onSubmit={handleNuevoTurno}
      />
    </div>
  );
}
