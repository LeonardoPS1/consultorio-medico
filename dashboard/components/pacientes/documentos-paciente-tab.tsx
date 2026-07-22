'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Edit,
  Search,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface DocumentoMedico {
  id: string;
  tipo: string;
  archivoUrl: string;
  extraccionEstado: string;
  datosExtraidos: Record<string, unknown> | null;
  confianzaExtraccion: number | null;
  textoOriginalOcr: string | null;
  estadoRevision: string;
  createdAt: string;
  filename?: string;
  metadata?: Record<string, unknown>;
  historialId?: string | null;
  pacienteId?: string;
}

function getEstadoBadge(estado: string) {
  switch (estado) {
    case 'completada':
    case 'confirmado':
      return (
        <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-400 dark:bg-green-950/30">
          <CheckCircle2 className="h-3 w-3 mr-1" /> OCR Ok
        </Badge>
      );
    case 'pendiente':
      return (
        <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50 dark:border-yellow-700 dark:text-yellow-400 dark:bg-yellow-950/30">
          <Clock className="h-3 w-3 mr-1" /> Pendiente
        </Badge>
      );
    case 'fallida':
      return (
        <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-950/30">
          <XCircle className="h-3 w-3 mr-1" /> OCR fallido
        </Badge>
      );
    default:
      return <Badge variant="secondary">{estado}</Badge>;
  }
}

function getRevisionBadge(estado: string) {
  switch (estado) {
    case 'pendiente':
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="h-3 w-3 mr-1" /> Pendiente revisión</Badge>;
    case 'aprobado':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="h-3 w-3 mr-1" /> Aprobado</Badge>;
    case 'rechazado':
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rechazado</Badge>;
    case 'editado':
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"><Edit className="h-3 w-3 mr-1" /> Editado</Badge>;
    default:
      return null;
  }
}

function getTipoIcon(tipo: string) {
  switch (tipo) {
    case 'laboratorio': return Search;
    default: return FileText;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

export function DocumentosPaciente({ pacienteId }: { pacienteId: string }) {
  const [docs, setDocs] = useState<DocumentoMedico[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState('');
  const [reasonId, setReasonId] = useState<string | null>(null);
  const [reasonText, setReasonText] = useState('');

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`/api/documentos?pacienteId=${pacienteId}`);
      if (res.ok) {
        const data = await res.json();
        setDocs(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [pacienteId]);

  useEffect(() => { cargar(); }, [cargar]);

  async function handleAprobar(id: string) {
    setActionId(id);
    try {
      await fetch(`/api/documentos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'aprobar' }),
      });
      cargar();
    } catch { /* ignore */ }
    finally { setActionId(null); }
  }

  async function handleRechazar(id: string) {
    const motivo = reasonText || 'Documento rechazado por el médico';
    setActionId(id);
    try {
      await fetch(`/api/documentos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'rechazar', motivoRechazo: motivo }),
      });
      cargar();
    } catch { /* ignore */ }
    finally {
      setActionId(null);
      setReasonId(null);
      setReasonText('');
    }
  }

  async function handleEditSave(id: string) {
    try {
      const parsed = JSON.parse(editForm);
      setActionId(id);
      await fetch(`/api/documentos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'editar', datosEditados: parsed }),
      });
      cargar();
    } catch {
      alert('JSON inválido. Verifica el formato.');
    } finally {
      setActionId(null);
      setEditingId(null);
      setEditForm('');
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Cargando documentos...
        </CardContent>
      </Card>
    );
  }

  if (docs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Sin documentos subidos por el paciente</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Los documentos aparecerán aquí cuando el paciente los suba desde el portal
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {docs.map((doc) => {
        const TipoIcon = getTipoIcon(doc.tipo);
        const isPendingReview = doc.extraccionEstado === 'confirmado' && doc.estadoRevision === 'pendiente';
        return (
          <Card key={doc.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                    <TipoIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-medium text-sm truncate">{doc.filename || capitalize(doc.tipo)}</h4>
                      {getEstadoBadge(doc.extraccionEstado)}
                      {getRevisionBadge(doc.estadoRevision)}
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(doc.createdAt)}</p>

                    {doc.extraccionEstado === 'fallida' && (
                      <div className="mt-2 p-2 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
                        <p>Documento guardado. La extracción automática no fue posible.</p>
                        <p className="mt-0.5">Se requiere revisión manual.</p>
                      </div>
                    )}

                    {doc.datosExtraidos && Object.keys(doc.datosExtraidos).length > 0 && (
                      <div className="mt-2 p-3 rounded-lg bg-muted/30 text-xs space-y-0.5">
                        {Object.entries(doc.datosExtraidos).map(([key, val]) => (
                          <p key={key}>
                            <span className="font-medium capitalize text-muted-foreground">{key}: </span>
                            {String(val ?? '—')}
                          </p>
                        ))}
                        {doc.confianzaExtraccion !== null && (
                          <p className="mt-1 text-muted-foreground">
                            <AlertCircle className="h-3 w-3 inline mr-1" />
                            Confianza: {Math.round(doc.confianzaExtraccion)}%
                          </p>
                        )}
                      </div>
                    )}

                    {doc.textoOriginalOcr && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          Texto OCR original
                        </summary>
                        <p className="mt-1 text-xs text-muted-foreground/80 whitespace-pre-wrap max-h-32 overflow-y-auto p-2 rounded bg-muted/20">
                          {doc.textoOriginalOcr}
                        </p>
                      </details>
                    )}

                    {doc.estadoRevision === 'rechazado' && doc.metadata && (doc.metadata as Record<string, unknown>)?.motivoRechazo ? (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        <XCircle className="h-3 w-3 inline mr-1" />
                        Motivo: {String((doc.metadata as Record<string, unknown>).motivoRechazo)}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(doc.archivoUrl, '_blank')}
                    title="Ver original"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  {isPendingReview && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:text-green-400 dark:hover:bg-green-950/30"
                        disabled={actionId === doc.id}
                        onClick={() => handleAprobar(doc.id)}
                        title="Aprobar"
                      >
                        {actionId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                      </Button>

                      {reasonId === doc.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="Motivo (opcional)"
                            className="w-24 h-8 px-2 text-xs rounded border border-input bg-background"
                            value={reasonText}
                            onChange={(e) => setReasonText(e.target.value)}
                            autoFocus
                            onBlur={() => setTimeout(() => { setReasonId(null); setReasonText(''); }, 200)}
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600"
                            onClick={() => handleRechazar(doc.id)}>
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950/30"
                          disabled={actionId === doc.id}
                          onClick={() => setReasonId(doc.id)}
                          title="Rechazar"
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-950/30"
                        disabled={actionId === doc.id}
                        onClick={() => {
                          setEditingId(doc.id);
                          setEditForm(JSON.stringify(doc.datosExtraidos, null, 2));
                        }}
                        title="Editar datos"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  {doc.estadoRevision === 'aprobado' && doc.historialId && (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" title="Ver en historial" asChild>
                        <a href={`/dashboard/pacientes/${doc.pacienteId || pacienteId}?tab=historial`} target="_blank" rel="noreferrer">
                          <BookOpen className="h-4 w-4" />
                        </a>
                      </Button>
                      <Badge variant="secondary" className="text-xs bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300">
                        En historial
                      </Badge>
                    </>
                  )}
                </div>
              </div>

              {editingId === doc.id && (
                <div className="mt-3 space-y-2">
                  <textarea
                    className="w-full text-xs p-2 rounded border border-input bg-background resize-none font-mono"
                    rows={6}
                    value={editForm}
                    onChange={(e) => setEditForm(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleEditSave(doc.id)} disabled={actionId === doc.id}>
                      {actionId === doc.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                      Guardar edición
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditForm(''); }}>
                      Cancelar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Edita el JSON con los datos extraídos. Los cambios se guardarán al aprobar.</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
