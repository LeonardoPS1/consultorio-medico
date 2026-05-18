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
  // Intentar cargar datos de la organización para el encabezado
  fetch('/api/organization')
    .then(r => r.json())
    .then(resp => {
      const org = resp.data || {};
      generarPDFReceta(receta, org);
    })
    .catch(() => generarPDFReceta(receta, {}));
}

function generarPDFReceta(receta: Receta, org: Record<string, string>) {
  const nombreOrg = org.nombre || 'Consultorio Médico';
  const direccion = org.direccion || '';
  const ciudad = org.ciudad || '';
  const telefono = org.telefono || '';
  const email = org.email || '';
  const logoUrl = org.logoUrl || '';
  const colorPrimario = org.colorPrimario || '#2563eb';

  const hoy = formatDate(new Date().toISOString(), "dd 'de' MMMM 'de' yyyy");
  const vence = formatDate(receta.vence, "dd 'de' MMMM 'de' yyyy");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Receta - ${receta.paciente}</title>
<style>
  @page { margin: 20mm 25mm; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    color: #1a1a1a;
    line-height: 1.6;
    padding: 0;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 20px;
    padding-bottom: 20px;
    border-bottom: 3px solid ${colorPrimario};
    margin-bottom: 30px;
  }
  .header-logo {
    width: 70px;
    height: 70px;
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
    background: ${colorPrimario};
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 28px;
    font-weight: bold;
  }
  .header-logo img { width: 100%; height: 100%; object-fit: cover; }
  .header-info h1 { font-size: 20px; color: ${colorPrimario}; margin-bottom: 2px; }
  .header-info p { font-size: 12px; color: #666; }
  .titulo-documento {
    text-align: center;
    font-size: 16px;
    text-transform: uppercase;
    letter-spacing: 4px;
    color: #333;
    margin-bottom: 30px;
    padding-bottom: 10px;
    border-bottom: 1px solid #ddd;
  }
  .receta-content {
    background: #fafafa;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    padding: 30px;
    margin-bottom: 30px;
  }
  .paciente-info {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 30px;
    margin-bottom: 25px;
    padding-bottom: 20px;
    border-bottom: 1px dashed #ddd;
  }
  .paciente-info .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .paciente-info .value { font-size: 15px; font-weight: 600; color: #1a1a1a; }
  .prescripcion { margin-bottom: 20px; }
  .prescripcion h3 {
    font-size: 13px;
    color: ${colorPrimario};
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 10px;
  }
  .prescripcion-item {
    background: white;
    border-left: 4px solid ${colorPrimario};
    padding: 15px 20px;
    border-radius: 0 8px 8px 0;
  }
  .prescripcion-item .medicamento { font-size: 18px; font-weight: 700; color: #1a1a1a; }
  .prescripcion-item .detalle { font-size: 13px; color: #555; margin-top: 5px; }
  .prescripcion-item .indicaciones { font-size: 13px; color: #666; margin-top: 8px; font-style: italic; }
  .fechas { display: flex; gap: 40px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e5e5; }
  .fechas div { text-align: center; }
  .fechas .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .fechas .value { font-size: 14px; font-weight: 600; margin-top: 2px; }
  .firma-area {
    margin-top: 50px;
    display: flex;
    justify-content: space-between;
    align-items: end;
  }
  .firma {
    text-align: center;
    min-width: 250px;
  }
  .firma-line {
    border-top: 2px solid #333;
    width: 250px;
    margin-bottom: 5px;
  }
  .firma-label { font-size: 11px; color: #666; }
  .footer {
    margin-top: 40px;
    padding-top: 15px;
    border-top: 1px solid #ddd;
    text-align: center;
    font-size: 10px;
    color: #999;
  }
  .footer strong { color: #666; }
  @media print {
    body { padding: 0; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="header-logo">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo">` : nombreOrg.charAt(0).toUpperCase()}
    </div>
    <div class="header-info">
      <h1>${nombreOrg}</h1>
      <p>${[direccion, ciudad].filter(Boolean).join(', ')}</p>
      <p>${[telefono, email].filter(Boolean).join(' | ')}</p>
    </div>
  </div>

  <div class="titulo-documento">Receta Médica</div>

  <div class="receta-content">
    <div class="paciente-info">
      <div><div class="label">Paciente</div><div class="value">${receta.paciente}</div></div>
      <div><div class="label">Fecha de emisión</div><div class="value">${hoy}</div></div>
    </div>

    <div class="prescripcion">
      <h3>Prescripción</h3>
      <div class="prescripcion-item">
        <div class="medicamento">${receta.medicamento}</div>
        <div class="detalle"><strong>Dosis:</strong> ${receta.dosis} &nbsp;·&nbsp; <strong>Duración:</strong> ${receta.duracion}</div>
        ${receta.indicaciones ? `<div class="indicaciones">📋 ${receta.indicaciones}</div>` : ''}
      </div>
    </div>

    <div class="fechas">
      <div><div class="label">Fecha de emisión</div><div class="value">${hoy}</div></div>
      <div><div class="label">Válida hasta</div><div class="value">${vence}</div></div>
    </div>
  </div>

  <div class="firma-area">
    <div></div>
    <div class="firma">
      <div class="firma-line"></div>
      <div class="firma-label">${org.firmaNombre || 'Firma del profesional'}</div>
    </div>
  </div>

  <div class="footer">
    <strong>${nombreOrg}</strong> &nbsp;·&nbsp; Documento generado electrónicamente el ${hoy}
  </div>

  <div class="no-print" style="text-align:center;margin-top:30px;padding-top:20px;border-top:2px dashed #ddd">
    <button onclick="window.print()" style="padding:10px 30px;background:${colorPrimario};color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer">💾 Guardar como PDF / Imprimir</button>
    <p style="font-size:12px;color:#888;margin-top:8px">Hacé clic en "Guardar como PDF" en el diálogo de impresión</p>
  </div>
</body>
</html>`;

  const ventana = window.open('', '_blank');
  if (!ventana) {
    toast({ title: '❌ Error', description: 'Permití ventanas emergentes para abrir la receta', variant: 'destructive' });
    return;
  }
  ventana.document.write(html);
  ventana.document.close();
  toast({ title: '📄 Receta generada', description: `${receta.medicamento} - ${receta.paciente}` });
}

function enviarRecetaWhatsApp(receta: Receta) {
  // Intentar cargar el nombre real de la organización
  fetch('/api/organization')
    .then(r => r.json())
    .then(resp => {
      const org = resp.data || {};
      const nombreOrg = org.nombre || 'Consultorio Médico';
      const texto = encodeURIComponent(
        `📋 *RECETA MÉDICA*%0A%0A` +
        `Paciente: ${receta.paciente}%0A` +
        `Medicamento: ${receta.medicamento}%0A` +
        `Dosis: ${receta.dosis}%0A` +
        `Duración: ${receta.duracion}%0A` +
        (receta.indicaciones ? `Indicaciones: ${receta.indicaciones}%0A` : '') +
        `%0AVence: ${formatDate(receta.vence, 'dd/MM/yyyy')}%0A%0A` +
        `Enviado desde ${nombreOrg}`
      );
      window.open(`https://wa.me/?text=${texto}`, '_blank');
      toast({ title: '📱 Abriendo WhatsApp', description: 'Se abrirá una ventana para enviar la receta' });
    })
    .catch(() => {
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
    });
}

function imprimirReceta(receta: Receta) {
  fetch('/api/organization')
    .then(r => r.json())
    .then(resp => {
      const org = resp.data || {};
      const html = generarHTMLReceta(receta, org, true);
      const ventana = window.open('', '_blank');
      if (ventana) { ventana.document.write(html); ventana.document.close(); }
    })
    .catch(() => {
      const html = generarHTMLReceta(receta, {}, true);
      const ventana = window.open('', '_blank');
      if (ventana) { ventana.document.write(html); ventana.document.close(); }
    });
}

function generarHTMLReceta(receta: Receta, org: Record<string, string>, autoPrint: boolean = false): string {
  const nombreOrg = org.nombre || 'Consultorio Médico';
  const direccion = org.direccion || '';
  const ciudad = org.ciudad || '';
  const telefono = org.telefono || '';
  const email = org.email || '';
  const logoUrl = org.logoUrl || '';
  const colorPrimario = org.colorPrimario || '#2563eb';
  const hoy = formatDate(new Date().toISOString(), "dd 'de' MMMM 'de' yyyy");
  const vence = formatDate(receta.vence, "dd 'de' MMMM 'de' yyyy");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Receta - ${receta.paciente}</title>
<style>
  @page { margin: 20mm 25mm; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    color: #1a1a1a; line-height: 1.6; padding: 0;
  }
  .header {
    display: flex; align-items: center; gap: 20px;
    padding-bottom: 20px; border-bottom: 3px solid ${colorPrimario}; margin-bottom: 25px;
  }
  .header-logo {
    width: 65px; height: 65px; border-radius: 12px; overflow: hidden; flex-shrink: 0;
    background: ${colorPrimario}; display: flex; align-items: center; justify-content: center;
    color: white; font-size: 26px; font-weight: bold;
  }
  .header-logo img { width: 100%; height: 100%; object-fit: cover; }
  .header-info h1 { font-size: 18px; color: ${colorPrimario}; margin-bottom: 2px; }
  .header-info p { font-size: 11px; color: #666; }
  .titulo-receta {
    text-align: center; font-size: 15px; text-transform: uppercase; letter-spacing: 4px;
    color: #333; margin-bottom: 25px; padding-bottom: 8px; border-bottom: 1px solid #ddd;
  }
  .receta-body {
    background: #fafafa; border: 1px solid #e5e5e5; border-radius: 8px; padding: 25px; margin-bottom: 25px;
  }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 30px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px dashed #ddd; }
  .grid-2 .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .grid-2 .value { font-size: 14px; font-weight: 600; color: #1a1a1a; }
  .med-section h3 { font-size: 12px; color: ${colorPrimario}; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
  .med-card {
    background: white; border-left: 4px solid ${colorPrimario};
    padding: 14px 18px; border-radius: 0 8px 8px 0;
  }
  .med-card .name { font-size: 17px; font-weight: 700; color: #1a1a1a; }
  .med-card .detail { font-size: 12px; color: #555; margin-top: 4px; }
  .med-card .notes { font-size: 12px; color: #666; margin-top: 6px; font-style: italic; }
  .fechas-row { display: flex; gap: 30px; margin-top: 15px; padding-top: 12px; border-top: 1px solid #e5e5e5; }
  .fechas-row div { text-align: center; }
  .fechas-row .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .fechas-row .value { font-size: 13px; font-weight: 600; margin-top: 2px; }
  .firma-area { margin-top: 45px; display: flex; justify-content: space-between; align-items: end; }
  .firma-box { text-align: center; min-width: 220px; }
  .firma-line { border-top: 2px solid #333; width: 220px; margin-bottom: 4px; }
  .firma-label { font-size: 10px; color: #666; }
  .footer-text { margin-top: 30px; padding-top: 12px; border-top: 1px solid #ddd; text-align: center; font-size: 10px; color: #999; }
  .footer-text strong { color: #666; }
  .print-btn { text-align: center; margin-top: 25px; padding-top: 20px; border-top: 2px dashed #ddd; }
  .print-btn button { padding: 10px 30px; background: ${colorPrimario}; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
  .print-btn p { font-size: 11px; color: #888; margin-top: 6px; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <div class="header-logo">${logoUrl ? `<img src="${logoUrl}" alt="Logo">` : nombreOrg.charAt(0).toUpperCase()}</div>
    <div class="header-info">
      <h1>${nombreOrg}</h1>
      <p>${[direccion, ciudad].filter(Boolean).join(', ')}</p>
      <p>${[telefono, email].filter(Boolean).join(' | ')}</p>
    </div>
  </div>
  <div class="titulo-receta">Receta Médica</div>
  <div class="receta-body">
    <div class="grid-2">
      <div><div class="label">Paciente</div><div class="value">${receta.paciente}</div></div>
      <div><div class="label">Fecha de emisión</div><div class="value">${hoy}</div></div>
    </div>
    <div class="med-section">
      <h3>Prescripción</h3>
      <div class="med-card">
        <div class="name">${receta.medicamento}</div>
        <div class="detail"><strong>Dosis:</strong> ${receta.dosis} · <strong>Duración:</strong> ${receta.duracion}</div>
        ${receta.indicaciones ? `<div class="notes">📋 ${receta.indicaciones}</div>` : ''}
      </div>
    </div>
    <div class="fechas-row">
      <div><div class="label">Emisión</div><div class="value">${hoy}</div></div>
      <div><div class="label">Válida hasta</div><div class="value">${vence}</div></div>
    </div>
  </div>
  <div class="firma-area">
    <div></div>
    <div class="firma-box">
      <div class="firma-line"></div>
      <div class="firma-label">${org.firmaNombre || 'Firma del profesional'}</div>
    </div>
  </div>
  <div class="footer-text"><strong>${nombreOrg}</strong> · Documento generado electrónicamente el ${hoy}</div>
  ${autoPrint ? '<div class="print-btn"><button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button><p>Seleccioná "Guardar como PDF" en el diálogo de impresión</p></div>' : ''}
  ${autoPrint ? '' : '<script>window.print();window.close();</script>'}
</body>
</html>`;
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
      <div key={receta.id} className="flex items-center gap-4 p-4 hoverable:hover:bg-muted/50 transition-colors">
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
