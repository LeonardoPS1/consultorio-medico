'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSucursal } from '@/lib/sucursal-context';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Search,
  Plus,
  Phone,
  Mail,
  MessageSquare,
  ExternalLink,
  FileSpreadsheet,
  FileDown,
  Loader2,
  Syringe,
} from 'lucide-react';

import { formatPhone, getInitials, formatDate } from '@/lib/utils';
import { NuevoPacienteModal } from '@/components/modals/nuevo-paciente-modal';
import { toast } from '@/components/ui/use-toast';

// ─── Types ────────────────────────────────────────────────

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string | null;
  obraSocial: string | null;
  sistemaSalud?: string | null;
  isapreNombre?: string | null;
  tags: string[];
  ultimoTurno: string | null;
  totalTurnos: number;
}

interface PacientesClientProps {
  initialPacientes: Paciente[];
}

// ─── Component ─────────────────────────────────────────────

export function PacientesClient({ initialPacientes }: PacientesClientProps) {
  const { sucursalId } = useSucursal();
  const [search, setSearch] = useState('');
  const [showNewPaciente, setShowNewPaciente] = useState(false);
  const [pacientesList, setPacientesList] =
    useState<Paciente[]>(initialPacientes);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Búsqueda debounced vía API
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (!search.trim()) {
        // Sin búsqueda, restaurar lista inicial
        setPacientesList(initialPacientes);
        setSearching(false);
        return;
      }
      setSearching(true);
      try {
        const params = new URLSearchParams({ search, limit: '100' });
        if (sucursalId) params.set('sucursalId', sucursalId);
        const res = await fetch(`/api/pacientes?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setPacientesList(json.data || []);
        }
      } catch {
        // fallback silencioso
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, sucursalId, initialPacientes]);

  const filtered = useMemo(
    () =>
      !search.trim()
        ? pacientesList
        : pacientesList.filter(
            (p) =>
              p.nombre.toLowerCase().includes(search.toLowerCase()) ||
              p.apellido.toLowerCase().includes(search.toLowerCase()) ||
              p.telefono.includes(search) ||
              (p.email && p.email.toLowerCase().includes(search.toLowerCase())) ||
              (p.obraSocial && p.obraSocial.toLowerCase().includes(search.toLowerCase())) ||
              (p.sistemaSalud && p.sistemaSalud.toLowerCase().includes(search.toLowerCase())) ||
              (p.isapreNombre && p.isapreNombre.toLowerCase().includes(search.toLowerCase())),
          ),
    [pacientesList, search],
  );

  const handleNuevoPaciente = async (data: {
    nombre: string;
    apellido: string;
    telefono: string;
    email: string;
    dni?: string | null;
    obraSocial: string;
    sistemaSalud?: string;
    isapreNombre?: string;
    regionId?: string;
    comunaId?: string;
  }) => {
    try {
      const res = await fetch('/api/pacientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, sucursalId }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({
          title: 'Error',
          description: err.error || 'No se pudo crear el paciente',
          variant: 'destructive',
        });
        return;
      }
      const json = await res.json();
      const created = json.data;
      const newPaciente: Paciente = {
        id: created.id,
        nombre: created.nombre,
        apellido: created.apellido,
        telefono: created.telefono,
        email: created.email,
        ultimoTurno: null,
        totalTurnos: 0,
        obraSocial: created.obraSocial,
        sistemaSalud: created.sistemaSalud,
        isapreNombre: created.isapreNombre,
        tags: Array.isArray(created.tags) ? created.tags : [],
      };
      setPacientesList((prev) => [newPaciente, ...prev]);
      toast({ title: 'Paciente creado', description: `${created.nombre} ${created.apellido}` });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de red al crear paciente',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      {/* Búsqueda + botón nuevo */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          )}
          <Input
            placeholder="Buscar por nombre, apellido, teléfono o email..."
            className="pl-9 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {/* Export buttons */}
        <Button
          variant="outline"
          size="icon"
          title="Exportar Excel"
          onClick={() => window.open('/api/pacientes/exportar?formato=excel', '_blank')}
        >
          <FileSpreadsheet className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          title="Exportar PDF"
          onClick={() => window.open('/api/pacientes/exportar?formato=pdf', '_blank')}
        >
          <FileDown className="h-4 w-4" />
        </Button>
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
                  ? 'Prueba con otros términos de búsqueda'
                  : 'Registra tu primer paciente'}
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
                <Link
                  key={paciente.id}
                  href={`/dashboard/pacientes/${paciente.id}`}
                  className="flex items-center gap-4 p-4 hoverable:hover:bg-muted/50 transition-colors no-underline"
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

                  <div className="flex gap-1" onClick={(e) => e.preventDefault()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Recetas"
                      asChild
                    >
                      <Link href={`/dashboard/pacientes/${paciente.id}`}>
                        <Syringe className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Enviar WhatsApp"
                      asChild
                    >
                      <Link href={`/dashboard/conversaciones`}>
                        <MessageSquare className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Ver ficha completa"
                      asChild
                    >
                      <Link href={`/dashboard/pacientes/${paciente.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </Link>
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
