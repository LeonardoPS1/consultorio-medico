'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { PageAnimation } from '@/components/dashboard/page-animation';
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
  CheckCheck,
  Send,
  X,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

import { formatPhone, getInitials, formatDate } from '@/lib/utils';
import { NuevoPacienteModal } from '@/components/modals/nuevo-paciente-modal';
import { EditarPacienteModal } from '@/components/modals/editar-paciente-modal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';

// ─── Types ────────────────────────────────────────────────

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string | null;
  obraSocial: string | null;
  sistemaSalud: string | null;
  isapreNombre: string | null;
  tags: string[];
  ultimoTurno: string | null;
  totalTurnos: number;
}

interface PacienteEditData {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string | null;
  dni: string | null;
  fechaNacimiento: string | null;
  direccion: string | null;
  obraSocial: string | null;
  sistemaSalud: string | null;
  isapreNombre: string | null;
  regionId: string | null;
  comunaId: string | null;
}

interface PacientesClientProps {
  initialPacientes: Paciente[];
}

// ─── Component ─────────────────────────────────────────────

export function PacientesClient({ initialPacientes }: PacientesClientProps) {
  const { sucursalId } = useSucursal();
  const [search, setSearch] = useState('');
  const [showNewPaciente, setShowNewPaciente] = useState(false);
  const [showEditPaciente, setShowEditPaciente] = useState(false);
  const [editPacienteData, setEditPacienteData] = useState<PacienteEditData | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [pacientesList, setPacientesList] = useState<Paciente[]>(initialPacientes);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [scoresMap, setScoresMap] = useState<Record<string, { score: number; nivel: string }>>({});

  // ─── Selección múltiple (estado puro) ──────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkWhatsApp, setShowBulkWhatsApp] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');
  const [sendingBulk, setSendingBulk] = useState(false);

  const handleOpenEdit = async (pacienteId: string) => {
    setLoadingEdit(true);
    try {
      const res = await fetch(`/api/pacientes/${pacienteId}`);
      if (!res.ok) throw new Error('Error al obtener datos del paciente');
      const json = await res.json();
      const p = json.data || json;
      setEditPacienteData({
        id: p.id,
        nombre: p.nombre,
        apellido: p.apellido,
        telefono: p.telefono,
        email: p.email,
        dni: p.dni,
        fechaNacimiento: p.fechaNacimiento,
        direccion: p.direccion,
        obraSocial: p.obraSocial,
        sistemaSalud: p.sistemaSalud,
        isapreNombre: p.isapreNombre,
        regionId: p.regionId,
        comunaId: p.comunaId,
      });
      setShowEditPaciente(true);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo cargar el paciente',
        variant: 'destructive',
      });
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleEditSaved = (updated: PacienteEditData) => {
    setPacientesList((prev) =>
      prev.map((p) =>
        p.id === updated.id
          ? {
              ...p,
              nombre: updated.nombre,
              apellido: updated.apellido,
              telefono: updated.telefono,
              email: updated.email,
              obraSocial: updated.obraSocial,
              sistemaSalud: updated.sistemaSalud,
              isapreNombre: updated.isapreNombre,
            }
          : p,
      ),
    );
    toast({ title: 'Paciente actualizado', description: `${updated.nombre} ${updated.apellido}` });
  };

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

  // Fetch scoring para pacientes visibles
  useEffect(() => {
    const visibleIds = filtered.map((p) => p.id);
    if (visibleIds.length === 0) return;
    const params = new URLSearchParams({ ids: visibleIds.join(',') });
    fetch(`/api/pacientes/scoring?${params.toString()}`)
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
      .catch(() => {
        /* silencioso */
      });
  }, [filtered]);

  // ─── Selección múltiple (helpers) ──────────────────────────
  const selectedArray = useMemo(
    () => filtered.filter((p) => selectedIds.has(p.id)),
    [filtered, selectedIds],
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkWhatsApp = async () => {
    if (!bulkMessage.trim() || selectedArray.length === 0) return;
    setSendingBulk(true);
    try {
      const res = await fetch('/api/whatsapp/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteIds: selectedArray.map((p) => p.id),
          mensaje: bulkMessage.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({
          title: 'Error',
          description: err.error || 'Error al enviar',
          variant: 'destructive',
        });
        return;
      }
      const json = await res.json();
      toast({
        title: 'WhatsApp enviado',
        description: `${json.data.enviados} enviados, ${json.data.fallidos} fallidos de ${json.data.total}`,
      });
      setShowBulkWhatsApp(false);
      setBulkMessage('');
      clearSelection();
    } catch {
      toast({
        title: 'Error',
        description: 'Error de red al enviar WhatsApp',
        variant: 'destructive',
      });
    } finally {
      setSendingBulk(false);
    }
  };

  const handleBulkExport = () => {
    const params = new URLSearchParams();
    selectedArray.forEach((p) => params.append('ids', p.id));
    window.open(`/api/pacientes/exportar?formato=excel&${params.toString()}`, '_blank');
  };

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
    <PageAnimation>
      {/* Búsqueda + botón nuevo */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
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
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {/* Export buttons — solo desktop */}
          <div className="hidden sm:flex items-center gap-2">
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
          </div>
          <Button onClick={() => setShowNewPaciente(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Nuevo Paciente</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
      </div>

      {/* Toolbar de selección múltiple */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-sm">
          <CheckCheck className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium">
            {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={clearSelection} className="h-8 text-xs">
            <X className="h-3 w-3 mr-1" />
            Limpiar
          </Button>
          <Button variant="outline" size="sm" onClick={handleBulkExport} className="h-8 text-xs">
            <FileSpreadsheet className="h-3 w-3 mr-1" />
            Exportar
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowBulkWhatsApp(true)}
            className="h-8 text-xs"
          >
            <Send className="h-3 w-3 mr-1" />
            WhatsApp
          </Button>
        </div>
      )}

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
                {search ? 'Prueba con otros términos de búsqueda' : 'Registra tu primer paciente'}
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
              {/* Select All header */}
              <div className="flex items-center gap-4 px-4 py-2 text-xs text-muted-foreground border-b">
                <Checkbox
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Seleccionar todo"
                />
                <span>
                  {selectedIds.size === filtered.length
                    ? 'Todos seleccionados'
                    : `${filtered.length} pacientes`}
                </span>
              </div>
              {filtered.map((paciente) => (
                <div
                  key={paciente.id}
                  className={`flex items-center gap-4 p-4 transition-colors ${
                    selectedIds.has(paciente.id) ? 'bg-primary/5' : ''
                  }`}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(paciente.id)}
                      onCheckedChange={() => toggleSelect(paciente.id)}
                      aria-label={`Seleccionar ${paciente.nombre} ${paciente.apellido}`}
                    />
                  </div>
                  <Link
                    href={`/dashboard/pacientes/${paciente.id}`}
                    className="flex items-center gap-4 flex-1 min-w-0 no-underline hoverable:hover:opacity-80"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(paciente.nombre, paciente.apellido)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate flex items-center gap-1.5">
                        {paciente.nombre} {paciente.apellido}
                        {scoresMap[paciente.id] && (
                          <span
                            className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                              scoresMap[paciente.id].nivel === 'alto'
                                ? 'bg-red-500'
                                : scoresMap[paciente.id].nivel === 'medio'
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                            }`}
                            title={`Score: ${scoresMap[paciente.id].score} - Riesgo ${scoresMap[paciente.id].nivel}`}
                          />
                        )}
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
                        title="Editar paciente"
                        disabled={loadingEdit}
                        onClick={() => handleOpenEdit(paciente.id)}
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                          />
                        </svg>
                      </Button>
                      <Button variant="ghost" size="icon" title="Recetas" asChild>
                        <Link href={`/dashboard/pacientes/${paciente.id}`}>
                          <Syringe className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" title="Enviar WhatsApp" asChild>
                        <Link href={`/dashboard/conversaciones`}>
                          <MessageSquare className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" title="Ver ficha completa" asChild>
                        <Link href={`/dashboard/pacientes/${paciente.id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </Link>
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

      {/* Modal Editar Paciente */}
      {editPacienteData && (
        <EditarPacienteModal
          open={showEditPaciente}
          onOpenChange={setShowEditPaciente}
          paciente={editPacienteData}
          onSaved={handleEditSaved}
        />
      )}

      {/* Modal WhatsApp Masivo */}
      <Dialog open={showBulkWhatsApp} onOpenChange={setShowBulkWhatsApp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar WhatsApp masivo</DialogTitle>
            <DialogDescription>
              Se enviará un mensaje a {selectedArray.length} paciente
              {selectedArray.length !== 1 ? 's' : ''}. Usá {'{nombre}'} para personalizar con el
              nombre del paciente.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Escribí tu mensaje... Ej: Hola {nombre}, recordamos su próximo turno..."
            className="min-h-[120px]"
            value={bulkMessage}
            onChange={(e) => setBulkMessage(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkWhatsApp(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBulkWhatsApp} disabled={!bulkMessage.trim() || sendingBulk}>
              {sendingBulk ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar a {selectedArray.length} paciente{selectedArray.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageAnimation>
  );
}
