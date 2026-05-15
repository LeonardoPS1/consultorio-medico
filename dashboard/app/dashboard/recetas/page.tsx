'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Syringe, Download, Send, AlertCircle, RotateCcw, FileText, Printer } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NuevaRecetaModal } from '@/components/modals/nueva-receta-modal';
import { toast } from '@/components/ui/use-toast';

// ============================================================
// Funciones auxiliares para acciones de recetas
// ============================================================

function descargarReceta(receta: Receta) {
  const contenido = [
    '========================================',
    '        RECETA MÉDICA',
    '========================================',
    '',
    `Paciente: ${receta.paciente}`,
    `Medicamento: ${receta.medicamento}`,
    `Dosis: ${receta.dosis}`,
    `Duración: ${receta.duracion}`,
    receta.indicaciones ? `Indicaciones: ${receta.indicaciones}` : '',
    '',
    `Fecha: ${formatDate(new Date().toISOString(), 'dd/MM/yyyy')}`,
    `Vence: ${formatDate(receta.vence, 'dd/MM/yyyy')}`,
    '',
    '========================================',
    '  Consultorio Médico',
    '  Firma del profesional',
    '========================================',
  ].filter(Boolean).join('\n');

  const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `receta-${receta.paciente.replace(/\s+/g, '-').toLowerCase()}-${receta.medicamento.replace(/\s+/g, '-').toLowerCase()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toast({ title: '✅ Receta descargada', description: `${receta.medicamento} - ${receta.paciente}` });
}

function enviarRecetaWhatsApp(receta: Receta) {
  const texto = encodeURIComponent(
    `📋 *RECETA MÉDICA*%0A%0A` +
    `Paciente: ${receta.paciente}%0A` +
    `Medicamento: ${receta.medicamento}%0A` +
    `Dosis: ${receta.dosis}%0A` +
    `Duración: ${receta.duracion}%0A` +
    (receta.indicaciones ? `Indicaciones: ${receta.indicaciones}%0A` : '') +
    `%0AVence: ${formatDate(receta.vence, 'dd/MM/yyyy')}%0A%0A` +
    `Enviado desde Consultorio Médico`
  );
  window.open(`https://wa.me/?text=${texto}`, '_blank');
  toast({ title: '📱 Abriendo WhatsApp', description: 'Se abrirá una ventana para enviar la receta' });
}

function imprimirReceta(receta: Receta) {
  const ventana = window.open('', '_blank');
  if (!ventana) {
    toast({ title: '❌ Error', description: 'Permití ventanas emergentes para imprimir', variant: 'destructive' });
    return;
  }
  ventana.document.write(`
    <html>
    <head><title>Receta - ${receta.paciente}</title>
    <style>
      body { font-family: 'Courier New', monospace; padding: 40px; max-width: 600px; margin: 0 auto; }
      h1 { text-align: center; font-size: 18px; border-bottom: 2px solid #000; padding-bottom: 10px; }
      .header { text-align: center; margin-bottom: 30px; }
      .header h2 { margin: 0; font-size: 14px; }
      .content { line-height: 2; font-size: 14px; }
      .content strong { display: inline-block; width: 120px; }
      .footer { margin-top: 40px; border-top: 1px solid #999; padding-top: 20px; font-size: 12px; text-align: center; color: #666; }
      .firma { margin-top: 50px; border-top: 1px solid #000; width: 250px; text-align: center; padding-top: 5px; font-size: 12px; margin-left: auto; margin-right: auto; }
      @media print { body { padding: 20px; } }
    </style>
    </head>
    <body>
      <h1>RECETA MÉDICA</h1>
      <div class="header"><h2>Consultorio Médico</h2></div>
      <div class="content">
        <p><strong>Paciente:</strong> ${receta.paciente}</p>
        <p><strong>Medicamento:</strong> ${receta.medicamento}</p>
        <p><strong>Dosis:</strong> ${receta.dosis}</p>
        <p><strong>Duración:</strong> ${receta.duracion}</p>
        ${receta.indicaciones ? `<p><strong>Indicaciones:</strong> ${receta.indicaciones}</p>` : ''}
        <p><strong>Fecha:</strong> ${formatDate(new Date().toISOString(), 'dd/MM/yyyy')}</p>
        <p><strong>Vence:</strong> ${formatDate(receta.vence, 'dd/MM/yyyy')}</p>
      </div>
      <div class="firma">Firma del profesional</div>
      <div class="footer">Documento generado electrónicamente - Consultorio Médico</div>
      <script>window.print();window.close();</script>
    </body>
    </html>
  `);
  ventana.document.close();
}

function renovarReceta(receta: Receta, setRecetas: React.Dispatch<React.SetStateAction<Receta[]>>) {
  const nuevaVence = new Date();
  nuevaVence.setDate(nuevaVence.getDate() + 30);

  const renovada: Receta = {
    ...receta,
    id: String(Date.now()),
    estado: 'activa',
    fechaCreacion: new Date().toISOString().split('T')[0],
    vence: nuevaVence.toISOString().split('T')[0],
    renovable: true,
  };

  setRecetas((prev: Receta[]) => [renovada, ...prev]);
  toast({
    title: '🔄 Receta renovada',
    description: `${receta.medicamento} para ${receta.paciente} - Vence ${formatDate(renovada.vence, 'dd/MM/yyyy')}`,
  });
}

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

const initialRecetas: Receta[] = [
  { id: '1', paciente: 'Juan Pérez', medicamento: 'Amoxicilina 500mg', dosis: '1 comprimido c/8hs', duracion: '7 días', estado: 'activa', vence: '2026-05-21', renovable: true, fechaCreacion: '2026-05-14' },
  { id: '2', paciente: 'María García', medicamento: 'Ibuprofeno 600mg', dosis: '1 comprimido c/12hs', duracion: '5 días', estado: 'activa', vence: '2026-05-19', renovable: true, fechaCreacion: '2026-05-14' },
  { id: '3', paciente: 'Pedro Sánchez', medicamento: 'Enalapril 10mg', dosis: '1 comprimido por día', duracion: '30 días', estado: 'activa', vence: '2026-06-10', renovable: true, fechaCreacion: '2026-05-11' },
  { id: '4', paciente: 'Ana López', medicamento: 'Omeprazol 20mg', dosis: '1 comprimido en ayunas', duracion: '15 días', estado: 'vencida', vence: '2026-05-01', renovable: true, fechaCreacion: '2026-04-16' },
  { id: '5', paciente: 'Juan Pérez', medicamento: 'Losartán 50mg', dosis: '1 comprimido por día', duracion: '30 días', estado: 'vencida', vence: '2026-04-30', renovable: true, fechaCreacion: '2026-03-31' },
  { id: '6', paciente: 'Sofía Herrera', medicamento: 'Paracetamol 1g', dosis: '1 comprimido c/6hs si dolor', duracion: '5 días', estado: 'historial', vence: '2026-03-15', renovable: false, fechaCreacion: '2026-03-10' },
];

export default function RecetasPage() {
  const [recetas, setRecetas] = useState(initialRecetas);
  const [showNewReceta, setShowNewReceta] = useState(false);

  const handleNuevaReceta = (data: { paciente: string; medicamento: string; dosis: string; duracion: string; indicaciones: string }) => {
    const newReceta: Receta = {
      id: String(Date.now()),
      paciente: data.paciente,
      medicamento: data.medicamento,
      dosis: data.dosis,
      duracion: data.duracion || 'Según indicación',
      estado: 'activa',
      vence: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      renovable: true,
      fechaCreacion: new Date().toISOString().split('T')[0],
      indicaciones: data.indicaciones,
    };
    setRecetas((prev) => [newReceta, ...prev]);
  };

  const renderRecetaCard = (receta: Receta, variant: 'activa' | 'vencida' | 'historial') => {
    const isActiva = variant === 'activa';
    const isVencida = variant === 'vencida';

    return (
      <div key={receta.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
          isActiva
            ? 'bg-emerald-100 dark:bg-emerald-900/30'
            : isVencida
            ? 'bg-red-100 dark:bg-red-900/30'
            : 'bg-muted'
        }`}>
          {isActiva ? (
            <Syringe className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          ) : isVencida ? (
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          ) : (
            <FileText className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium">{receta.paciente}</p>
          <p className="text-sm text-muted-foreground">{receta.medicamento}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {receta.dosis} · {receta.duracion}
          </p>
          {receta.indicaciones && (
            <p className="text-xs text-muted-foreground/70 mt-0.5 italic">
              {receta.indicaciones}
            </p>
          )}
        </div>
        <div className="text-sm text-muted-foreground text-center min-w-[50px]">
          <p className="text-xs">
            {isActiva ? 'Vence' : isVencida ? 'Venció' : 'Creada'}
          </p>
          <p className="font-medium text-foreground">
            {formatDate(isActiva || isVencida ? receta.vence : receta.fechaCreacion, 'dd/MM')}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost" size="icon" title="Descargar"
            onClick={(e) => { e.stopPropagation(); descargarReceta(receta); }}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="icon" title="Enviar por WhatsApp"
            onClick={(e) => { e.stopPropagation(); enviarRecetaWhatsApp(receta); }}
          >
            <Send className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="icon" title="Imprimir"
            onClick={(e) => { e.stopPropagation(); imprimirReceta(receta); }}
          >
            <Printer className="h-4 w-4" />
          </Button>
          {(isActiva || isVencida) && receta.renovable && (
            <Button
              variant="outline" size="sm" className="text-xs"
              onClick={(e) => { e.stopPropagation(); renovarReceta(receta, setRecetas); }}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Renovar
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Recetas</h2>
          <p className="text-muted-foreground">
            Recetas activas, vencidas y renovaciones
          </p>
        </div>
        <Button onClick={() => setShowNewReceta(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Receta
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-emerald-500/5 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{recetas.filter(r => r.estado === 'activa').length}</p>
          <p className="text-xs text-muted-foreground">Activas</p>
        </div>
        <div className="rounded-lg bg-red-500/5 p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{recetas.filter(r => r.estado === 'vencida').length}</p>
          <p className="text-xs text-muted-foreground">Vencidas</p>
        </div>
        <div className="rounded-lg bg-blue-500/5 p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{recetas.filter(r => r.estado === 'historial').length}</p>
          <p className="text-xs text-muted-foreground">Historial</p>
        </div>
      </div>

      <Tabs defaultValue="activas">
        <TabsList>
          <TabsTrigger value="activas">Activas</TabsTrigger>
          <TabsTrigger value="vencidas">Vencidas</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="activas" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {recetas.filter(r => r.estado === 'activa').length === 0 ? (
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
                  {recetas.filter(r => r.estado === 'activa').map((r) => renderRecetaCard(r, 'activa'))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vencidas" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {recetas.filter(r => r.estado === 'vencida').length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Sin recetas vencidas</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">No hay recetas vencidas</p>
                </div>
              ) : (
                <div className="divide-y">
                  {recetas.filter(r => r.estado === 'vencida').map((r) => renderRecetaCard(r, 'vencida'))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {recetas.filter(r => r.estado === 'historial').length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48">
                  <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Historial completo de recetas por paciente</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Las recetas anteriores aparecerán aquí</p>
                </div>
              ) : (
                <div className="divide-y">
                  {recetas.filter(r => r.estado === 'historial').map((r) => renderRecetaCard(r, 'historial'))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NuevaRecetaModal
        open={showNewReceta}
        onOpenChange={setShowNewReceta}
        onSubmit={handleNuevaReceta}
      />
    </div>
  );
}
