'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Edit3,
  Trash2,
  Loader2,
  Scan,
  AlertCircle,
  Eye,
  Save,
} from 'lucide-react';
import { PortalCard } from '@/components/portal/portal-card';
import { PortalBadge } from '@/components/portal/portal-badge';
import { PortalSkeleton } from '@/components/portal/portal-skeleton';
import { Button } from '@/components/ui/button';

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
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getEstadoBadge(estado: string) {
  switch (estado) {
    case 'completada':
      return <PortalBadge variant="warning" className="flex items-center gap-1"><Scan className="h-3 w-3" /> Extraído — revisa</PortalBadge>;
    case 'confirmado':
      return <PortalBadge variant="success" className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Confirmado</PortalBadge>;
    case 'pendiente':
      return <PortalBadge variant="warning" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pendiente</PortalBadge>;
    case 'fallida':
      return <PortalBadge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Falló OCR</PortalBadge>;
    default:
      return <span className="text-xs text-portal-muted-fg">{estado}</span>;
  }
}

function getRevisionBadge(estado: string) {
  switch (estado) {
    case 'pendiente':
      return <PortalBadge variant="warning" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pendiente revisión médica</PortalBadge>;
    case 'aprobado':
      return <PortalBadge variant="success" className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Aprobado — en historial</PortalBadge>;
    case 'rechazado':
      return <PortalBadge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Rechazado</PortalBadge>;
    default:
      return null;
  }
}

export default function PortalDocumentosPage() {
  const [docs, setDocs] = useState<DocumentoMedico[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState('');
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const cargar = useCallback(() => {
    fetch('/api/portal/documentos')
      .then((res) => res.json())
      .then((data) => {
        const list = data?.documentos || data || [];
        setDocs(Array.isArray(list) ? list : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/portal/documentos', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Error al subir');
      const data = await res.json();
      const doc = data?.documento || data;
      setDocs((prev) => [doc, ...prev]);
      setProcessingId(doc.id);
      pollOcrResult(doc.id);
    } catch {
      alert('Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  }

  function pollOcrResult(id: string) {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/portal/documentos');
        if (!res.ok) return;
        const data = await res.json();
        const list = data?.documentos || data || [];
        const updated = Array.isArray(list) ? list.find((d: DocumentoMedico) => d.id === id) : null;
        if (!updated) return;
        if (updated.extraccionEstado !== 'pendiente') {
          clearInterval(interval);
          setProcessingId(null);
          setDocs((prev) => prev.map((d) => (d.id === id ? updated : d)));
        }
      } catch { /* ignore */ }
    }, 2000);
    setTimeout(() => { clearInterval(interval); setProcessingId(null); }, 60000);
  }

  async function handleConfirm(id: string) {
    const res = await fetch(`/api/portal/documentos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'confirmar' }),
    });
    if (res.ok) {
      setConfirmMessage('Datos confirmados. El médico los revisará para incorporarlos a tu historial.');
      setTimeout(() => setConfirmMessage(null), 5000);
      cargar();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este documento?')) return;
    const res = await fetch(`/api/portal/documentos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'eliminar' }),
    });
    if (res.ok) setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  function handleEditSave(id: string) {
    setDocs((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, datosExtraidos: { ...d.datosExtraidos, textoEditado: editData } } : d,
      ),
    );
    setEditingId(null);
    setEditData('');
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    if (fileRef.current) fileRef.current.value = '';
  }

  if (loading) return <PortalSkeleton />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 text-portal-fg">Mis Documentos</h1>
      <p className="text-sm mb-6 text-portal-muted-fg">
        Subí estudios, recetas o certificados para procesarlos automáticamente
      </p>

      {confirmMessage && (
        <div className="mb-4 p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {confirmMessage}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <PortalCard
        className="mb-6 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => fileRef.current?.click()}
      >
        <div className="flex flex-col items-center py-6 gap-2">
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-portal-primary" />
          ) : (
            <Upload className="h-8 w-8 text-portal-primary" />
          )}
          <span className="text-sm font-medium text-portal-fg">
            {uploading ? 'Subiendo...' : 'Subir documento'}
          </span>
          <span className="text-xs text-portal-muted-fg">JPG, PNG o PDF — Máx 20MB</span>
        </div>
      </PortalCard>

      {processingId && (
        <PortalCard className="mb-4">
          <div className="flex items-center gap-3 py-2">
            <Scan className="h-5 w-5 animate-pulse text-portal-primary" />
            <div>
              <p className="text-sm font-medium text-portal-fg">Procesando OCR...</p>
              <p className="text-xs text-portal-muted-fg">Extrayendo datos del documento</p>
            </div>
          </div>
        </PortalCard>
      )}

      {docs.length === 0 && !processingId && (
        <div className="text-center py-16 text-portal-muted-fg/70">
          <div className="rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 bg-portal-muted">
            <FileText className="h-6 w-6" />
          </div>
          <p>Aún no subiste documentos</p>
          <p className="text-sm mt-2">Subí una foto o PDF para extraer los datos automáticamente</p>
        </div>
      )}

      <div className="space-y-3">
        {docs.map((doc) => (
          <PortalCard key={doc.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-portal-muted">
                  <FileText className="h-5 w-5 text-portal-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-medium truncate text-portal-fg">
                      {doc.filename || 'Documento'}
                    </h3>
                    {getEstadoBadge(doc.extraccionEstado)}
                    {getRevisionBadge(doc.estadoRevision)}
                  </div>
                  <p className="text-xs text-portal-muted-fg">{formatDate(doc.createdAt)}</p>

                  {doc.extraccionEstado === 'fallida' && (
                    <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                      <p className="font-medium mb-1">Documento guardado</p>
                      <p>No se pudieron extraer los datos automáticamente. El médico lo revisará manualmente para incorporarlo a tu historial.</p>
                    </div>
                  )}

                  {doc.extraccionEstado === 'completada' && doc.datosExtraidos && (
                    <div className="mt-3 p-3 rounded-xl bg-portal-muted/50 space-y-1">
                      {editingId === doc.id ? (
                        <div className="space-y-2">
                          <textarea
                            className="w-full text-sm p-2 rounded-lg border border-portal-border-light bg-white/50 dark:bg-black/20 resize-none"
                            rows={4}
                            value={editData}
                            onChange={(e) => setEditData(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleEditSave(doc.id)}>
                              <Save className="h-3 w-3 mr-1" /> Guardar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {Object.entries(doc.datosExtraidos).map(([key, val]) => (
                            <p key={key} className="text-sm text-portal-fg">
                              <span className="font-medium capitalize text-portal-muted-fg">{key}: </span>
                              {String(val ?? '—')}
                            </p>
                          ))}
                          {doc.confianzaExtraccion !== null && (
                            <div className="flex items-center gap-1 mt-1">
                              <AlertCircle className="h-3 w-3 text-portal-muted-fg" />
                              <span className="text-xs text-portal-muted-fg">
                                Confianza: {Math.round(doc.confianzaExtraccion)}%
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {doc.extraccionEstado === 'confirmado' && doc.datosExtraidos && (
                    <div className="mt-3 p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 space-y-1">
                      {Object.entries(doc.datosExtraidos).map(([key, val]) => (
                        <p key={key} className="text-sm text-portal-fg">
                          <span className="font-medium capitalize text-portal-muted-fg">{key}: </span>
                          {String(val ?? '—')}
                        </p>
                      ))}
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        <CheckCircle2 className="h-3 w-3 inline mr-1" />
                        Confirmado — pendiente de revisión médica
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => window.open(doc.archivoUrl, '_blank')}
                  className="p-2 rounded-lg hover:bg-portal-muted/50 text-portal-muted-fg transition-colors"
                  title="Ver original"
                >
                  <Eye className="h-4 w-4" />
                </button>

                {doc.extraccionEstado === 'completada' && doc.estadoRevision === 'pendiente' && (
                  <>
                    <button
                      onClick={() => handleConfirm(doc.id)}
                      className="p-2 rounded-lg hover:bg-portal-primary/10 text-portal-primary transition-colors"
                      title="Confirmar datos"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(doc.id);
                        setEditData(JSON.stringify(doc.datosExtraidos, null, 2));
                      }}
                      className="p-2 rounded-lg hover:bg-portal-muted/50 text-portal-muted-fg transition-colors"
                      title="Editar datos"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </>
                )}

                {doc.extraccionEstado !== 'confirmado' && (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 text-portal-muted-fg hover:text-red-500 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </PortalCard>
        ))}
      </div>
    </div>
  );
}
