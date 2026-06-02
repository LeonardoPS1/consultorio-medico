'use client';

import { useState, useEffect } from 'react';
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
  FilePlus2,
  Trash2,
  Save,
  RotateCcw,
  Download,
  Stethoscope,
  Brain,
  ClipboardList,
  ArrowRight,
  RefreshCw,
  ScrollText,
  Printer,
} from 'lucide-react';
import { formatPhone, getInitials, formatDate, getTurnoColor, getTurnoLabel } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Cie10Search } from '@/components/ui/cie10-search';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { NuevoTurnoModal } from '@/components/modals/nuevo-turno-modal';

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

interface NotaSoapRow {
  id: string;
  pacienteId: string;
  medicoId: string;
  turnoId: string | null;
  subjetivo: string | null;
  objetivo: string | null;
  assessment: string | null;
  plan: string | null;
  cie10Codigo: string | null;
  cie10Descripcion: string | null;
  derivarA: string | null;
  requiereControl: boolean;
  controlEnDias: number | null;
  medicoNombre: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  totalTurnos: number;
  totalRecetas: number;
  totalHistorial: number;
  totalNotasSoap: number;
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
  bajaSolicitadaAt?: string | null;
  bajaConfirmada?: boolean;
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
  bajaSolicitadaAt: initialBajaSolicitadaAt,
  bajaConfirmada: initialBajaConfirmada,
}: Props) {
  const router = useRouter();
  const [turnosList, setTurnosList] = useState(turnos);
  const [recetasList, setRecetasList] = useState(recetas);
  const [showNewReceta, setShowNewReceta] = useState(false);
  const [savingReceta, setSavingReceta] = useState(false);
  const [medicamento, setMedicamento] = useState('');
  const [dosis, setDosis] = useState('');
  const [frecuencia, setFrecuencia] = useState('');
  const [indicaciones, setIndicaciones] = useState('');

  // ─── Historial state ──────────────────────────────
  const [historialList, setHistorialList] = useState(historial);
  const [showNewHistorial, setShowNewHistorial] = useState(false);
  const [editHistorialDialog, setEditHistorialDialog] = useState<HistorialRow | null>(null);
  const [deleteHistorialId, setDeleteHistorialId] = useState<string | null>(null);
  const [historialForm, setHistorialForm] = useState({
    tipo: 'consulta',
    titulo: '',
    descripcion: '',
    codigo: '',
  });
  const [savingHistorial, setSavingHistorial] = useState(false);

  // ─── SOAP state ────────────────────────────────
  const [notasSoapList, setNotasSoapList] = useState<NotaSoapRow[]>([]);
  const [soapLoaded, setSoapLoaded] = useState(false);
  const [soapLoading, setSoapLoading] = useState(false);
  const [showNewSoap, setShowNewSoap] = useState(false);
  const [editSoapDialog, setEditSoapDialog] = useState<NotaSoapRow | null>(null);
  const [deleteSoapId, setDeleteSoapId] = useState<string | null>(null);
  const [savingSoap, setSavingSoap] = useState(false);
  const [soapForm, setSoapForm] = useState({
    subjetivo: '',
    objetivo: '',
    assessment: '',
    plan: '',
    cie10Codigo: '',
    cie10Descripcion: '',
    derivarA: '',
    requiereControl: false,
    controlEnDias: '',
  });

  // ─── Certificados state (lazy load) ──────────────
  interface CertificadoRow {
    id: string;
    tipo: string;
    titulo: string;
    descripcion: string | null;
    diagnosticoCodigo: string | null;
    hashVerificacion: string | null;
    pdfGenerado: boolean;
    createdAt: string;
  }
  const [certificadosList, setCertificadosList] = useState<CertificadoRow[]>([]);
  const [certLoaded, setCertLoaded] = useState(false);
  const [certLoading, setCertLoading] = useState(false);

  const fetchCertificados = async () => {
    if (certLoaded) return;
    setCertLoading(true);
    try {
      const res = await fetch(`/api/pacientes/${paciente.id}/certificados`);
      if (res.ok) {
        const data = await res.json();
        setCertificadosList(data);
        setCertLoaded(true);
      }
    } catch {
      // Silencio
    } finally {
      setCertLoading(false);
    }
  };

  const fetchNotasSoap = async () => {
    if (soapLoaded) return;
    setSoapLoading(true);
    try {
      const res = await fetch(`/api/pacientes/${paciente.id}/notas-soap`);
      if (res.ok) {
        const data = await res.json();
        setNotasSoapList(data);
        setSoapLoaded(true);
      }
    } catch {
      // Silencio
    } finally {
      setSoapLoading(false);
    }
  };

  const handleCreateSoap = async () => {
    if (!soapForm.subjetivo.trim() && !soapForm.objetivo.trim() && !soapForm.assessment.trim() && !soapForm.plan.trim()) {
      toast({ title: 'Completá al menos un campo', variant: 'destructive' });
      return;
    }
    setSavingSoap(true);
    try {
      const res = await fetch(`/api/pacientes/${paciente.id}/notas-soap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjetivo: soapForm.subjetivo.trim() || null,
          objetivo: soapForm.objetivo.trim() || null,
          assessment: soapForm.assessment.trim() || null,
          plan: soapForm.plan.trim() || null,
          cie10Codigo: soapForm.cie10Codigo.trim() || null,
          cie10Descripcion: soapForm.cie10Descripcion.trim() || null,
          derivarA: soapForm.derivarA.trim() || null,
          requiereControl: soapForm.requiereControl,
          controlEnDias: soapForm.controlEnDias ? parseInt(soapForm.controlEnDias) : null,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const newNota: NotaSoapRow = {
        ...data,
        medicoNombre: null,
      };
      setNotasSoapList((prev) => [newNota, ...prev]);
      toast({ title: 'Nota SOAP guardada' });
      setShowNewSoap(false);
      setSoapForm({
        subjetivo: '', objetivo: '', assessment: '', plan: '',
        cie10Codigo: '', cie10Descripcion: '',
        derivarA: '', requiereControl: false, controlEnDias: '',
      });
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' });
    } finally {
      setSavingSoap(false);
    }
  };

  const handleUpdateSoap = async () => {
    if (!editSoapDialog) return;
    setSavingSoap(true);
    try {
      const res = await fetch(
        `/api/pacientes/${paciente.id}/notas-soap?entryId=${editSoapDialog.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subjetivo: editSoapDialog.subjetivo,
            objetivo: editSoapDialog.objetivo,
            assessment: editSoapDialog.assessment,
            plan: editSoapDialog.plan,
            cie10Codigo: editSoapDialog.cie10Codigo,
            cie10Descripcion: editSoapDialog.cie10Descripcion,
            derivarA: editSoapDialog.derivarA,
            requiereControl: editSoapDialog.requiereControl,
            controlEnDias: editSoapDialog.controlEnDias,
          }),
        },
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNotasSoapList((prev) =>
        prev.map((n) => (n.id === data.id ? { ...n, ...data } : n)),
      );
      toast({ title: 'Nota SOAP actualizada' });
      setEditSoapDialog(null);
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' });
    } finally {
      setSavingSoap(false);
    }
  };

  const handleDeleteSoap = async () => {
    if (!deleteSoapId) return;
    try {
      const res = await fetch(
        `/api/pacientes/${paciente.id}/notas-soap?entryId=${deleteSoapId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error();
      setNotasSoapList((prev) => prev.filter((n) => n.id !== deleteSoapId));
      toast({ title: 'Nota SOAP eliminada' });
      setDeleteSoapId(null);
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  // ─── Certificado state ─────────────────────────
  const [showCertDialog, setShowCertDialog] = useState(false);
  const [certForm, setCertForm] = useState({
    diagnostico: '',
    cie10Codigo: '',
    reposoDesde: '',
    reposoHasta: '',
    reposoDias: '',
    indicaciones: '',
  });
  const [savingCert, setSavingCert] = useState(false);

  const handleCreateCertificado = async () => {
    if (!certForm.diagnostico.trim()) {
      toast({ title: 'El diagnóstico es obligatorio', variant: 'destructive' });
      return;
    }
    setSavingCert(true);
    try {
      const res = await fetch(`/api/pacientes/${paciente.id}/certificados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(certForm),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errBody.error || `Error ${res.status}`);
      }
      const data = await res.json();
      toast({ title: 'Certificado creado', description: 'Abriendo vista previa...' });

      // Abrir PDF en nueva ventana
      const pdfUrl = `/api/pacientes/${paciente.id}/certificados?format=pdf&entryId=${data.id}`;
      window.open(pdfUrl, '_blank');

      setShowCertDialog(false);
      setCertForm({
        diagnostico: '', cie10Codigo: '', reposoDesde: '', reposoHasta: '',
        reposoDias: '', indicaciones: '',
      });
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'No se pudo crear el certificado',
        variant: 'destructive',
      });
    } finally {
      setSavingCert(false);
    }
  };

  // ─── Notas / Alergias / Medicacion editables ──────
  const [editandoNotas, setEditandoNotas] = useState(false);
  const [notasEdit, setNotasEdit] = useState(paciente.notasMedicas || '');
  const [editandoAlergias, setEditandoAlergias] = useState(false);
  const [alergiasEdit, setAlergiasEdit] = useState(paciente.alergias || '');
  const [editandoMedicacion, setEditandoMedicacion] = useState(false);
  const [medicacionEdit, setMedicacionEdit] = useState(paciente.medicacionCronica || '');

  // ─── Nuevo Turno ───────────────────────────────
  const [showNuevoTurno, setShowNuevoTurno] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        setShowNuevoTurno(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─── Baja de datos (ARCO) ──────────────────────
  const [bajaDialogOpen, setBajaDialogOpen] = useState(false);
  const [bajaConfirmOpen, setBajaConfirmOpen] = useState(false);
  const [bajaLoading, setBajaLoading] = useState(false);
  const [bajaSolicitada, setBajaSolicitada] = useState(!!initialBajaSolicitadaAt);
  const [bajaConfirmada, setBajaConfirmada] = useState(!!initialBajaConfirmada);

  const handleSolicitarBaja = async () => {
    setBajaLoading(true);
    try {
      const res = await fetch(`/api/pacientes/${paciente.id}/solicitar-baja`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al solicitar la baja');
      }
      setBajaSolicitada(true);
      setBajaDialogOpen(false);
      toast({
        title: 'Solicitud registrada',
        description: 'Los datos se conservarán por 90 días antes de ser anonimizados.',
      });
    } catch (e) {
      toast({
        title: 'Error',
        description: (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setBajaLoading(false);
    }
  };

  const handleConfirmarBaja = async () => {
    setBajaLoading(true);
    try {
      const res = await fetch(`/api/pacientes/${paciente.id}/confirmar-baja`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al confirmar la baja');
      }
      setBajaConfirmada(true);
      setBajaConfirmOpen(false);
      toast({
        title: 'Baja confirmada',
        description: 'Los datos del paciente han sido anonimizados irreversiblemente.',
      });
    } catch (e) {
      toast({
        title: 'Error',
        description: (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setBajaLoading(false);
    }
  };

  const handleExportarDatos = async () => {
    try {
      const res = await fetch(`/api/pacientes/${paciente.id}/exportar-datos`);
      if (!res.ok) throw new Error('Error al exportar datos');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `datos-${paciente.nombre}-${paciente.apellido}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Exportación completa', description: 'Datos exportados en formato JSON.' });
    } catch (e) {
      toast({
        title: 'Error',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  };

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

  const handleCreateReceta = async () => {
    if (!medicamento.trim() || !dosis.trim()) return;
    setSavingReceta(true);
    try {
      const res = await fetch('/api/recetas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: paciente.id,
          medicamento: medicamento.trim(),
          dosis: dosis.trim(),
          frecuencia: frecuencia.trim() || undefined,
          indicaciones: indicaciones.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setRecetasList((prev) => [
        {
          id: data.id,
          medicamento: data.medicamento,
          dosis: data.dosis,
          frecuencia: data.frecuencia,
          duracion: data.duracion,
          indicaciones: data.indicaciones,
          estado: data.estado,
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
          medicoNombre: null,
        },
        ...prev,
      ]);
      toast({ title: 'Receta creada', description: `${medicamento}` });
      setShowNewReceta(false);
      setMedicamento('');
      setDosis('');
      setFrecuencia('');
      setIndicaciones('');
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear la receta', variant: 'destructive' });
    } finally {
      setSavingReceta(false);
    }
  };

  // ─── Historial CRUD handlers ──────────────────────

  const handleCreateHistorial = async () => {
    if (!historialForm.titulo.trim()) return;
    setSavingHistorial(true);
    try {
      const res = await fetch(`/api/pacientes/${paciente.id}/historial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(historialForm),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const newEntry: HistorialRow = {
        id: data.id,
        tipo: data.tipo,
        titulo: data.titulo,
        descripcion: data.descripcion,
        diagnosticoCodigo: data.diagnosticoCodigo,
        diagnosticoDescripcion: data.diagnosticoDescripcion,
        fecha: data.createdAt,
      };
      setHistorialList((prev) => [newEntry, ...prev]);
      toast({ title: 'Entrada agregada', description: data.titulo });
      setShowNewHistorial(false);
      setHistorialForm({ tipo: 'consulta', titulo: '', descripcion: '', codigo: '' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear la entrada', variant: 'destructive' });
    } finally {
      setSavingHistorial(false);
    }
  };

  const handleUpdateHistorial = async () => {
    if (!editHistorialDialog || !editHistorialDialog.titulo.trim()) return;
    setSavingHistorial(true);
    try {
      const res = await fetch(
        `/api/pacientes/${paciente.id}/historial?entryId=${editHistorialDialog.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: editHistorialDialog.tipo,
            titulo: editHistorialDialog.titulo,
            descripcion: editHistorialDialog.descripcion,
            codigo: editHistorialDialog.diagnosticoCodigo,
          }),
        },
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setHistorialList((prev) =>
        prev.map((h) =>
          h.id === data.id
            ? {
                ...h,
                tipo: data.tipo,
                titulo: data.titulo,
                descripcion: data.descripcion,
                diagnosticoCodigo: data.diagnosticoCodigo,
                diagnosticoDescripcion: data.diagnosticoDescripcion,
              }
            : h,
        ),
      );
      toast({ title: 'Entrada actualizada' });
      setEditHistorialDialog(null);
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' });
    } finally {
      setSavingHistorial(false);
    }
  };

  const handleDeleteHistorial = async () => {
    if (!deleteHistorialId) return;
    try {
      const res = await fetch(
        `/api/pacientes/${paciente.id}/historial?entryId=${deleteHistorialId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error();
      setHistorialList((prev) => prev.filter((h) => h.id !== deleteHistorialId));
      toast({ title: 'Entrada eliminada' });
      setDeleteHistorialId(null);
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  // ─── Editar notas / alergias / medicacion ──────────

  const handleSaveNotas = async () => {
    try {
      const res = await fetch(`/api/pacientes/${paciente.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notasMedicas: notasEdit }),
      });
      if (!res.ok) throw new Error();
      paciente.notasMedicas = notasEdit;
      toast({ title: 'Notas actualizadas' });
      setEditandoNotas(false);
    } catch {
      toast({ title: 'Error', description: 'No se pudieron guardar las notas', variant: 'destructive' });
    }
  };

  const handleSaveAlergias = async () => {
    try {
      const res = await fetch(`/api/pacientes/${paciente.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alergias: alergiasEdit || null }),
      });
      if (!res.ok) throw new Error();
      paciente.alergias = alergiasEdit || null;
      toast({ title: 'Alergias actualizadas' });
      setEditandoAlergias(false);
    } catch {
      toast({ title: 'Error', description: 'No se pudieron actualizar las alergias', variant: 'destructive' });
    }
  };

  const handleSaveMedicacion = async () => {
    try {
      const res = await fetch(`/api/pacientes/${paciente.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicacionCronica: medicacionEdit || null }),
      });
      if (!res.ok) throw new Error();
      paciente.medicacionCronica = medicacionEdit || null;
      toast({ title: 'Medicación actualizada' });
      setEditandoMedicacion(false);
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar la medicación', variant: 'destructive' });
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
                {bajaSolicitada && (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                    <AlertCircle className="h-3 w-3 mr-1" /> Baja solicitada
                  </Badge>
                )}
                {bajaConfirmada && (
                  <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                    <XCircle className="h-3 w-3 mr-1" /> Datos anonimizados
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/conversaciones`)}>
                <MessageSquare className="h-4 w-4 mr-2" /> Mensaje
              </Button>
              <Button size="sm" onClick={() => setShowNuevoTurno(true)} title="Nuevo Turno (Ctrl+T)">
                <Calendar className="h-4 w-4 mr-2" /> Nuevo Turno
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowCertDialog(true)}>
                <ScrollText className="h-4 w-4 mr-2" /> Certificado
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportarDatos}>
                <Download className="h-4 w-4 mr-2" /> Exportar datos
              </Button>
              {!bajaConfirmada && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => (bajaSolicitada ? setBajaConfirmOpen(true) : setBajaDialogOpen(true))}
                  disabled={bajaLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {bajaSolicitada ? 'Confirmar baja' : 'Solicitar baja'}
                </Button>
              )}
            </div>
          </div>

          {/* Alergias / Medicacion (editables) */}
          <div className="flex gap-4 mt-4 pt-4 border-t flex-wrap">
            <div className="flex items-start gap-2 text-sm flex-1 min-w-[200px]">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-red-600">Alergias</p>
                  {!editandoAlergias && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => {
                        setAlergiasEdit(paciente.alergias || '');
                        setEditandoAlergias(true);
                      }}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {editandoAlergias ? (
                  <div className="flex gap-2 mt-1">
                    <Input
                      className="h-7 text-xs flex-1"
                      value={alergiasEdit}
                      onChange={(e) => setAlergiasEdit(e.target.value)}
                      placeholder="Sin alergias registradas"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setEditandoAlergias(false)}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="default"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={handleSaveAlergias}
                    >
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    {paciente.alergias || 'Sin alergias registradas'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm flex-1 min-w-[200px]">
              <Syringe className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-amber-600">Medicacion cronica</p>
                  {!editandoMedicacion && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => {
                        setMedicacionEdit(paciente.medicacionCronica || '');
                        setEditandoMedicacion(true);
                      }}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {editandoMedicacion ? (
                  <div className="flex gap-2 mt-1">
                    <Input
                      className="h-7 text-xs flex-1"
                      value={medicacionEdit}
                      onChange={(e) => setMedicacionEdit(e.target.value)}
                      placeholder="Sin medicación registrada"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setEditandoMedicacion(false)}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="default"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={handleSaveMedicacion}
                    >
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    {paciente.medicacionCronica || 'Sin medicación registrada'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
        <TabsList className="flex-nowrap overflow-x-auto scrollbar-none w-full justify-start">
          <TabsTrigger value="turnos">
            <Calendar className="h-4 w-4 mr-1" /> Turnos ({turnosList.length})
          </TabsTrigger>
          <TabsTrigger value="recetas">
            <Syringe className="h-4 w-4 mr-1" /> Recetas ({recetasList.length})
          </TabsTrigger>
          <TabsTrigger value="historial">
            <Activity className="h-4 w-4 mr-1" /> Historial ({historial.length})
          </TabsTrigger>
          <TabsTrigger value="soap" onClick={fetchNotasSoap}>
            <Stethoscope className="h-4 w-4 mr-1" /> SOAP ({stats.totalNotasSoap})
          </TabsTrigger>
          <TabsTrigger value="certificados" onClick={fetchCertificados}>
            <ScrollText className="h-4 w-4 mr-1" /> Certificados ({certificadosList.length})
          </TabsTrigger>
          <TabsTrigger value="notas">
            <FileText className="h-4 w-4 mr-1" /> Notas
          </TabsTrigger>
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
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">{recetasList.length} recetas</p>
            {!showNewReceta && (
              <Button variant="outline" size="sm" onClick={() => setShowNewReceta(true)}>
                <FilePlus2 className="h-4 w-4 mr-1" /> Nueva Receta
              </Button>
            )}
          </div>

          {/* Form nueva receta */}
          {showNewReceta && (
            <Card className="border-dashed border-primary/40 mb-3">
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Medicamento *</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="ej: Amoxicilina 500mg"
                      value={medicamento}
                      onChange={(e) => setMedicamento(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Dosis *</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="ej: 1 comprimido cada 8hs"
                      value={dosis}
                      onChange={(e) => setDosis(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Frecuencia</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="ej: Cada 8 horas"
                      value={frecuencia}
                      onChange={(e) => setFrecuencia(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Indicaciones</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="ej: Con las comidas"
                      value={indicaciones}
                      onChange={(e) => setIndicaciones(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setShowNewReceta(false);
                      setMedicamento('');
                      setDosis('');
                      setFrecuencia('');
                      setIndicaciones('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleCreateReceta}
                    disabled={savingReceta || !medicamento.trim() || !dosis.trim()}
                  >
                    {savingReceta ? 'Creando...' : 'Crear Receta'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {recetasList.length === 0 && !showNewReceta ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Syringe className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Sin recetas registradas</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recetasList.map((r) => (
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
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">{historialList.length} entradas</p>
            {!showNewHistorial && (
              <Button variant="outline" size="sm" onClick={() => setShowNewHistorial(true)}>
                <Plus className="h-4 w-4 mr-1" /> Nueva entrada
              </Button>
            )}
          </div>

          {/* Form nueva entrada */}
          {showNewHistorial && (
            <Card className="border-dashed border-primary/40 mb-3">
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo</Label>
                    <select
                      className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
                      value={historialForm.tipo}
                      onChange={(e) => setHistorialForm((f) => ({ ...f, tipo: e.target.value }))}
                    >
                      <option value="consulta">Consulta</option>
                      <option value="diagnostico">Diagnóstico</option>
                      <option value="procedimiento">Procedimiento</option>
                      <option value="estudio">Estudio</option>
                      <option value="nota">Nota de evolución</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Código CIE-10</Label>
                    <Cie10Search
                      value={historialForm.codigo}
                      onSelect={(entry) => setHistorialForm((f) => ({ ...f, codigo: entry.codigo }))}
                      onChange={(v) => setHistorialForm((f) => ({ ...f, codigo: v }))}
                      placeholder="Buscar CIE-10..."
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Título *</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="ej: Control de rutina"
                    value={historialForm.titulo}
                    onChange={(e) => setHistorialForm((f) => ({ ...f, titulo: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Descripción</Label>
                  <Textarea
                    className="min-h-[60px] text-xs"
                    placeholder="Detalles de la entrada..."
                    value={historialForm.descripcion}
                    onChange={(e) => setHistorialForm((f) => ({ ...f, descripcion: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setShowNewHistorial(false);
                      setHistorialForm({ tipo: 'consulta', titulo: '', descripcion: '', codigo: '' });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleCreateHistorial}
                    disabled={savingHistorial || !historialForm.titulo.trim()}
                  >
                    {savingHistorial ? 'Creando...' : 'Guardar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {historialList.length === 0 && !showNewHistorial ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Sin entradas en el historial</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {historialList.map((h) => {
                const Icon = getHistorialIcon(h.tipo);
                return (
                  <Card key={h.id} className="hoverable:hover:bg-muted/30 transition-colors group">
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
                      <div className="flex items-center gap-1 shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {formatDate(h.fecha, 'dd/MM/yy')}
                        </p>
                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setEditHistorialDialog(h)}
                            title="Editar"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => setDeleteHistorialId(h.id)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* SOAP */}
        <TabsContent value="soap" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">{notasSoapList.length} notas SOAP</p>
            {!showNewSoap && (
              <Button variant="outline" size="sm" onClick={() => setShowNewSoap(true)}>
                <FilePlus2 className="h-4 w-4 mr-1" /> Nueva Nota SOAP
              </Button>
            )}
          </div>

          {/* Form nueva nota SOAP */}
          {showNewSoap && (
            <Card className="border-dashed border-primary/40 mb-3">
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                      <Brain className="h-3 w-3" /> S — Subjetivo
                    </Label>
                    <p className="text-[10px] text-muted-foreground -mt-0.5 mb-1">
                      Lo que el paciente refiere (síntomas, motivo de consulta)
                    </p>
                    <Textarea
                      className="min-h-[60px] text-xs"
                      placeholder="Ej: Paciente refiere dolor de cabeza intenso desde hace 3 días..."
                      value={soapForm.subjetivo}
                      onChange={(e) => setSoapForm((f) => ({ ...f, subjetivo: e.target.value }))}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs font-semibold text-green-600 flex items-center gap-1">
                      <Activity className="h-3 w-3" /> O — Objetivo
                    </Label>
                    <p className="text-[10px] text-muted-foreground -mt-0.5 mb-1">
                      Hallazgos del examen físico y estudios
                    </p>
                    <Textarea
                      className="min-h-[60px] text-xs"
                      placeholder="Ej: PA: 130/80, FC: 85, Temp: 36.5°C..."
                      value={soapForm.objetivo}
                      onChange={(e) => setSoapForm((f) => ({ ...f, objetivo: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> A — Assessment
                    </Label>
                    <p className="text-[10px] text-muted-foreground -mt-0.5 mb-1">
                      Diagnóstico / Impresión clínica
                    </p>
                    <Textarea
                      className="min-h-[60px] text-xs"
                      placeholder="Ej: Cefalea tensional probable. Se descarta origen vascular..."
                      value={soapForm.assessment}
                      onChange={(e) => setSoapForm((f) => ({ ...f, assessment: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs font-semibold text-purple-600 flex items-center gap-1">
                      <ClipboardList className="h-3 w-3" /> P — Plan
                    </Label>
                    <p className="text-[10px] text-muted-foreground -mt-0.5 mb-1">
                      Tratamiento, estudios, indicaciones
                    </p>
                    <Textarea
                      className="min-h-[60px] text-xs"
                      placeholder="Ej: Indicar ibuprofeno 600mg c/8hs por 5 días. Solicitar RNM de cerebro..."
                      value={soapForm.plan}
                      onChange={(e) => setSoapForm((f) => ({ ...f, plan: e.target.value }))}
                    />
                  </div>
                </div>

                {/* CIE-10 + Derivación + Control */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">CIE-10</Label>
                    <Cie10Search
                      value={soapForm.cie10Codigo}
                      onSelect={(entry) => {
                        setSoapForm((f) => ({ ...f, cie10Codigo: entry.codigo, cie10Descripcion: entry.descripcion }));
                      }}
                      onChange={(v) => setSoapForm((f) => ({ ...f, cie10Codigo: v }))}
                      placeholder="Buscar CIE-10..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Descripción CIE-10</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="ej: Cefalea tensional"
                      value={soapForm.cie10Descripcion}
                      onChange={(e) => setSoapForm((f) => ({ ...f, cie10Descripcion: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Derivar a</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="ej: Neurología"
                      value={soapForm.derivarA}
                      onChange={(e) => setSoapForm((f) => ({ ...f, derivarA: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={soapForm.requiereControl}
                      onChange={(e) => setSoapForm((f) => ({ ...f, requiereControl: e.target.checked }))}
                    />
                    <span className="text-xs">Requiere control</span>
                  </label>
                  {soapForm.requiereControl && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Control en</Label>
                      <Input
                        type="number"
                        className="h-7 w-20 text-xs"
                        placeholder="días"
                        value={soapForm.controlEnDias}
                        onChange={(e) => setSoapForm((f) => ({ ...f, controlEnDias: e.target.value }))}
                      />
                      <span className="text-xs text-muted-foreground">días</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setShowNewSoap(false);
                      setSoapForm({
                        subjetivo: '', objetivo: '', assessment: '', plan: '',
                        cie10Codigo: '', cie10Descripcion: '',
                        derivarA: '', requiereControl: false, controlEnDias: '',
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleCreateSoap}
                    disabled={savingSoap}
                  >
                    {savingSoap ? 'Guardando...' : 'Guardar Nota SOAP'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de notas SOAP */}
          {soapLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : notasSoapList.length === 0 && !showNewSoap ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Stethoscope className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Sin notas SOAP registradas</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Las notas SOAP estructuran la evolución clínica en 4 partes
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notasSoapList.map((n) => (
                <Card key={n.id} className="hoverable:hover:bg-muted/30 transition-colors group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-primary" />
                        <span className="text-xs text-muted-foreground">
                          {n.medicoNombre && `${n.medicoNombre} · `}
                          {formatDate(n.createdAt, "d 'de' MMMM, HH:mm")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setEditSoapDialog(n)}
                          title="Editar"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => setDeleteSoapId(n.id)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {n.subjetivo && (
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                            <Brain className="h-3 w-3" /> S — Subjetivo
                          </p>
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{n.subjetivo}</p>
                        </div>
                      )}
                      {n.objetivo && (
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wider flex items-center gap-1">
                            <Activity className="h-3 w-3" /> O — Objetivo
                          </p>
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{n.objetivo}</p>
                        </div>
                      )}
                      {n.assessment && (
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> A — Assessment
                          </p>
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{n.assessment}</p>
                        </div>
                      )}
                      {n.plan && (
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider flex items-center gap-1">
                            <ClipboardList className="h-3 w-3" /> P — Plan
                          </p>
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{n.plan}</p>
                        </div>
                      )}
                    </div>

                    {/* Footer: CIE-10 + Derivación + Control */}
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t flex-wrap">
                      {n.cie10Codigo && (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {n.cie10Codigo}
                          {n.cie10Descripcion && ` — ${n.cie10Descripcion}`}
                        </Badge>
                      )}
                      {n.derivarA && (
                        <Badge variant="secondary" className="text-[10px]">
                          <ArrowRight className="h-2.5 w-2.5 mr-1" />
                          Derivar a {n.derivarA}
                        </Badge>
                      )}
                      {n.requiereControl && n.controlEnDias && (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                          <RefreshCw className="h-2.5 w-2.5 mr-1" />
                          Control en {n.controlEnDias} días
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Certificados */}
        <TabsContent value="certificados" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">{certificadosList.length} certificados</p>
            <Button variant="outline" size="sm" onClick={() => setShowCertDialog(true)}>
              <ScrollText className="h-4 w-4 mr-1" /> Nuevo Certificado
            </Button>
          </div>

          {certLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : certificadosList.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <ScrollText className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Sin certificados emitidos</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Los certificados médicos aparecerán aquí una vez creados
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {certificadosList.map((c) => {
                const data = c.descripcion ? (() => { try { return JSON.parse(c.descripcion); } catch { return null; } })() : null;
                return (
                  <Card key={c.id} className="hoverable:hover:bg-muted/30 transition-colors group">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                        <ScrollText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{data?.diagnostico || c.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(c.createdAt, "d 'de' MMMM yyyy, HH:mm")}
                          {c.diagnosticoCodigo && ` · CIE-10: ${c.diagnosticoCodigo}`}
                        </p>
                        {data?.indicaciones && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5 italic truncate">{data.indicaciones}</p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          const pdfUrl = `/api/pacientes/${paciente.id}/certificados?format=pdf&entryId=${c.id}`;
                          window.open(pdfUrl, '_blank');
                        }}
                        title="Ver certificado"
                      >
                        <Printer className="h-3.5 w-3.5 mr-1" /> Ver
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Notas médicas (siempre visible, editable) */}
        <TabsContent value="notas" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Edit3 className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Notas del medico</p>
                    {!editandoNotas && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setNotasEdit(paciente.notasMedicas || '');
                          setEditandoNotas(true);
                        }}
                      >
                        <Edit3 className="h-3.5 w-3.5 mr-1" />
                        {paciente.notasMedicas ? 'Editar' : 'Agregar notas'}
                      </Button>
                    )}
                  </div>
                  {editandoNotas ? (
                    <div className="space-y-2">
                      <Textarea
                        className="min-h-[120px] text-sm"
                        placeholder="Escribí notas médicas sobre el paciente..."
                        value={notasEdit}
                        onChange={(e) => setNotasEdit(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setEditandoNotas(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={handleSaveNotas}
                        >
                          <Save className="h-3.5 w-3.5 mr-1" />
                          Guardar notas
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {paciente.notasMedicas || 'Sin notas registradas'}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
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

      {/* ─── Historial Edit Dialog ──────────────── */}
      <Dialog open={!!editHistorialDialog} onOpenChange={(open) => !open && setEditHistorialDialog(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar entrada de historial</DialogTitle>
          </DialogHeader>
          {editHistorialDialog && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <select
                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
                    value={editHistorialDialog.tipo}
                    onChange={(e) =>
                      setEditHistorialDialog({ ...editHistorialDialog, tipo: e.target.value })
                    }
                  >
                    <option value="consulta">Consulta</option>
                    <option value="diagnostico">Diagnóstico</option>
                    <option value="procedimiento">Procedimiento</option>
                    <option value="estudio">Estudio</option>
                    <option value="nota">Nota de evolución</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Código CIE-10</Label>
                  <Cie10Search
                    value={editHistorialDialog.diagnosticoCodigo || ''}
                    onSelect={(entry) => setEditHistorialDialog({ ...editHistorialDialog, diagnosticoCodigo: entry.codigo })}
                    onChange={(v) => setEditHistorialDialog({ ...editHistorialDialog, diagnosticoCodigo: v })}
                    placeholder="Buscar CIE-10..."
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Título</Label>
                <Input
                  className="h-8 text-xs"
                  value={editHistorialDialog.titulo}
                  onChange={(e) =>
                    setEditHistorialDialog({ ...editHistorialDialog, titulo: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Descripción</Label>
                <Textarea
                  className="min-h-[80px] text-xs"
                  value={editHistorialDialog.descripcion || ''}
                  onChange={(e) =>
                    setEditHistorialDialog({ ...editHistorialDialog, descripcion: e.target.value })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditHistorialDialog(null)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleUpdateHistorial} disabled={savingHistorial}>
              {savingHistorial ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── SOAP Edit Dialog ──────────────── */}
      <Dialog open={!!editSoapDialog} onOpenChange={(open) => !open && setEditSoapDialog(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Nota SOAP</DialogTitle>
          </DialogHeader>
          {editSoapDialog && (
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                  <Brain className="h-3 w-3" /> S — Subjetivo
                </Label>
                <Textarea
                  className="min-h-[60px] text-xs"
                  value={editSoapDialog.subjetivo || ''}
                  onChange={(e) => setEditSoapDialog({ ...editSoapDialog, subjetivo: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-green-600 flex items-center gap-1">
                  <Activity className="h-3 w-3" /> O — Objetivo
                </Label>
                <Textarea
                  className="min-h-[60px] text-xs"
                  value={editSoapDialog.objetivo || ''}
                  onChange={(e) => setEditSoapDialog({ ...editSoapDialog, objetivo: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> A — Assessment
                </Label>
                <Textarea
                  className="min-h-[60px] text-xs"
                  value={editSoapDialog.assessment || ''}
                  onChange={(e) => setEditSoapDialog({ ...editSoapDialog, assessment: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-purple-600 flex items-center gap-1">
                  <ClipboardList className="h-3 w-3" /> P — Plan
                </Label>
                <Textarea
                  className="min-h-[60px] text-xs"
                  value={editSoapDialog.plan || ''}
                  onChange={(e) => setEditSoapDialog({ ...editSoapDialog, plan: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">CIE-10</Label>
                  <Cie10Search
                    value={editSoapDialog.cie10Codigo || ''}
                    onSelect={(entry) => setEditSoapDialog({ ...editSoapDialog, cie10Codigo: entry.codigo, cie10Descripcion: entry.descripcion })}
                    onChange={(v) => setEditSoapDialog({ ...editSoapDialog, cie10Codigo: v })}
                    placeholder="Buscar CIE-10..."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Descripción</Label>
                  <Input
                    className="h-8 text-xs"
                    value={editSoapDialog.cie10Descripcion || ''}
                    onChange={(e) => setEditSoapDialog({ ...editSoapDialog, cie10Descripcion: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Derivar a</Label>
                  <Input
                    className="h-8 text-xs"
                    value={editSoapDialog.derivarA || ''}
                    onChange={(e) => setEditSoapDialog({ ...editSoapDialog, derivarA: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={editSoapDialog.requiereControl}
                    onChange={(e) => setEditSoapDialog({ ...editSoapDialog, requiereControl: e.target.checked })}
                  />
                  <span className="text-xs">Requiere control</span>
                </label>
                {editSoapDialog.requiereControl && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Control en</Label>
                    <Input
                      type="number"
                      className="h-7 w-20 text-xs"
                      value={editSoapDialog.controlEnDias || ''}
                      onChange={(e) => setEditSoapDialog({ ...editSoapDialog, controlEnDias: parseInt(e.target.value) || null })}
                    />
                    <span className="text-xs text-muted-foreground">días</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditSoapDialog(null)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleUpdateSoap} disabled={savingSoap}>
              {savingSoap ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── SOAP Delete Alert ──────────────── */}
      <AlertDialog open={!!deleteSoapId} onOpenChange={(open) => !open && setDeleteSoapId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Nota SOAP</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSoap} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Certificado Dialog ──────────────── */}
      <Dialog open={showCertDialog} onOpenChange={(open) => !open && setShowCertDialog(false)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" /> Nuevo Certificado Médico
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Diagnóstico <span className="text-destructive">*</span>
              </Label>
              <Textarea
                className="min-h-[60px] text-xs"
                placeholder="Ej: Infección respiratoria aguda"
                value={certForm.diagnostico}
                onChange={(e) => setCertForm((f) => ({ ...f, diagnostico: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">CIE-10</Label>
                <Cie10Search
                  value={certForm.cie10Codigo}
                  onSelect={(entry) => setCertForm((f) => ({ ...f, cie10Codigo: entry.codigo }))}
                  onChange={(v) => setCertForm((f) => ({ ...f, cie10Codigo: v }))}
                  placeholder="Buscar CIE-10..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Días de reposo</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  placeholder="ej: 7"
                  value={certForm.reposoDias}
                  onChange={(e) => {
                    const dias = e.target.value;
                    setCertForm((f) => ({ ...f, reposoDias: dias }));
                    // Auto-calcular fechas
                    if (dias && parseInt(dias) > 0) {
                      const hoy = new Date();
                      const desde = hoy.toISOString().split('T')[0];
                      const hasta = new Date(hoy.getTime() + parseInt(dias) * 86400000).toISOString().split('T')[0];
                      setCertForm((f) => ({ ...f, reposoDesde: desde, reposoHasta: hasta }));
                    }
                  }}
                />
              </div>
            </div>
            {certForm.reposoDias && parseInt(certForm.reposoDias) > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Desde</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={certForm.reposoDesde}
                    onChange={(e) => setCertForm((f) => ({ ...f, reposoDesde: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hasta</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={certForm.reposoHasta}
                    onChange={(e) => setCertForm((f) => ({ ...f, reposoHasta: e.target.value }))}
                  />
                </div>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Indicaciones (opcional)</Label>
              <Textarea
                className="min-h-[60px] text-xs"
                placeholder="Ej: Reposo relativo, evitar esfuerzos, tomar medicación indicada..."
                value={certForm.indicaciones}
                onChange={(e) => setCertForm((f) => ({ ...f, indicaciones: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCertDialog(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreateCertificado}
              disabled={savingCert || !certForm.diagnostico.trim()}
            >
              {savingCert ? 'Generando...' : (
                <>
                  <Printer className="h-4 w-4 mr-1" /> Generar y Ver
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Baja — Solicitar (Primer paso) ───── */}
      <AlertDialog open={bajaDialogOpen} onOpenChange={(open) => !open && !bajaLoading && setBajaDialogOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Solicitar baja de datos</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Se va a iniciar el proceso de baja de datos de <strong>{paciente.nombre} {paciente.apellido}</strong>.</p>
              <ul className="list-disc pl-4 text-sm space-y-1">
                <li>El paciente quedará marcado como <strong>baja solicitada</strong></li>
                <li>Los datos clínicos se conservarán por <strong>90 días</strong> (período de retención legal)</li>
                <li>Luego del período de retención, los datos se <strong>anonimizarán irreversiblemente</strong></li>
                <li>Se notificará al sistema de automatización (n8n) para limpiar datos asociados</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                Esta acción cumple con los derechos ARCO (Acceso, Rectificación, Cancelación, Oposición).
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bajaLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSolicitarBaja}
              disabled={bajaLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bajaLoading ? 'Procesando...' : 'Solicitar baja'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Baja — Confirmar (Segundo paso) ──── */}
      <AlertDialog open={bajaConfirmOpen} onOpenChange={(open) => !open && !bajaLoading && setBajaConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">¿Confirmar baja definitiva?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Esta acción es <strong>irreversible</strong>. Se ejecutará la cascada completa de eliminación:</p>
              <ul className="list-disc pl-4 text-sm space-y-1">
                <li>Anonimización de datos personales (nombre, email, teléfono, documento)</li>
                <li>Soft-delete en cascada de: turnos, recetas, conversaciones, mensajes</li>
                <li>Soft-delete de historial médico, eventos y tareas pendientes</li>
                <li>Notificación al sistema para limpiar memoria del chat (n8n)</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bajaLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarBaja}
              disabled={bajaLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bajaLoading ? 'Procesando...' : 'Confirmar baja definitiva'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Delete Confirmation (historial) ───── */}
      <AlertDialog open={!!deleteHistorialId} onOpenChange={(open) => !open && setDeleteHistorialId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar entrada?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La entrada de historial se eliminará permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHistorial} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Nuevo Turno Modal ─────────────────── */}
      <NuevoTurnoModal
        open={showNuevoTurno}
        onOpenChange={setShowNuevoTurno}
        pacienteId={paciente.id}
        pacienteName={`${paciente.nombre} ${paciente.apellido}`}
        onSubmit={async (data) => {
          try {
            // Buscar médico por nombre para obtener su ID
            const medicosRes = await fetch('/api/medicos');
            const medicosJson = await medicosRes.json();
            const medicosList: { id: string; nombre: string }[] = medicosJson.data || [];
            const medicoEncontrado = medicosList.find(
              (m) =>
                m.nombre.toLowerCase().includes(data.medico.toLowerCase()) ||
                data.medico.toLowerCase().includes(m.nombre.toLowerCase()),
            );

            if (!medicoEncontrado) {
              toast({ title: 'Error', description: 'Médico no encontrado. Verificá la lista de médicos.', variant: 'destructive' });
              return;
            }

            const res = await fetch('/api/turnos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                pacienteId: data.pacienteId || paciente.id,
                medicoId: medicoEncontrado.id,
                fecha: data.fecha,
                hora: data.hora,
                motivo: data.tipo,
              }),
            });
            if (!res.ok) {
              const err = await res.json();
              toast({ title: 'Error', description: err.error || 'No se pudo crear el turno', variant: 'destructive' });
              return;
            }
            const json = await res.json();
            const turno = json.data || json;
            setTurnosList((prev) => [turno, ...prev]);
            toast({ title: 'Turno creado', description: `Turno agendado correctamente.` });
          } catch {
            toast({ title: 'Error', description: 'No se pudo crear el turno', variant: 'destructive' });
          }
        }}
      />
    </div>
  );
}
