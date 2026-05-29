'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  QrCode,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NuevaRecetaModal } from '@/components/modals/nueva-receta-modal';
import { toast } from '@/components/ui/use-toast';


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

// ─── Helpers ──────────────────────────────────────────────

function descargarReceta(receta: Receta) {
  fetch('/api/organization')
    .then((r) => r.json())
    .then(async (resp) => {
      const org = resp.data || {};
      await generarPDFReceta(receta, org);
    })
    .catch(() => generarPDFReceta(receta, {}));
}

async function generarPDFReceta(receta: Receta, org: Record<string, string>) {
  // Generar QR code de verificacion con firma digital
  let qrDataUrl = '';
  try {
    const QRCode = await import('qrcode');
    const baseUrl = typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : 'https://med.aicorebots.com';
    const verificationUrl = `${baseUrl}/verificar-receta/${receta.id}`;
    qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 120,
      margin: 2,
      color: { dark: '#1a1a1a', light: '#ffffff' },
    });
  } catch {
    // QR fallback: sin QR si la lib no carga
  }
  const nombreOrg = org.nombre || 'Consultorio Médico';
  const direccion = org.direccion || '';
  const ciudad = org.ciudad || '';
  const telefono = org.telefono || '';
  const email = org.email || '';
  const logoUrl = org.logoUrl || '';
  const colorPrimario = org.colorPrimario || '#2563eb';

  const hoy = formatDate(
    new Date().toISOString(),
    "dd 'de' MMMM 'de' yyyy",
  );
  const vence = formatDate(receta.vence, "dd 'de' MMMM 'de' yyyy");

  const html = generarHTMLRecetaCompleta({
    nombreOrg,
    direccion,
    ciudad,
    telefono,
    email,
    logoUrl,
    colorPrimario,
    hoy,
    vence,
    receta,
    qrDataUrl,
  });

  const ventana = window.open('', '_blank');
  if (!ventana) {
    toast({
      title: '❌ Error',
      description:
        'Permití ventanas emergentes para abrir la receta',
      variant: 'destructive',
    });
    return;
  }
  ventana.document.write(html);
  ventana.document.close();
  toast({
    title: '📄 Receta generada',
    description: `${receta.medicamento} - ${receta.paciente}`,
  });
}

function enviarRecetaWhatsApp(receta: Receta) {
  fetch('/api/organization')
    .then((r) => r.json())
    .then((resp) => {
      const org = resp.data || {};
      const nombreOrg = org.nombre || 'Consultorio Médico';
      const texto = encodeURIComponent(
        `📋 *RECETA MÉDICA*%0A%0A` +
          `Paciente: ${receta.paciente}%0A` +
          `Medicamento: ${receta.medicamento}%0A` +
          `Dosis: ${receta.dosis}%0A` +
          `Duración: ${receta.duracion}%0A` +
          (receta.indicaciones
            ? `Indicaciones: ${receta.indicaciones}%0A`
            : '') +
          `%0AVence: ${formatDate(receta.vence, 'dd/MM/yyyy')}%0A%0A` +
          `Enviado desde ${nombreOrg}`,
      );
      window.open(`https://wa.me/?text=${texto}`, '_blank');
      toast({
        title: '📱 Abriendo WhatsApp',
        description:
          'Se abrirá una ventana para enviar la receta',
      });
    })
    .catch(() => {
      const texto = encodeURIComponent(
        `📋 *RECETA MÉDICA*%0A%0A` +
          `Paciente: ${receta.paciente}%0A` +
          `Medicamento: ${receta.medicamento}%0A` +
          `Dosis: ${receta.dosis}%0A` +
          `Duración: ${receta.duracion}%0A` +
          (receta.indicaciones
            ? `Indicaciones: ${receta.indicaciones}%0A`
            : '') +
          `%0AVence: ${formatDate(receta.vence, 'dd/MM/yyyy')}%0A%0A` +
          `Enviado desde Consultorio Médico`,
      );
      window.open(`https://wa.me/?text=${texto}`, '_blank');
      toast({
        title: '📱 Abriendo WhatsApp',
        description:
          'Se abrirá una ventana para enviar la receta',
      });
    });
}

async function imprimirReceta(receta: Receta) {
  fetch('/api/organization')
    .then((r) => r.json())
    .then(async (resp) => {
      const org = resp.data || {};
      let qrDataUrl = '';
      try {
        const QRCode = await import('qrcode');
        const baseUrl = typeof window !== 'undefined'
          ? `${window.location.protocol}//${window.location.host}`
          : 'https://med.aicorebots.com';
        qrDataUrl = await QRCode.toDataURL(`${baseUrl}/verificar-receta/${receta.id}`, { width: 120, margin: 2, color: { dark: '#1a1a1a', light: '#ffffff' } });
      } catch {}
      const html = generarHTMLRecetaCompletaConBoton({ ...org, receta, qrDataUrl } as any);
      const ventana = window.open('', '_blank');
      if (ventana) { ventana.document.write(html); ventana.document.close(); }
    })
    .catch(async () => {
      let qrDataUrl = '';
      try {
        const QRCode = await import('qrcode');
        const baseUrl = typeof window !== 'undefined'
          ? `${window.location.protocol}//${window.location.host}`
          : 'https://med.aicorebots.com';
        qrDataUrl = await QRCode.toDataURL(`${baseUrl}/verificar-receta/${receta.id}`, { width: 120, margin: 2, color: { dark: '#1a1a1a', light: '#ffffff' } });
      } catch {}
      const html = generarHTMLRecetaCompletaConBoton({ receta, qrDataUrl } as any);
      const ventana = window.open('', '_blank');
      if (ventana) { ventana.document.write(html); ventana.document.close(); }
    });
}

function generarHTMLRecetaCompletaConBoton(params: {
  nombreOrg?: string;
  direccion?: string;
  ciudad?: string;
  telefono?: string;
  email?: string;
  logoUrl?: string;
  colorPrimario?: string;
  hoy?: string;
  vence?: string;
  receta: Receta;
  qrDataUrl?: string;
}) {
  const nombreOrg = params.nombreOrg || 'Consultorio Medico';
  const hoy = params.hoy || formatDate(new Date().toISOString(), "dd 'de' MMMM 'de' yyyy");
  const vence = params.vence || formatDate(params.receta.vence, "dd 'de' MMMM 'de' yyyy");
  const colorPrimario = params.colorPrimario || '#2563eb';

  const base = generarHTMLRecetaCompleta({
    nombreOrg,
    direccion: params.direccion || '',
    ciudad: params.ciudad || '',
    telefono: params.telefono || '',
    email: params.email || '',
    logoUrl: params.logoUrl || '',
    colorPrimario,
    hoy,
    vence,
    receta: params.receta,
    qrDataUrl: params.qrDataUrl,
  });
  return base.replace(
    '</body>',
    `<div class="no-print" style="text-align:center;margin-top:30px;padding-top:20px;border-top:2px dashed #ddd">
    <button onclick="window.print()" style="padding:10px 30px;background:${colorPrimario};color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer">🖨️ Imprimir / Guardar PDF</button>
    <p style="font-size:12px;color:#888;margin-top:8px">Selecciona "Guardar como PDF" en el dialogo de impresion</p>
  </div>
</body>`,
  );
}

function generarHTMLRecetaCompleta(params: {
  nombreOrg: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  email: string;
  logoUrl: string;
  colorPrimario: string;
  hoy: string;
  vence: string;
  receta: Receta;
  qrDataUrl?: string;
}) {
  const {
    nombreOrg,
    direccion,
    ciudad,
    telefono,
    email,
    logoUrl,
    colorPrimario,
    hoy,
    vence,
    receta,
    qrDataUrl,
  } = params;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Receta - ${receta.paciente}</title>
<style>
  @page { margin: 20mm 25mm; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a1a; line-height: 1.6; }
  .header { display: flex; align-items: center; gap: 20px; padding-bottom: 20px; border-bottom: 3px solid ${colorPrimario}; margin-bottom: 30px; }
  .header-logo { width: 70px; height: 70px; border-radius: 12px; overflow: hidden; flex-shrink: 0; background: ${colorPrimario}; display: flex; align-items: center; justify-content: center; color: white; font-size: 28px; font-weight: bold; }
  .header-logo img { width: 100%; height: 100%; object-fit: cover; }
  .header-info h1 { font-size: 20px; color: ${colorPrimario}; margin-bottom: 2px; }
  .header-info p { font-size: 12px; color: #666; }
  .titulo-documento { text-align: center; font-size: 16px; text-transform: uppercase; letter-spacing: 4px; color: #333; margin-bottom: 30px; padding-bottom: 10px; border-bottom: 1px solid #ddd; }
  .receta-content { background: #fafafa; border: 1px solid #e5e5e5; border-radius: 8px; padding: 30px; margin-bottom: 30px; }
  .paciente-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 30px; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px dashed #ddd; }
  .paciente-info .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .paciente-info .value { font-size: 15px; font-weight: 600; color: #1a1a1a; }
  .prescripcion { margin-bottom: 20px; }
  .prescripcion h3 { font-size: 13px; color: ${colorPrimario}; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; }
  .prescripcion-item { background: white; border-left: 4px solid ${colorPrimario}; padding: 15px 20px; border-radius: 0 8px 8px 0; }
  .prescripcion-item .medicamento { font-size: 18px; font-weight: 700; color: #1a1a1a; }
  .prescripcion-item .detalle { font-size: 13px; color: #555; margin-top: 5px; }
  .prescripcion-item .indicaciones { font-size: 13px; color: #666; margin-top: 8px; font-style: italic; }
  .fechas { display: flex; gap: 40px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e5e5; }
  .fechas .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .fechas .value { font-size: 14px; font-weight: 600; margin-top: 2px; }
  .firma-area { margin-top: 50px; display: flex; justify-content: space-between; align-items: end; }
  .firma { text-align: center; min-width: 250px; }
  .firma-line { border-top: 2px solid #333; width: 250px; margin-bottom: 5px; }
  .firma-label { font-size: 11px; color: #666; }
  .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; font-size: 10px; color: #999; }
  .footer strong { color: #666; }
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
      <div><div class="label">Emisión</div><div class="value">${hoy}</div></div>
      <div><div class="label">Válida hasta</div><div class="value">${vence}</div></div>
    </div>
  </div>
  <div class="firma-area">
    <div class="qr-container">
      ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Verificacion" style="width:80px;height:80px;" /><p style="font-size:8px;color:#999;text-align:center;margin-top:3px;">Verificar autenticidad</p>` : '<p style="font-size:9px;color:#ccc;">QR no disponible</p>'}
    </div>
    <div></div>
    <div class="firma">
      <div class="firma-line"></div>
      <div class="firma-label">${params.nombreOrg}</div>
    </div>
  </div>
  <div class="footer"><strong>${nombreOrg}</strong> &nbsp;·&nbsp; Documento generado electrónicamente el ${hoy}</div>
</body>
</html>`;
}

// ─── Component ─────────────────────────────────────────────

export function RecetasClient({ initialRecetas }: RecetasClientProps) {
  const [recetas, setRecetas] = useState<Receta[]>(initialRecetas);
  const [showNewReceta, setShowNewReceta] = useState(false);

  const handleNuevaReceta = async (data: {
    paciente: string;
    medicamento: string;
    dosis: string;
    duracion: string;
    indicaciones: string;
  }) => {
    try {
      // Buscar paciente
      const busqueda = await fetch(`/api/pacientes?search=${encodeURIComponent(data.paciente)}&limit=5`);
      const pacientesJson = await busqueda.json();
      const paciente = pacientesJson.data?.[0];

      if (!paciente) {
        toast({ title: 'Error', description: 'Paciente no encontrado. Creá el paciente primero.', variant: 'destructive' });
        return;
      }

      const res = await fetch('/api/recetas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: paciente.id,
          medicamento: data.medicamento,
          dosis: data.dosis,
          duracion: data.duracion,
          indicaciones: data.indicaciones,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast({ title: 'Error', description: err.error || 'No se pudo crear la receta', variant: 'destructive' });
        return;
      }

      const json = await res.json();
      const created = json.data;
      const newReceta: Receta = {
        id: created.id,
        paciente: data.paciente,
        medicamento: created.medicamento,
        dosis: created.dosis,
        duracion: created.duracion || 'Según indicación',
        estado: 'activa',
        vence: created.fechaFin || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        renovable: true,
        fechaCreacion: new Date().toISOString().split('T')[0],
        indicaciones: created.indicaciones,
      };
      setRecetas((prev) => [newReceta, ...prev]);
      toast({ title: 'Receta creada', description: `${created.medicamento} para ${data.paciente}` });
    } catch {
      toast({ title: 'Error', description: 'Error de red al crear receta', variant: 'destructive' });
    }
  };

  const handleRenovar = async (receta: Receta) => {
    try {
      const res = await fetch(`/api/recetas/${receta.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'activa' }),
      });

      if (!res.ok) {
        toast({ title: 'Error', description: 'No se pudo renovar la receta', variant: 'destructive' });
        return;
      }

      const json = await res.json();
      const updated = json.data;
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

      setRecetas((prev) => [renovada, ...prev]);
      toast({
        title: '🔄 Receta renovada',
        description: `${receta.medicamento} para ${receta.paciente} - Vence ${formatDate(renovada.vence, 'dd/MM/yyyy')}`,
      });
    } catch {
      toast({ title: 'Error', description: 'Error de red al renovar receta', variant: 'destructive' });
    }
  };

  const renderRecetaCard = (
    receta: Receta,
    variant: 'activa' | 'vencida' | 'historial',
  ) => {
    const isActiva = variant === 'activa';
    const isVencida = variant === 'vencida';

    return (
      <div
        key={receta.id}
        className="flex items-center gap-4 p-4 hoverable:hover:bg-muted/50 transition-colors"
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
          <p className="font-medium">{receta.paciente}</p>
          <p className="text-sm text-muted-foreground">
            {receta.medicamento}
          </p>
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
            {isActiva
              ? 'Vence'
              : isVencida
                ? 'Venció'
                : 'Creada'}
          </p>
          <p className="font-medium text-foreground">
            {formatDate(
              isActiva || isVencida
                ? receta.vence
                : receta.fechaCreacion,
              'dd/MM',
            )}
          </p>
        </div>
        {/* Acciones — desktop: inline, mobile: dropdown */}
        <div className="flex gap-1">
          {/* Desktop inline */}
          <div className="hidden sm:flex gap-1">
            <Button
              variant="ghost"
              size="icon"
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
          </div>

          {/* Mobile dropdown */}
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); descargarReceta(receta); }}>
                  <Download className="h-4 w-4 mr-2" /> Descargar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); enviarRecetaWhatsApp(receta); }}>
                  <Send className="h-4 w-4 mr-2" /> WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); imprimirReceta(receta); }}>
                  <Printer className="h-4 w-4 mr-2" /> Imprimir
                </DropdownMenuItem>
                {(isActiva || isVencida) && receta.renovable && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRenovar(receta); }}>
                    <RotateCcw className="h-4 w-4 mr-2" /> Renovar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Tabs */}
      <Tabs defaultValue="activas">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList>
            <TabsTrigger value="activas">Activas</TabsTrigger>
            <TabsTrigger value="vencidas">Vencidas</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            {/* Export buttons */}
            <Button
              variant="outline"
              size="icon"
              title="Exportar Excel"
              onClick={() => window.open('/api/recetas/exportar?formato=excel', '_blank')}
            >
              <FileSpreadsheet className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              title="Exportar PDF"
              onClick={() => window.open('/api/recetas/exportar?formato=pdf', '_blank')}
            >
              <FileDown className="h-4 w-4" />
            </Button>
            <Button onClick={() => setShowNewReceta(true)} className="shrink-0">
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Nueva Receta</span>
              <span className="sm:hidden">Nueva</span>
            </Button>
          </div>
        </div>

        <TabsContent value="activas" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {recetas.filter((r) => r.estado === 'activa').length ===
              0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Syringe className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    Sin recetas activas
                  </p>
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
                  {recetas
                    .filter((r) => r.estado === 'activa')
                    .map((r) => renderRecetaCard(r, 'activa'))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vencidas" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {recetas.filter((r) => r.estado === 'vencida').length ===
              0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    Sin recetas vencidas
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    No hay recetas vencidas
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {recetas
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
              {recetas.filter((r) => r.estado === 'historial')
                .length === 0 ? (
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
                  {recetas
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
    </>
  );
}
