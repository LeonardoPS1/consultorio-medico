// ============================================================
// generate-aicoremed-pdf.js — Plan de producto multi-tenant
// ============================================================

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, '..', 'docs', 'aicoremed.pdf');

const C = {
  primary: '#2563eb',
  text: '#1a1a2e',
  muted: '#64748b',
  border: '#e2e8f0',
  green: '#16a34a',
  greenBg: '#f0fdf4',
  amber: '#d97706',
  amberBg: '#fffbeb',
  red: '#dc2626',
  redBg: '#fef2f2',
  code: '#0f172a',
  codeText: '#e2e8f0',
};

function checkSpace(doc, needed = 50) {
  if (doc.y + needed > doc.page.height - 50) {
    doc.addPage();
  }
}

function h1(doc, text) {
  doc.addPage();
  doc.rect(0, 0, doc.page.width, 35).fill(C.primary);
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#ffffff')
    .text(text, 40, 9, { width: doc.page.width - 80 });
  doc.moveDown(4);
  doc.fillColor(C.text);
}

function h2(doc, text) {
  checkSpace(doc, 40);
  doc.moveDown(0.8);
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#1e293b').text(text);
  doc.moveDown(0.2);
  doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor(C.border).stroke();
  doc.moveDown(0.4);
  doc.fillColor(C.text);
}

function h3(doc, text) {
  checkSpace(doc, 25);
  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#334155').text(text);
  doc.moveDown(0.2);
  doc.fillColor(C.text);
}

function body(doc, text, size = 9.5) {
  doc.fontSize(size).font('Helvetica').fillColor(C.text).text(text, { lineGap: 2 });
  doc.moveDown(0.2);
}

function bullet(doc, text, indent = 15, size = 9) {
  doc.fontSize(size).font('Helvetica').fillColor(C.text);
  doc.text(`  •  ${text}`, indent, doc.y, { lineGap: 2, width: doc.page.width - 80 - indent });
  doc.moveDown(0.1);
}

function codeBlock(doc, code) {
  checkSpace(doc, 60);
  doc.moveDown(0.2);
  const yStart = doc.y;
  const lines = code.split('\n');
  const lineH = 10;
  const pad = 6;
  const blockH = lines.length * lineH + pad * 2;
  doc.rect(40, yStart, doc.page.width - 80, blockH).fill(C.code);
  doc.fontSize(8).font('Courier').fillColor(C.codeText);
  let y = yStart + pad;
  for (const line of lines) {
    doc.text(line, 48, y, { lineGap: 0 });
    y += lineH;
  }
  doc.y = y + pad * 0.5;
  doc.fillColor(C.text);
}

function tableHeader(doc, cols, widths) {
  const startX = 40;
  const totalW = doc.page.width - 80;
  doc.rect(startX, doc.y, totalW, 16).fill('#f1f5f9');
  doc.fontSize(8).font('Helvetica-Bold').fillColor(C.text);
  let x = startX + 3;
  for (let i = 0; i < cols.length; i++) {
    doc.text(cols[i], x, doc.y + 3, { width: (widths || cols.map(() => totalW / cols.length))[i] - 6, lineGap: 0 });
    x += (widths || cols.map(() => totalW / cols.length))[i];
  }
  doc.y += 16;
}

function tableRow(doc, cols, widths, alt = false) {
  const startX = 40;
  const totalW = doc.page.width - 80;
  const w = widths || cols.map(() => totalW / cols.length);
  if (alt) doc.rect(startX, doc.y - 1, totalW, 18).fill('#fafafa');
  doc.fontSize(7.8).font('Helvetica').fillColor(C.text);
  let x = startX + 3;
  for (let i = 0; i < cols.length; i++) {
    doc.text(cols[i], x, doc.y, { width: w[i] - 6, lineGap: 0 });
    x += w[i];
  }
  doc.y += 18;
}

function genPDF() {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    info: { Title: 'AiCoreMed — Plan de Producto Multi-Tenant', Author: 'Aicore' },
  });

  const stream = fs.createWriteStream(OUTPUT);
  doc.pipe(stream);

  // ─── PORTADA ────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 8).fill(C.primary);
  doc.fontSize(30).font('Helvetica-Bold').fillColor(C.text);
  doc.text('AiCoreMed', { align: 'center' }, doc.y + 170);
  doc.moveDown(0.3);
  doc.fontSize(16).font('Helvetica').fillColor(C.muted);
  doc.text('Sistema de Gestión para Consultorios Médicos', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(12).font('Helvetica').fillColor(C.muted);
  doc.text('con IA Local, Automatizaciones y Multi-Tenant', { align: 'center' });
  doc.moveDown(3);
  doc.fontSize(11).fillColor(C.text);
  doc.text('Plan de producto multi-cliente + hoja de ruta Fase 1', { align: 'center' });
  doc.moveDown(0.5);
  doc.text(`Versión: 1.0 — ${new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'center' });
  doc.rect(0, doc.page.height - 8, doc.page.width, 8).fill(C.primary);

  // ─── 1. ESTADO ACTUAL ───────────────────────────────
  h1(doc, '1. Estado Actual del Producto');

  body(doc, 'El sistema actual es una solución completa para UN consultorio médico con:'); 
  bullet(doc, 'Dashboard web (Next.js 14 + shadcn/ui + TypeScript)');
  bullet(doc, 'Automatizaciones n8n (7 workflows: WhatsApp, turnos, recordatorios, correo, resumen, recetas, backup)');
  bullet(doc, 'IA local con Ollama + Mistral (sin costos de OpenAI)');
  bullet(doc, 'Comunicación WhatsApp via Twilio');
  bullet(doc, 'PostgreSQL como base de datos');
  bullet(doc, 'Infraestructura Docker lista para Dokploy');

  body(doc, 'Es un producto funcional de instancia única (single-tenant). El dashboard está 100% operativo en desarrollo con 8 secciones, seguridad completa (9 fases), 59 tests, y documentación exhaustiva.');

  // ─── 2. MODELO DE NEGOCIO ───────────────────────────
  h1(doc, '2. Modelo de Negocio');

  body(doc, 'Tres opciones para vender el producto:');

  h2(doc, 'Opción 1: Multi-tenant cloud (recomendada para Fase 1)');
  body(doc, 'Todos los clientes comparten la misma infraestructura. Cada uno accede via subdominio (cliente.aicoremed.com). Los datos se aíslan por tenant_id con RLS en PostgreSQL.');
  bullet(doc, 'Un solo deploy, actualizaciones instantáneas');
  bullet(doc, 'Menor costo operativo por cliente');
  bullet(doc, 'Ideal para empezar a vender rápido');

  h2(doc, 'Opción 2: Single-tenant (instancias separadas)');
  body(doc, 'Cada cliente tiene su propio stack completo via Dokploy. Script de provisioning que crea DB + dashboard + n8n + subdominio.');
  bullet(doc, 'Aislación total, compliance on-premise');
  bullet(doc, 'Mayor consumo de recursos');
  bullet(doc, 'Ideal para plan Enterprise u on-premise');

  h2(doc, 'Opción 3: Híbrida (recomendada a largo plazo)');
  body(doc, 'Dashboard multi-tenant cloud para la mayoría de clientes + opción on-premise para Enterprise. Panel de administración centralizado que controla todos los clientes (creación, monitoreo, facturación, actualización).');

  // ─── 3. PRICING ─────────────────────────────────────
  h1(doc, '3. Pricing Sugerido');

  const w3 = [120, 80, 300];
  tableHeader(doc, ['Plan', 'Precio', 'Incluye'], w3);
  const rows3 = [
    ['Starter', '$49/mes', '1 consultorio, 500 pacientes, WhatsApp, IA básica'],
    ['Professional', '$99/mes', '1 consultorio, pacientes ilimitados, IA avanzada, reportes'],
    ['Multi', '$199/mes', 'Hasta 3 consultorios, todo incluido'],
    ['Enterprise', '$499/mes', 'Consultorios ilimitados, on-premise, SLA, soporte prioritario'],
    ['On-premise', '$299/mes', 'Licencia para instalar en su propia VPS'],
  ];
  let alt = false;
  for (const r of rows3) { tableRow(doc, r, w3, alt); alt = !alt; }

  body(doc, 'Costos operativos mensuales estimados: VPS $20-40, Twilio ~$0.005/msg (variable), Dominio+SSL ~$1/mes, Ollama gratis.');
  body(doc, 'Margen estimado: sobre plan Professional ($99/mes), el costo infraestructura es de ~$30-50/mes compartido entre varios clientes. Con 10 clientes en Professional, el margen es de ~$900-950/mes.');

  // ─── 4. ARQUITECTURA MULTI-TENANT ──────────────────
  h1(doc, '4. Arquitectura Multi-Tenant');

  h3(doc, '4.1  Tabla tenants');
  codeBlock(doc, `  CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    colores JSONB,
    config JSONB,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`);

  h3(doc, '4.2  Aislamiento con tenant_id');
  body(doc, 'Cada tabla existente recibe una columna tenant_id UUID REFERENCES tenants(id). Se aplica Row-Level Security en PostgreSQL:');
  codeBlock(doc, `  ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation ON pacientes
    USING (tenant_id = current_setting('app.tenant_id')::UUID);`);

  h3(doc, '4.3  Middleware de ruteo por subdominio');
  codeBlock(doc, `  const host = request.headers.get('host') || '';
  const subdomain = host.split('.')[0];
  const tenant = await getTenantBySubdomain(subdomain);
  if (!tenant) return NextResponse.redirect('/404');
  request.headers.set('x-tenant-id', tenant.id);`);

  h3(doc, '4.4  n8n multi-tenant');
  body(doc, 'Los workflows n8n reciben tenant_id como parámetro en cada ejecución. La query a base de datos filtra por ese ID. Las credenciales de Twilio se resuelven según el tenant.');
  
  h3(doc, '4.5  White-label dinámico');
  body(doc, 'Logo, colores, nombre del consultorio se leen de la tabla tenants y se aplican en runtime. No requiere rebuild del dashboard por cliente.');

  // ─── 5. HOJA DE RUTA FASE 1 ────────────────────────
  h1(doc, '5. Hoja de Ruta — Fase 1');

  body(doc, 'Duración estimada: ~15-17 días hábiles para MVP multi-tenant vendible.');
  body(doc, 'Orden recomendado de implementación:');

  const w5 = [50, 140, 50, 260];
  tableHeader(doc, ['#', 'Tarea', 'Tiempo', 'Detalle'], w5);
  const rows5 = [
    ['1', 'Tabla tenants + columna tenant_id', '2 días', 'Migración 009 + actualizar todas las queries existentes'],
    ['2', 'Middleware subdominio + sesión', '1 día', 'Extraer tenant del host, setear en headers y sesión'],
    ['3', 'Login multi-tenant', '1 día', 'Cada tenant con sus propios usuarios, login por subdominio'],
    ['4', 'RLS + filters en queries', '1 día', 'PostgreSQL RLS + Drizzle/JSON filters por tenant_id'],
    ['5', 'Panel admin de tenants', '2 días', 'CRUD de clientes, activar/desactivar, ver uso'],
    ['6', 'Script provisioning automático', '1 día', 'Crear tenant, DB seed, subdominio, n8n credentials'],
    ['7', 'White-label dinámico', '1 día', 'Logo, colores, nombre desde DB, CSS variables en runtime'],
    ['8', 'PWA (app instalable)', '1 día', 'manifest.json, service worker, iconos'],
    ['9', 'Landing page + registro', '2 días', 'Página pública con pricing, formulario registro, onboarding'],
    ['10', 'Pasarela de pago', '2 días', 'Stripe/MercadoPago, webhooks, planes recurrente'],
    ['11', 'Dashboard de uso por cliente', '1 día', 'Stats: requests, almacenamiento, mensajes Twilio'],
    ['12', 'Testing + ajustes', '1 día', 'Tests multi-tenant, fixes, build final'],
  ];
  alt = false;
  for (const r of rows5) { tableRow(doc, r, w5, alt); alt = !alt; }

  // ─── 6. QUE HACER AHORA ────────────────────────────
  h1(doc, '6. Qué Podemos Empezar a Hacer Ahora Mismo');

  body(doc, 'Sin esperar nada más. Con el código actual podemos arrancar hoy:');

  h2(doc, 'Paso 1: Migration 009 — Tabla tenants (2 horas)');
  body(doc, 'Crear la migración SQL con la tabla tenants más un tenant por defecto (el actual). Esto NO rompe nada existente porque el tenant_id tendrá un default temporal mientras migramos.');
  codeBlock(doc, `  database/migrations/009_multitenant.sql
  CREATE TABLE tenants (id UUID PRIMARY KEY, ...);
  INSERT INTO tenants (id, nombre, subdomain) VALUES
    ('default', 'Consultorio Demo', 'demo');
  ALTER TABLE pacientes ADD COLUMN tenant_id UUID REFERENCES tenants(id)
    DEFAULT 'default';`);

  h2(doc, 'Paso 2: Extraer tenant del host en middleware (1 hora)');
  body(doc, 'Modificar middleware.ts para detectar subdominio y setear x-tenant-id. Por ahora devuelve "default" hasta que tengamos más tenants.');

  h2(doc, 'Paso 3: PWA — manifest.json + service worker (1 hora)');
  body(doc, 'Esto convierte el dashboard en una app instalable. El usuario puede ponerla en el escritorio de su celular/PC como si fuera una app nativa. Cero cambios en el backend.');
  codeBlock(doc, `  app/manifest.ts  (dinámico, con nombre del tenant)
  public/sw.js      (service worker básico con cache de assets)
  layout.tsx        → <link rel="manifest" href="/manifest" />
                     → <meta name="theme-color" content={tenantColor} />
                     → next.config.js: headers para SW`);

  h2(doc, 'Paso 4: White-label desde .env.local (2 horas)');
  body(doc, 'Mientras no tengamos la tabla tenants operativa, podemos leer LOGO_URL, COLOR_PRIMARY, NOMBRE_CONSULTORIO desde variables de entorno. Esto permite personalizar la instancia para cada cliente al deployar.');
  codeBlock(doc, `  .env.example:
    NEXT_PUBLIC_TENANT_NAME=Consultorio Demo
    NEXT_PUBLIC_TENANT_LOGO=/logo.png
    NEXT_PUBLIC_TENANT_PRIMARY=#2563eb

  app/layout.tsx:
    <link rel="icon" href={process.env.NEXT_PUBLIC_TENANT_LOGO} />
    <meta name="theme-color" content={process.env.NEXT_PUBLIC_TENANT_PRIMARY} />

  tailwind.config.ts:
    primary: process.env.NEXT_PUBLIC_TENANT_PRIMARY || '#2563eb'`);

  h2(doc, 'Paso 5: Landing page básica (3 horas)');
  body(doc, 'Una página pública en / (cuando no hay sesión activa) que muestre el producto, features y pricing. Con un formulario de registro que cree un tenant nuevo. Podemos empezar con algo simple en app/page.tsx (actualmente es el login).');

  // ─── 7. BENEFICIOS CLAVE ────────────────────────────
  h1(doc, '7. Beneficios Clave del Producto');

  bullet(doc, 'IA local sin costos recurrentes: Ollama + Mistral en tu VPS. Sin depender de OpenAI ni pagar por token.');
  bullet(doc, 'WhatsApp integrado: Los pacientes reciben recordatorios, confirmaciones y pueden sacar turnos desde WhatsApp. Sin instalar apps.');
  bullet(doc, 'Automatización completa: n8n gestiona recordatorios, resúmenes diarios, backup encriptado y triaje de mensajes.');
  bullet(doc, 'Dashboard completo desde el día 1: Turnos, pacientes, recetas, conversaciones, reportes, exportación Excel/PDF.');
  bullet(doc, 'Sin límite de pacientes en planes superiores: No hay cobro por paciente, solo costo fijo mensual.');
  bullet(doc, 'On-premise opcional: Clientes con requisitos de compliance pueden tener el sistema en su propia infraestructura.');
  bullet(doc, 'Multi-consultorio: Un médico con varias sucursales o múltiples profesionales en un mismo plan.');
  bullet(doc, 'Seguridad enterprise: 2FA, rate limiting, auditoría de accesos, bloqueo por intentos, backup encriptado.');

  // ─── PIE ────────────────────────────────────────────
  doc.moveDown(4);
  doc.fontSize(9).font('Helvetica').fillColor(C.muted);
  doc.text('Documento generado el ' + new Date().toLocaleDateString('es-AR'), { align: 'center' });
  doc.text('AiCoreMed — Aicorebots.com', { align: 'center' });

  doc.end();
  stream.on('finish', () => {
    console.log(`✅ PDF generado: ${OUTPUT}`);
    console.log(`   Tamaño: ${(fs.statSync(OUTPUT).size / 1024).toFixed(1)} KB`);
  });
}

genPDF();
