/**
 * Genera un PDF con la documentación de la integración MercadoPago.
 * Uso: node scripts/generate-mp-pdf.js
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, '..', 'docs', 'MP.pdf');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 60, bottom: 60, left: 60, right: 60 },
  info: {
    Title: 'AiCoreMed — Integración MercadoPago',
    Author: 'Aicore',
    Subject: 'MercadoPago Suscripciones',
  },
});

doc.pipe(fs.createWriteStream(OUTPUT));

// ─── Helpers ─────────────────────────────────────────────────
function title(text, size = 20) {
  doc.font('Helvetica-Bold').fontSize(size).text(text, { underline: false });
  doc.moveDown(0.5);
}

function h2(text) {
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#1e40af').text(text);
  doc.moveDown(0.3);
}

function h3(text) {
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#374151').text(text);
  doc.moveDown(0.2);
}

function body(text) {
  doc.font('Helvetica').fontSize(9.5).fillColor('#374151').text(text, { align: 'justify' });
  doc.moveDown(0.3);
}

function code(text) {
  doc.font('Courier').fontSize(8.5).fillColor('#1f2937')
    .text(text, { indent: 10, columns: 1 });
  doc.moveDown(0.2);
}

function bullet(text) {
  doc.font('Helvetica').fontSize(9.5).fillColor('#374151')
    .text(`  •  ${text}`, { indent: 10 });
  doc.moveDown(0.1);
}

function divider() {
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#d1d5db').text('─'.repeat(70));
  doc.moveDown(0.5);
}

// ═════════════════════════════════════════════════════════════
// PORTADA
// ═════════════════════════════════════════════════════════════

doc.font('Helvetica-Bold').fontSize(28).fillColor('#1e40af').text('MercadoPago', { align: 'center' });
doc.moveDown(0.2);
doc.font('Helvetica').fontSize(16).fillColor('#6b7280').text('Integración de Suscripciones — AiCoreMed', { align: 'center' });
doc.moveDown(2);

doc.font('Helvetica').fontSize(10).fillColor('#9ca3af').text('Documentación técnica · 17 de mayo, 2026', { align: 'center' });
doc.moveDown(0.5);
doc.font('Helvetica').fontSize(10).fillColor('#9ca3af').text('by Aicore — aicorebots.com', { align: 'center' });

doc.addPage();

// ═════════════════════════════════════════════════════════════
// ÍNDICE
// ═════════════════════════════════════════════════════════════

title('Índice', 16);
doc.moveDown(0.5);

const indices = [
  '1.  Resumen',
  '2.  Stack técnico',
  '3.  Variables de entorno',
  '4.  Estructura de archivos',
  '5.  Modelo de datos',
  '6.  Planes y precios',
  '7.  Flujo de pago',
  '8.  Webhook / IPN',
  '9.  Frontend',
  '10. Cómo probar',
  '11. Producción',
];

indices.forEach((i) => {
  doc.font('Helvetica').fontSize(10).fillColor('#374151').text(i, { indent: 10 });
  doc.moveDown(0.15);
});

doc.addPage();

// ═════════════════════════════════════════════════════════════
// 1. RESUMEN
// ═════════════════════════════════════════════════════════════

title('1. Resumen');
body('Integración con MercadoPago Checkout Pro para gestionar suscripciones mensuales de los planes AiCoreMed. El sistema crea preferencias de pago, redirige al usuario a MercadoPago para el pago, y procesa las notificaciones vía webhook (IPN) para activar/cancelar suscripciones automáticamente.');
body('Stack: mercadopago SDK v2.12.1 + Next.js API Routes + PostgreSQL (Drizzle ORM).');

divider();

// ═════════════════════════════════════════════════════════════
// 2. STACK
// ═════════════════════════════════════════════════════════════

title('2. Stack técnico');
bullet('SDK: mercadopago@2.12.1 (oficial, Node.js)');
bullet('Framework: Next.js 14 API Routes (App Router)');
bullet('Base de datos: PostgreSQL via Drizzle ORM');
bullet('Frontend: shadcn/ui + Tailwind + lucide-react');
bullet('Webhook: POST /api/pagos/webhook (IPN)');

divider();

// ═════════════════════════════════════════════════════════════
// 3. ENV VARS
// ═════════════════════════════════════════════════════════════

title('3. Variables de entorno');
doc.moveDown(0.3);

const envVars = [
  ['MERCADOPAGO_ACCESS_TOKEN', 'Access token de MP (TEST-xxx o APP_USR-xxx)'],
  ['NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY', 'Public key para el frontend'],
  ['MERCADOPAGO_WEBHOOK_SECRET', 'Secreto para verificar webhooks (opcional)'],
  ['MERCADOPAGO_SUCCESS_URL', 'URL post-pago exitoso'],
  ['MERCADOPAGO_FAILURE_URL', 'URL post-pago fallido'],
  ['MERCADOPAGO_PENDING_URL', 'URL post-pago pendiente'],
];

// Encabezados
doc.font('Helvetica-Bold').fontSize(9).fillColor('#374151');
doc.text('VARIABLE', 60, doc.y, { width: 200 });
doc.text('DESCRIPCIÓN', 260, doc.y, { width: 280 });
doc.moveDown(0.5);
doc.font('Helvetica').fontSize(8.5).fillColor('#9ca3af').text('─'.repeat(70));
doc.moveDown(0.3);

envVars.forEach(([v, d]) => {
  const y = doc.y;
  doc.font('Courier').fontSize(8).fillColor('#1e40af').text(v, 60, y, { width: 200 });
  doc.font('Helvetica').fontSize(8.5).fillColor('#374151').text(d, 260, y, { width: 280 });
  doc.moveDown(0.4);
});

divider();

// ═════════════════════════════════════════════════════════════
// 4. ARCHIVOS
// ═════════════════════════════════════════════════════════════

title('4. Estructura de archivos');
doc.moveDown(0.3);

code([
  'dashboard/',
  '  lib/mercadopago.ts              ← Cliente MP + planes + helpers',
  '  app/api/pagos/',
  '    create-preference/route.ts    ← POST: crear checkout',
  '    webhook/route.ts              ← POST: IPN handler',
  '    status/route.ts               ← GET: estado suscripción',
  '  components/configuracion/',
  '    suscripcion-tab.tsx           ← UI de suscripción',
  '  app/dashboard/configuracion/',
  '    page.tsx                      ← + tab "Suscripción"',
  'database/migrations/',
  '  010_suscripciones.sql           ← Tabla suscripciones',
  'drizzle/schema.ts                 ← Modelo Suscripcion',
].join('\n'));

divider();

// ═════════════════════════════════════════════════════════════
// 5. MODELO DE DATOS
// ═════════════════════════════════════════════════════════════

title('5. Modelo de datos');
doc.moveDown(0.3);

code([
  'suscripciones {',
  '  id                          UUID PK',
  '  organizacion_id             UUID (default: 0000...)',
  '  plan                        VARCHAR(50) — free|starter|professional|premium|enterprise',
  '  estado                      VARCHAR(50) — free|pending|active|cancelled|expired|paused',
  '  mercadopago_preference_id   VARCHAR(255)',
  '  mercadopago_payment_id      VARCHAR(255)',
  '  mercadopago_merchant_order_id VARCHAR(255)',
  '  period_start                TIMESTAMPTZ',
  '  period_end                  TIMESTAMPTZ',
  '  trial_end                   TIMESTAMPTZ',
  '  metadata                    JSONB',
  '  created_at                  TIMESTAMPTZ',
  '  updated_at                  TIMESTAMPTZ',
  '}',
].join('\n'));

divider();

// ═════════════════════════════════════════════════════════════
// 6. PLANES
// ═════════════════════════════════════════════════════════════

title('6. Planes y precios');
doc.moveDown(0.3);

// Tabla de planes
doc.font('Helvetica-Bold').fontSize(9).fillColor('#374151');
doc.text('PLAN', 60, doc.y, { width: 90 });
doc.text('PRECIO ARS', 150, doc.y, { width: 80 });
doc.text('DESCRIPCIÓN', 230, doc.y, { width: 150 });
doc.text('FEATURES', 380, doc.y, { width: 150 });
doc.moveDown(0.5);
doc.font('Helvetica').fontSize(8.5).fillColor('#9ca3af').text('─'.repeat(70));
doc.moveDown(0.3);

const planes = [
  ['Starter', '$4.900', 'Individual', '500 pac., turnos, WhatsApp básico, recetas'],
  ['Profesional', '$9.900', '2-5 prof.', '+ IA Assistant, multi-profesional, reportes'],
  ['Premium', '$19.900', 'Clínicas', '+ n8n completo, Google Calendar, 2FA, backup'],
  ['Enterprise', '$49.900', 'Grandes', '+ on-premise, SLA, capacitación, API dedicada'],
];

planes.forEach(([p, pr, d, f]) => {
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e40af').text(p, 60, y, { width: 90 });
  doc.font('Helvetica').fontSize(9).fillColor('#059669').text(pr, 150, y, { width: 80 });
  doc.font('Helvetica').fontSize(8.5).fillColor('#6b7280').text(d, 230, y, { width: 150 });
  doc.font('Helvetica').fontSize(8).fillColor('#374151').text(f, 380, y, { width: 150 });
  doc.moveDown(0.4);
});

divider();

// ═════════════════════════════════════════════════════════════
// 7. FLUJO
// ═════════════════════════════════════════════════════════════

title('7. Flujo de pago');
doc.moveDown(0.3);

body('1. Usuario navega a Configuración → Suscripción');
body('2. Selecciona un plan y hace clic en "Suscribirse"');
body('3. Frontend llama a POST /api/pagos/create-preference');
body('4. El server valida auth, busca el plan, crea una preferencia en MP');
body('5. MP devuelve init_point (URL de checkout)');
body('6. Frontend abre la URL en nueva ventana/pestaña');
body('7. Usuario completa el pago en MercadoPago');
body('8. MP redirige a success/failure/pending URL');
body('9. MP envía notificación IPN a POST /api/pagos/webhook');
body('10. Webhook procesa el pago: si es "approved" → activa suscripción en DB');
body('11. Usuario vuelve al dashboard y ve su suscripción activa');

divider();

// ═════════════════════════════════════════════════════════════
// 8. WEBHOOK
// ═════════════════════════════════════════════════════════════

title('8. Webhook / IPN');
doc.moveDown(0.3);

h3('Endpoint');
code('POST /api/pagos/webhook');
doc.moveDown(0.3);

h3('Tipos de notificación soportados');
bullet('payment — pago individual (status: approved, rejected, cancelled, refunded)');
bullet('merchant_order — orden de pago (procesa payments asociados)');
doc.moveDown(0.3);

h3('Comportamiento');
bullet('Si el pago es "approved" → crea o actualiza suscripción a estado "active"');
bullet('Si el pago es "rejected", "cancelled" o "refunded" → cambia estado a "cancelled"');
bullet('Usa external_reference para identificar al usuario/organización');
bullet('Periodo de suscripción: +1 mes desde la fecha del pago');

divider();

// ═════════════════════════════════════════════════════════════
// 9. FRONTEND
// ═════════════════════════════════════════════════════════════

title('9. Frontend');
doc.moveDown(0.3);

h3('SuscripcionTab (componente)');
bullet('Muestra plan actual con badge de estado (Activa/Pendiente/Cancelada/Gratuito)');
bullet('Grid de 4 planes con: nombre, precio ARS, features, botón "Suscribirse"');
bullet('Al hacer clic: llama a create-preference, abre MP checkout en _blank');
bullet('Estados: loading, error, plan actual destacado con ring');
bullet('Aviso de "Modo de prueba" si la public key es TEST');
doc.moveDown(0.3);

h3('Integración en Configuración');
bullet('Nuevo tab "Suscripción" con ícono CreditCard');
bullet('Visible para todos los usuarios autenticados');

divider();

// ═════════════════════════════════════════════════════════════
// 10. CÓMO PROBAR
// ═════════════════════════════════════════════════════════════

title('10. Cómo probar en desarrollo');
doc.moveDown(0.3);

body('Para probar sin credenciales reales de MercadoPago:');
doc.moveDown(0.2);

h3('1. Credenciales de prueba');
code([
  '1. Andá a https://www.mercadopago.com.ar/developers/panel',
  '2. Creá una aplicación → obtené ACCESS_TOKEN y PUBLIC_KEY (TEST)',
  '3. Agregalos a tu .env.local:',
  '',
  '   MERCADOPAGO_ACCESS_TOKEN=TEST-123456789-abc123...',
  '   NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-abc123...',
].join('\n'));
doc.moveDown(0.3);

h3('2. Configurar webhook');
code([
  '1. En el panel de MP → Webhooks → Agregar',
  '2. URL: https://TU-DOMINIO/api/pagos/webhook',
  '3. Eventos: payment, merchant_order',
  '',
  '   Para desarrollo local usá ngrok:',
  '   ngrok http 3000 → https://xxxx.ngrok.io/api/pagos/webhook',
].join('\n'));
doc.moveDown(0.3);

h3('3. Tarjetas de prueba MP');
code([
  'Mastercard:  5031 7557 3453 0604  —  CVV 123  —  Vto 11/25',
  'Visa:        4509 9535 6623 3704  —  CVV 123  —  Vto 11/25',
  'American Express: 3711 8030 3764  —  CVV 1234 — Vto 11/25',
  '',
  'Aprobado:     CP 123456',
  'Rechazado:    CP 000000',
].join('\n'));
doc.moveDown(0.3);

h3('4. Probar el flujo completo');
code([
  '1. Iniciá sesión en http://localhost:3000',
  '2. Andá a Configuración → Suscripción',
  '3. Elegí "Profesional" → click Suscribirse',
  '4. En MP checkout, usá tarjeta de prueba + CP 123456',
  '5. Pago aprobado → webhook → suscripción activa',
  '6. Verificá en GET /api/pagos/status',
].join('\n'));

divider();

// ═════════════════════════════════════════════════════════════
// 11. PRODUCCIÓN
// ═════════════════════════════════════════════════════════════

title('11. Pasos para producción');
doc.moveDown(0.3);

const prodSteps = [
  'Crear aplicación en MercadoPago Developers y obtener credenciales PRODUCTIVAS (APP_USR-xxx)',
  'Configurar MERCADOPAGO_ACCESS_TOKEN con token productivo en las env vars del deploy',
  'Configurar la URL del webhook en el panel de MP → Webhooks (apuntando al dominio real)',
  'Configurar las URLs de retorno (success/failure/pending) con el dominio real',
  'Migrar la base de datos: ejecutar database/migrations/010_suscripciones.sql',
  'Verificar que el webhook responde 200 OK desde la VPS',
  'Hacer un pago de prueba con una tarjeta real (monto mínimo)',
  'Monitorear los logs de la API y el webhook',
  'Desactivar modo TEST en el panel de MP',
];

prodSteps.forEach((s, i) => {
  doc.font('Helvetica').fontSize(9.5).fillColor('#374151')
    .text(`${i + 1}.  ${s}`, { indent: 10 });
  doc.moveDown(0.2);
});

// ═════════════════════════════════════════════════════════════
// FOOTER
// ═════════════════════════════════════════════════════════════

doc.addPage();

title('Comandos útiles', 16);
doc.moveDown(0.5);

code([
  '# Ver estado de suscripción via curl',
  'curl -X GET http://localhost:3000/api/pagos/status \\',
  '  -H "Cookie: authjs.session-token=..."',
  '',
  '# Crear preferencia de pago (sin frontend)',
  'curl -X POST http://localhost:3000/api/pagos/create-preference \\',
  '  -H "Content-Type: application/json" \\',
  '  -H "Cookie: authjs.session-token=..." \\',
  '  -d \'{"planId":"professional"}\'',
  '',
  '# Probar webhook localmente',
  'curl -X POST http://localhost:3000/api/pagos/webhook \\',
  '  -H "Content-Type: application/json" \\',
  '  -d \'{"type":"payment","data":{"id":"123456"}}\'',
].join('\n'));

doc.moveDown(2);

// Final
doc.font('Helvetica').fontSize(9).fillColor('#9ca3af')
  .text('AiCoreMed by Aicore — aicorebots.com', { align: 'center' });
doc.font('Helvetica').fontSize(8).fillColor('#d1d5db')
  .text('Documentación generada el 17 de mayo de 2026 · Commit edbe1da', { align: 'center' });

// ═════════════════════════════════════════════════════════════
// FINALIZAR
// ═════════════════════════════════════════════════════════════

doc.end();

console.log(`✅ PDF generado: ${OUTPUT}`);
