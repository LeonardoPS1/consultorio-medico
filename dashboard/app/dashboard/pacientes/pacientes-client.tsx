'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Search,
  Plus,
  Phone,
  Mail,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { formatPhone, getInitials, formatDate } from '@/lib/utils';
import { NuevoPacienteModal } from '@/components/modals/nuevo-paciente-modal';

// ─── Types ────────────────────────────────────────────────

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string | null;
  obraSocial: string | null;
  tags: string[];
  ultimoTurno: string | null;
  totalTurnos: number;
}

interface PacientesClientProps {
  initialPacientes: Paciente[];
}

// ─── Component ─────────────────────────────────────────────

export function PacientesClient({ initialPacientes }: PacientesClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [showNewPaciente, setShowNewPaciente] = useState(false);
  const [pacientesList, setPacientesList] =
    useState<Paciente[]>(initialPacientes);

  const filtered = useMemo(
    () =>
      pacientesList.filter(
        (p) =>
          p.nombre.toLowerCase().includes(search.toLowerCase()) ||
          p.apellido.toLowerCase().includes(search.toLowerCase()) ||
          p.telefono.includes(search),
      ),
    [pacientesList, search],
  );

  const handleNuevoPaciente = (data: {
    nombre: string;
    apellido: string;
    telefono: string;
    email: string;
    obraSocial: string;
  }) => {
    const newPaciente: Paciente = {
      id: String(Date.now()),
      nombre: data.nombre,
      apellido: data.apellido,
      telefono: data.telefono,
      email: data.email,
      ultimoTurno: null,
      totalTurnos: 0,
      obraSocial:
        data.obraSocial === 'Particular' ? null : data.obraSocial,
      tags: [data.obraSocial === 'Particular' ? 'Particular' : 'Obra Social'],
    };
    setPacientesList((prev) => [newPaciente, ...prev]);
  };

  return (
    <>
      {/* Búsqueda + botón nuevo */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, apellido o teléfono..."
            className="pl-9 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => setShowNewPaciente(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Paciente
        </Button>
      </div>

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                {search
                  ? 'No se encontraron pacientes'
                  : 'No hay pacientes registrados'}
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
                {search
                  ? 'Probá con otros términos de búsqueda'
                  : 'Registrá tu primer paciente'}
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
                  className="flex items-center gap-4 p-4 hoverable:hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() =>
                    router.push(`/dashboard/pacientes/${paciente.id}`)
                  }
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
                    <p className="font-medium text-foreground">
                      {paciente.totalTurnos}
                    </p>
                    <p className="text-xs">turnos</p>
                  </div>

                  <div className="hidden md:block text-sm text-muted-foreground min-w-[80px]">
                    {paciente.ultimoTurno ? (
                      <>
                        <p className="text-xs">Último turno</p>
                        <p>{formatDate(paciente.ultimoTurno, 'dd/MM/yy')}</p>
                      </>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                      >
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
                      onClick={() =>
                        router.push(`/dashboard/pacientes/${paciente.id}`)
                      }
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
    </>
  );
}
