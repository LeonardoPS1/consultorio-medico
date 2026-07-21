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
  Trash2,
  Download,
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
    default:
      return null;
  }
}

export function DocumentosPaciente({ pacienteId }: { pacienteId: string }) {
  const [docs, setDocs] = useState<DocumentoMedico[]>([]);
  const [loading, setLoading] = useState(true);

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
      {docs.map((doc) => (
        <Card key={doc.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="font-medium text-sm truncate">{doc.filename || 'Documento'}</h4>
                    {getEstadoBadge(doc.extraccionEstado)}
                    {getRevisionBadge(doc.estadoRevision)}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(doc.createdAt)}</p>

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
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => window.open(doc.archivoUrl, '_blank')}
                  title="Ver archivo"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
