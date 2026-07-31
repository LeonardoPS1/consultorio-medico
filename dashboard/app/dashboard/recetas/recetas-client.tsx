'use client';

import {
  Plus,
  Syringe,
  Download,
  Send,
  AlertCircle,
  RotateCcw,
  FileText,
  Printer,
  MoreHorizontal,
  FileSpreadsheet,
  FileDown,
  Trash2,
  X,
  Loader2,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { PageAnimation } from '@/components/dashboard/page-animation';
import { NuevaRecetaModal } from '@/components/modals/nueva-receta-modal';
import { PacienteSearchCombobox } from '@/components/pacientes/paciente-search-combobox';
import { RecetaPreviewDialog } from '@/components/recetas/receta-preview-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import {
  descargarReceta,
  enviarRecetaWhatsApp,
  imprimirReceta,
  type RecetaLike,
} from '@/lib/receta-pdf';
import { playDelete } from '@/lib/sound';
import { formatDate } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────

interface Receta {
  id: string;
  paciente: string;
  medicamento: string;
  dosis: string;
  duracion: string;
  estado: 'activa' | 'vencida' | 'historial';
  vence: string;
  renovable: boolean;
  fechaCreacion: string;
  indicaciones?: string;
}

interface RecetasClientProps {
  initialRecetas: Receta[];
}

// ─── Component ─────────────────────────────────────────────

/**
 *
 * @param root0
 * @param root0.initialRecetas
 */
export function RecetasClient({ initialRecetas }: RecetasClientProps) {
  const [recetas, setRecetas] = useState<Receta[]>(initialRecetas);
  const [showNewReceta, setShowNewReceta] = useState(false);
  const [pacienteFiltro, setPacienteFiltro] = useState<{ id: string; nombre: string } | null>(null);
  const [filterLoading, setFilterLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabActivo, setTabActivo] = useState<'activas' | 'vencidas' | 'historial'>('activas');
  const [previewReceta, setPreviewReceta] = useState<RecetaLike | null>(null);

  const cargarRecetas = useCallback(async (pacienteId?: string, estado?: string) => {
    setFilterLoading(true);
    try {
      const params = new URLSearchParams();
      if (pacienteId) params.set('pacienteId', pacienteId);
      if (estado) params.set('estado', estado);
      const qs = params.toString();
      const url = `/api/recetas${qs ? `?${qs}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setRecetas(json.data ?? []);
      }
    } catch {
      // Error de red: se mantiene la lista actual
    } finally {
      setFilterLoading(false);
    }
  }, []);

  const handlePacienteChange = useCallback(
    (pacienteId: string, pacienteNombre: string) => {
      if (pacienteId) {
        setPacienteFiltro({ id: pacienteId, nombre: pacienteNombre });
        void cargarRecetas(pacienteId, tabActivo);
      } else {
        setPacienteFiltro(null);
        void cargarRecetas(undefined, tabActivo);
      }
    },
    [cargarRecetas, tabActivo],
  );

  const handleTabChange = useCallback(
    (tab: string) => {
      const nuevoTab = tab as 'activas' | 'vencidas' | 'historial';
      setTabActivo(nuevoTab);
      void cargarRecetas(pacienteFiltro?.id, nuevoTab);
    },
    [cargarRecetas, pacienteFiltro?.id],
  );

  const recetasVisibles = recetas.filter((r) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      r.paciente.toLowerCase().includes(q) ||
      r.medicamento.toLowerCase().includes(q) ||
      (r.indicaciones ?? '').toLowerCase().includes(q)
    );
  });

  const handleNuevaReceta = async (data: {
    pacienteId: string;
    pacienteNombre: string;
    medicamento: string;
    dosis: string;
    duracion: string;
    indicaciones: string;
  }) => {
    try {
      const res = await fetch('/api/recetas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: data.pacienteId,
          medicamento: data.medicamento,
          dosis: data.dosis,
          duracion: data.duracion,
          indicaciones: data.indicaciones,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast({
          title: 'Error',
          description: err.error || 'No se pudo crear la receta',
          variant: 'destructive',
        });
        return;
      }

      const json = await res.json();
      void cargarRecetas(pacienteFiltro?.id, tabActivo);
      toast({
        title: 'Receta creada',
        description: `${json.data.medicamento} para ${data.pacienteNombre}`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Error de red al crear receta',
        variant: 'destructive',
      });
    }
  };

  const handleRenovar = async (receta: Receta) => {
    try {
      const res = await fetch(`/api/recetas/${receta.id}/renovar`, { method: 'POST' });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast({
          title: 'Error',
          description: err?.error || 'No se pudo renovar la receta',
          variant: 'destructive',
        });
        return;
      }

      const json = await res.json();
      void cargarRecetas(pacienteFiltro?.id, tabActivo);
      toast({
        title: '🔄 Receta renovada',
        description: `${json.data.medicamento} para ${receta.paciente} - Vence ${formatDate(
          json.data.fechaFin || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          'dd/MM/yyyy',
        )}`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Error de red al renovar receta',
        variant: 'destructive',
      });
    }
  };

  const [deleteRecetaId, setDeleteRecetaId] = useState<string | null>(null);

  const handleEliminar = async () => {
    if (!deleteRecetaId) return;
    try {
      const res = await fetch(`/api/recetas/${deleteRecetaId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        toast({
          title: 'Error',
          description: 'No se pudo eliminar la receta',
          variant: 'destructive',
        });
        return;
      }
      setRecetas((prev) => prev.filter((r) => r.id !== deleteRecetaId));
      playDelete();
      toast({ title: 'Receta eliminada', description: 'La receta se movió al historial' });
      setDeleteRecetaId(null);
    } catch {
      toast({
        title: 'Error',
        description: 'Error de red al eliminar receta',
        variant: 'destructive',
      });
    }
  };

  const renderRecetaCard = (receta: Receta, variant: 'activa' | 'vencida' | 'historial') => {
    const isActiva = variant === 'activa';
    const isVencida = variant === 'vencida';

    return (
      <div
        key={receta.id}
        onClick={() =>
          setPreviewReceta({
            id: receta.id,
            paciente: receta.paciente,
            medicamento: receta.medicamento,
            dosis: receta.dosis,
            duracion: receta.duracion,
            vence: receta.vence,
            indicaciones: receta.indicaciones,
          })
        }
        className="flex items-center gap-4 p-4 hoverable:hover:bg-muted/50 transition-colors cursor-pointer"
      >
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center ${
            isActiva
              ? 'bg-emerald-100 dark:bg-emerald-900/30'
              : isVencida
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-muted'
          }`}
        >
          {isActiva ? (
            <Syringe className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          ) : isVencida ? (
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          ) : (
            <FileText className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{receta.paciente}</p>
          <p className="text-sm text-muted-foreground truncate">{receta.medicamento}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {receta.dosis} · {receta.duracion}
          </p>
          {receta.indicaciones && (
            <p className="text-xs text-muted-foreground/70 mt-0.5 italic truncate">
              {receta.indicaciones}
            </p>
          )}
        </div>
        <div className="text-sm text-muted-foreground text-center min-w-[50px]">
          <p className="text-xs">{isActiva ? 'Vence' : isVencida ? 'Venció' : 'Creada'}</p>
          <p className="font-medium text-foreground">
            {formatDate(isActiva || isVencida ? receta.vence : receta.fechaCreacion, 'dd/MM')}
          </p>
        </div>
        {/* Acciones — desktop: inline, mobile: dropdown */}
        <div className="flex gap-1">
          {/* Desktop inline */}
          <div className="hidden sm:flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Descargar"
              title="Descargar"
              onClick={(e) => {
                e.stopPropagation();
                descargarReceta(receta);
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Enviar por WhatsApp"
              title="Enviar por WhatsApp"
              onClick={(e) => {
                e.stopPropagation();
                enviarRecetaWhatsApp(receta);
              }}
            >
              <Send className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Imprimir"
              title="Imprimir"
              onClick={(e) => {
                e.stopPropagation();
                imprimirReceta(receta);
              }}
            >
              <Printer className="h-4 w-4" />
            </Button>
            {(isActiva || isVencida) && receta.renovable && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRenovar(receta);
                }}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Renovar
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Eliminar"
              title="Eliminar"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteRecetaId(receta.id);
              }}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile dropdown */}
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Más acciones" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    descargarReceta(receta);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" /> Descargar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    enviarRecetaWhatsApp(receta);
                  }}
                >
                  <Send className="h-4 w-4 mr-2" /> WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    imprimirReceta(receta);
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" /> Imprimir
                </DropdownMenuItem>
                {(isActiva || isVencida) && receta.renovable && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRenovar(receta);
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" /> Renovar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteRecetaId(receta.id);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  };

  return (
    <PageAnimation>
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
        <PacienteSearchCombobox
          value={pacienteFiltro?.id}
          onChange={handlePacienteChange}
          size="sm"
          placeholder="Filtrar por paciente..."
          onLoadingChange={setFilterLoading}
        />
        {pacienteFiltro && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 rounded-full px-3 py-1">
            <span>
              Filtrando: <strong className="text-foreground">{pacienteFiltro.nombre}</strong>
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              aria-label="Limpiar filtro de paciente"
              onClick={() => handlePacienteChange('', '')}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar medicamento o paciente..."
          className="h-8 text-xs sm:max-w-[220px]"
        />
        {filterLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tabActivo} onValueChange={handleTabChange}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="overflow-x-auto">
            <TabsTrigger value="activa">Activas</TabsTrigger>
            <TabsTrigger value="vencida">Vencidas</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-1 sm:gap-2 self-end sm:self-auto">
            {/* Export buttons — solo desktop */}
            <div className="hidden sm:flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="icon"
                title="Exportar Excel"
                aria-label="Exportar Excel"
                onClick={() => window.open('/api/recetas/exportar?formato=excel', '_blank')}
              >
                <FileSpreadsheet className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                title="Exportar PDF"
                aria-label="Exportar PDF"
                onClick={() => window.open('/api/recetas/exportar?formato=pdf', '_blank')}
              >
                <FileDown className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => setShowNewReceta(true)} className="shrink-0">
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Nueva Receta</span>
              <span className="sm:hidden">Nueva</span>
            </Button>
          </div>
        </div>

        <TabsContent value="activa" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {recetasVisibles.filter((r) => r.estado === 'activa').length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Syringe className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Sin recetas activas</p>
                  <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
                    No hay recetas activas en este momento
                  </p>
                  <Button onClick={() => setShowNewReceta(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Receta
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {recetasVisibles
                    .filter((r) => r.estado === 'activa')
                    .map((r) => renderRecetaCard(r, 'activa'))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vencida" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {recetasVisibles.filter((r) => r.estado === 'vencida').length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Sin recetas vencidas</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">No hay recetas vencidas</p>
                </div>
              ) : (
                <div className="divide-y">
                  {recetasVisibles
                    .filter((r) => r.estado === 'vencida')
                    .map((r) => renderRecetaCard(r, 'vencida'))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {recetasVisibles.filter((r) => r.estado === 'historial').length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48">
                  <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Historial completo de recetas por paciente
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Las recetas anteriores aparecerán aquí
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {recetasVisibles
                    .filter((r) => r.estado === 'historial')
                    .map((r) => renderRecetaCard(r, 'historial'))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Nueva Receta */}
      <NuevaRecetaModal
        open={showNewReceta}
        onOpenChange={setShowNewReceta}
        onSubmit={handleNuevaReceta}
      />

      {/* Confirmación eliminar receta */}
      <AlertDialog
        open={!!deleteRecetaId}
        onOpenChange={(open) => !open && setDeleteRecetaId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar receta?</AlertDialogTitle>
            <AlertDialogDescription>
              La receta se moverá al historial. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminar}
              className="bg-destructive text-destructive-foreground"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vista previa de receta */}
      {previewReceta && (
        <RecetaPreviewDialog
          key={previewReceta.id}
          receta={previewReceta}
          onClose={() => setPreviewReceta(null)}
        />
      )}
    </PageAnimation>
  );
}
