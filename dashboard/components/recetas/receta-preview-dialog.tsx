'use client';

import { Download, Loader2, Printer, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  descargarReceta,
  enviarRecetaWhatsApp,
  generarHtmlReceta,
  imprimirReceta,
  type RecetaLike,
} from '@/lib/receta-pdf';

interface RecetaPreviewDialogProps {
  receta: RecetaLike;
  onClose: () => void;
}

/**
 * Dialog de vista previa de una receta (HTML generado en tiempo real).
 * Reutilizable entre el dashboard del médico y el portal del paciente.
 * Se monta de forma condicional desde el padre (con key) para que el estado
 * arranque fresco en cada apertura.
 * @param root0
 * @param root0.receta
 * @param root0.onClose
 */
export function RecetaPreviewDialog({ receta, onClose }: RecetaPreviewDialogProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;
    generarHtmlReceta(receta)
      .then((h) => {
        if (!cancelado) setHtml(h);
      })
      .catch(() => {
        if (!cancelado) setError(true);
      });
    return () => {
      cancelado = true;
    };
  }, [receta]);

  const cargando = html === null && !error;

  const handleDescargar = () => {
    void descargarReceta(receta);
  };

  const handleImprimir = () => {
    void imprimirReceta(receta);
  };

  const handleWhatsApp = () => {
    void enviarRecetaWhatsApp(receta);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Vista previa de receta</DialogTitle>
          <DialogDescription>{receta.medicamento}</DialogDescription>
        </DialogHeader>
        <div className="h-[60vh] overflow-hidden rounded-lg border bg-white">
          {cargando ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
              No se pudo generar la vista previa de esta receta.
            </div>
          ) : (
            <iframe
              title={`Vista previa - ${receta.medicamento}`}
              srcDoc={html ?? ''}
              className="h-full w-full"
              sandbox="allow-same-origin"
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleWhatsApp}>
            <Send className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
          <Button variant="outline" onClick={handleImprimir}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={handleDescargar}>
            <Download className="h-4 w-4 mr-2" />
            Descargar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
