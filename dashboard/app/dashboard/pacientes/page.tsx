'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Plus, Phone, Mail, Calendar, MessageSquare, ExternalLink } from 'lucide-react';
import { formatPhone, getInitials, formatDate } from '@/lib/utils';
import { NuevoPacienteModal } from '@/components/modals/nuevo-paciente-modal';

// Mock data
const pacientes = [
  { id: '1', nombre: 'Juan', apellido: 'Pérez', telefono: '+5491155550101', email: 'juan@email.com', ultimoTurno: '2026-05-14T10:00:00', totalTurnos: 12, tags: ['Obra Social'] },
  { id: '2', nombre: 'María', apellido: 'García', telefono: '+5491155550102', email: 'maria@email.com', ultimoTurno: '2026-05-10T09:00:00', totalTurnos: 8, tags: ['Particular'] },
  { id: '3', nombre: 'Pedro', apellido: 'Sánchez', telefono: '+5491155550103', email: 'pedro@email.com', ultimoTurno: '2026-05-12T11:00:00', totalTurnos: 3, tags: ['Obra Social', 'Crónico'] },
  { id: '4', nombre: 'Ana', apellido: 'López', telefono: '+5491155550104', email: 'ana@email.com', ultimoTurno: '2026-04-28T15:00:00', totalTurnos: 20, tags: ['Particular'] },
  { id: '5', nombre: 'Carlos', apellido: 'Ruiz', telefono: '+5491155550105', email: 'carlos@email.com', ultimoTurno: null, totalTurnos: 0, tags: ['Nuevo'] },
  { id: '6', nombre: 'Laura', apellido: 'Martínez', telefono: '+5491155550106', email: 'laura@email.com', ultimoTurno: '2026-05-13T16:30:00', totalTurnos: 5, tags: ['Particular'] },
  { id: '7', nombre: 'Sofía', apellido: 'Herrera', telefono: '+5491155550107', email: 'sofia@email.com', ultimoTurno: '2026-05-08T11:00:00', totalTurnos: 15, tags: ['Obra Social'] },
  { id: '8', nombre: 'Diego', apellido: 'Torres', telefono: '+5491155550108', email: 'diego@email.com', ultimoTurno: null, totalTurnos: 0, tags: ['Nuevo'] },
];

export default function PacientesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [showNewPaciente, setShowNewPaciente] = useState(false);
  const [pacientesList, setPacientesList] = useState(pacientes);

  const filtered = pacientesList.filter(
    (p) =>
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.apellido.toLowerCase().includes(search.toLowerCase()) ||
      p.telefono.includes(search)
  );

  const handleNuevoPaciente = (data: { nombre: string; apellido: string; telefono: string; email: string; obraSocial: string }) => {
    const newPaciente = {
      id: String(Date.now()),
      nombre: data.nombre,
      apellido: data.apellido,
      telefono: data.telefono,
      email: data.email,
      ultimoTurno: null,
      totalTurnos: 0,
      tags: [data.obraSocial === 'Particular' ? 'Particular' : 'Obra Social'],
    };
    setPacientesList((prev) => [newPaciente, ...prev]);
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pacientes</h2>
          <p className="text-muted-foreground">
            Historial y datos de tus pacientes
          </p>
        </div>
        <Button onClick={() => setShowNewPaciente(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Paciente
        </Button>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, apellido o teléfono..."
          className="pl-9 h-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-primary/5 p-3 text-center">
          <p className="text-2xl font-bold text-primary">{pacientesList.length}</p>
          <p className="text-xs text-muted-foreground">Total pacientes</p>
        </div>
        <div className="rounded-lg bg-emerald-500/5 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{pacientesList.filter(p => p.totalTurnos > 0).length}</p>
          <p className="text-xs text-muted-foreground">Con turnos</p>
        </div>
        <div className="rounded-lg bg-amber-500/5 p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{pacientesList.filter(p => !p.ultimoTurno).length}</p>
          <p className="text-xs text-muted-foreground">Nuevos</p>
        </div>
      </div>

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                {search ? 'No se encontraron pacientes' : 'No hay pacientes registrados'}
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
                {search ? 'Probá con otros términos de búsqueda' : 'Registrá tu primer paciente'}
              </p>
              {!search && (
                <Button onClick={() => setShowNewPaciente(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Paciente
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((paciente) => (
                <div
                  key={paciente.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/pacientes/${paciente.id}`)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getInitials(paciente.nombre, paciente.apellido)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {paciente.nombre} {paciente.apellido}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {formatPhone(paciente.telefono)}
                      </span>
                      {paciente.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {paciente.email}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="hidden md:block text-sm text-muted-foreground text-center">
                    <p className="font-medium text-foreground">{paciente.totalTurnos}</p>
                    <p className="text-xs">turnos</p>
                  </div>

                  <div className="hidden md:block text-sm text-muted-foreground min-w-[80px]">
                    {paciente.ultimoTurno ? (
                      <>
                        <p className="text-xs">Último turno</p>
                        <p>{formatDate(paciente.ultimoTurno, 'dd/MM/yy')}</p>
                      </>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Nuevo
                      </Badge>
                    )}
                  </div>

                  <div className="hidden lg:flex gap-1">
                    {paciente.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Enviar WhatsApp"
                      onClick={() => router.push(`/dashboard/conversaciones`)}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Ver ficha completa"
                      onClick={() => router.push(`/dashboard/pacientes/${paciente.id}`)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Nuevo Paciente */}
      <NuevoPacienteModal
        open={showNewPaciente}
        onOpenChange={setShowNewPaciente}
        onSubmit={handleNuevoPaciente}
      />
    </div>
  );
}
