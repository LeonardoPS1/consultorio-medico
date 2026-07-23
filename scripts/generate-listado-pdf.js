// ============================================================
// generate-listado-pdf.js — Listado completo de mejoras, features y pendientes
// Uso: node scripts/generate-listado-pdf.js
// ============================================================

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, '..', 'docs', 'listado-completo.pdf');
const VERSION = '0.4.0';

// ─── Colores ────────────────────────────────────────────────
const C = {
  primary: '#2563eb',
  text: '#1a1a2e',
  muted: '#64748b',
  border: '#e2e8f0',
  bgLight: '#f8fafc',
  green: '#16a34a',
  greenBg: '#f0fdf4',
  amber: '#d97706',
  amberBg: '#fffbeb',
  red: '#dc2626',
  redBg: '#fef2f2',
  blue: '#2563eb',
  blueBg: '#eff6ff',
  purple: '#7c3aed',
  purpleBg: '#f5f3ff',
  code: '#0f172a',
  codeText: '#e2e8f0',
};

let pageNum = 0;
let totalSections = 0;

// ─── Helpers ────────────────────────────────────────────────
function checkSpace(doc, needed = 50) {
  if (doc.y + needed > doc.page.height - 50) {
    doc.addPage();
    pageNum++;
  }
}

function sectionH1(doc, text) {
  doc.addPage();
  pageNum++;
  doc.rect(0, 0, doc.page.width, 35).fill(C.primary);
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#ffffff')
    .text(text, 40, 9, { width: doc.page.width - 80 });
  doc.moveDown(4);
  doc.fillColor(C.text);
}

function sectionH2(doc, text) {
  checkSpace(doc, 40);
  doc.moveDown(0.8);
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#1e293b').text(text);
  doc.moveDown(0.2);
  doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor(C.border).stroke();
  doc.moveDown(0.4);
  doc.fillColor(C.text);
}

function sectionH3(doc, text) {
  checkSpace(doc, 30);
  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#334155').text(text);
  doc.moveDown(0.2);
  doc.fillColor(C.text);
}

function body(doc, text, size = 9.5) {
  doc.fontSize(size).font('Helvetica').fillColor(C.text).text(text, {
    lineGap: 2,
  });
  doc.moveDown(0.2);
}

function bullet(doc, text, indent = 15, size = 9) {
  doc.fontSize(size).font('Helvetica').fillColor(C.text);
  doc.text(`  •  ${text}`, indent, doc.y, { lineGap: 2, width: doc.page.width - 80 - indent });
  doc.moveDown(0.1);
}

function statusBadge(doc, label, color, bg) {
  doc.fontSize(7.5).font('Helvetica-Bold');
  const w = doc.widthOfString(label) + 10;
  const y = doc.y - 1;
  doc.roundedRect(doc.page.width - 40 - w, y, w, 12, 4).fill(bg);
  doc.fillColor(color).text(label, doc.page.width - 40 - w + 5, y + 2, {
    width: w - 10,
    align: 'center',
  });
  doc.fillColor(C.text);
}

function tableHeader(doc, cols, widths) {
  const startX = 40;
  const totalW = doc.page.width - 80;
  const colWs = widths || cols.map(() => totalW / cols.length);
  doc.rect(startX, doc.y, totalW, 16).fill('#f1f5f9');
  doc.fontSize(8).font('Helvetica-Bold').fillColor(C.text);
  let x = startX + 3;
  for (let i = 0; i < cols.length; i++) {
    doc.text(cols[i], x, doc.y + 3, { width: colWs[i] - 6, lineGap: 0 });
    x += colWs[i];
  }
  doc.y += 16;
}

function tableRow(doc, cols, widths, alt = false) {
  const startX = 40;
  const totalW = doc.page.width - 80;
  const colWs = widths || cols.map(() => totalW / cols.length);
  if (alt) doc.rect(startX, doc.y - 1, totalW, 18).fill('#fafafa');
  doc.fontSize(7.8).font('Helvetica').fillColor(C.text);
  let x = startX + 3;
  for (let i = 0; i < cols.length; i++) {
    doc.text(cols[i], x, doc.y, { width: colWs[i] - 6, lineGap: 0 });
    x += colWs[i];
  }
  doc.y += 18;
}

function genPDF() {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    info: {
      Title: 'Listado Completo — Consultorio Médico v0.4.0',
      Author: 'Aicore',
    },
  });

  const stream = fs.createWriteStream(OUTPUT);
  doc.pipe(stream);

  // ─── PORTADA ────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 8).fill(C.primary);
  doc.fontSize(26).font('Helvetica-Bold').fillColor(C.text);
  doc.text('Listado Completo', { align: 'center' }, doc.y + 190);
  doc.moveDown(0.3);
  doc.fontSize(14).font('Helvetica').fillColor(C.muted);
  doc.text('Consultorio Médico — Mejoras, Features y Pendientes', { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(11).fillColor(C.text);
  doc.text(`Versión: ${VERSION}`, { align: 'center' });
  doc.text('Build: TypeScript 0 errores | Tests: 59 pasan (4 suites)', { align: 'center' });
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'center' });
  doc.rect(0, doc.page.height - 8, doc.page.width, 8).fill(C.primary);

  // ─── 1. SECCIONES DEL DASHBOARD ────────────────────
  sectionH1(doc, '1. Secciones del Dashboard');

  body(doc, '8 secciones funcionales en desarrollo:');

  const w1 = [90, 55, 350];
  tableHeader(doc, ['Sección', 'Estado', 'Descripción'], w1);
  const rows1 = [
    ['Login + 2FA', '✅', 'NextAuth v5, 2FA TOTP, lockout 5 intentos'],
    ['Panel Principal', '✅', 'KPIs, próximos turnos, actividad reciente, quick actions'],
    ['Atención (Kanban)', '✅', '4 columnas drag & drop, timer, filtro médico'],
    ['Turnos', '✅', 'Vista lista + calendario, filtros combinados'],
    ['Pacientes', '✅', 'Listado + detalle con historial clínico'],
    ['Conversaciones', '✅', 'Bandeja unificada con datos mock realistas'],
    ['Recetas', '✅', 'Activas/vencidas, modal crear, PDF, WhatsApp'],
    ['Reportes', '✅', 'KPIs, 4 charts Recharts, export PDF/Excel, Comparativa'],
    ['Configuración', '✅', 'Perfil, 2FA, credenciales, horarios, IA, equipo'],
  ];
  let alt = false;
  for (const r of rows1) {
    tableRow(doc, r, w1, alt);
    alt = !alt;
  }

  // ─── 2. SEGURIDAD ──────────────────────────────────
  sectionH1(doc, '2. Seguridad — 9 Fases');

  body(doc, 'Auditoría completa de seguridad implementada:');

  const w2 = [60, 180, 260];
  tableHeader(doc, ['Fase', 'Feature', 'Archivos'], w2);
  const rows2 = [
    ['1', 'Cabeceras HTTP (HSTS, CSP, X-Frame-Options)', 'middleware.ts, next.config.js'],
    ['2', 'Rate limiting (login 5/min, API 30/min)', 'middleware.ts'],
    ['3', 'Password validator (8+ chars, mayúscula, num, símbolo)', 'lib/password-validator.ts'],
    ['3', 'Account lockout (5 intentos → 15 min)', 'lib/account-lockout.ts'],
    ['4', 'Auto-logout por inactividad (maxAge 30 min)', 'lib/auth.ts'],
    ['5', 'Auditoría de accesos (tabla + utility + APIs)', 'lib/audit-log.ts, schema.ts'],
    ['6', 'Validación firmas Twilio (X-Twilio-Signature)', 'app/api/webhooks/twilio/route.ts'],
    ['7', '2FA TOTP (speakeasy + QR + backup codes)', 'lib/mfa.ts, Configuración'],
    ['8', 'Backup encriptado (pg_dump + GPG + rotación + volúmenes Docker)', 'scripts/backup-encriptado.sh, scripts/backup-volumenes.sh, WF-07, backup-agent'],
    ['9', 'Sanitización prompts Ollama (anti-jailbreak)', 'docs/prompts-seguridad.md'],
  ];
  alt = false;
  for (const r of rows2) {
    tableRow(doc, r, w2, alt);
    alt = !alt;
  }

  // ─── 3. FIXES CRÍTICOS ─────────────────────────────
  sectionH1(doc, '3. Fixes de Seguridad Aplicados');

  const w3 = [75, 50, 370];
  tableHeader(doc, ['Fix', 'Gravedad', 'Descripción'], w3);
  const rows3 = [
    ['Rate limiting path incorrecto', '🔴 Crítica', 'Apuntaba a "/" en vez de "/api/auth/"'],
    ['API pacientes sin auth', '🔴 Crítica', 'Faltaba requireAuth() en GET y PATCH'],
    ['User enumeration', '🔴 Crítica', 'Se revelaba si email existía e intentos restantes'],
    ['Twilio JSON sin params', '🔴 Crítica', 'Firma validada contra objeto vacío'],
    ['Twilio console.log teléfonos', '🔴 Crítica', 'Exponía datos de pacientes'],
    ['SQL injection WF-01', '🔴 Crítica', 'Strings SQL concatenados desde expresiones n8n'],
    ['JSON race condition', '🔴 Crítica', 'writeJSON() sobreescribía archivo directo'],
    ['WF-02 nodo huérfano', '🔴 Crítica', 'PG Crear Turno desconectado del flujo'],
    ['WF-05 sin Merge', '🟠 Alta', 'Ollama se ejecutaba 4 veces con datos parciales'],
  ];
  alt = false;
  for (const r of rows3) {
    tableRow(doc, r, w3, alt);
    alt = !alt;
  }

  // ─── 4. TESTING ─────────────────────────────────────
  sectionH1(doc, '4. Testing — 59 Tests');

  body(doc, 'Infraestructura: vitest 4.1.6, testing-library/react 16, jsdom 29, user-event 14');
  body(doc, 'Configuración: vitest.config.ts con jsdom, alias @, setup automático');
  body(doc, 'Lint-staged: eslint --fix + prettier --write + vitest run --related');

  const w4 = [200, 50, 250];
  tableHeader(doc, ['Suite de Tests', 'Tests', 'Cobertura'], w4);
  const rows4 = [
    ['lib/__tests__/utils.test.ts', '25', 'cn, formatPhone, truncate, getInitials, slugify, colores, labels'],
    ['lib/__tests__/password-validator.test.ts', '11', 'Validación cada criterio, múltiples errores, vacío, formato'],
    ['lib/__tests__/account-lockout.test.ts', '13', 'Intentos, bloqueo 5, reset, case insensitive, remaining'],
    ['components/ui/__tests__/button.test.tsx', '10', 'Variantes, tamaños, disabled, click, asChild (Slot)'],
  ];
  alt = false;
  for (const r of rows4) {
    tableRow(doc, r, w4, alt);
    alt = !alt;
  }

  // ─── 5. UI/UX ───────────────────────────────────────
  sectionH1(doc, '5. Mejoras UI/UX');

  sectionH2(doc, '5.1  De la auditoría taste-skill (18 hallazgos)');
  const tasteItems = [
    'Easing custom: cubic-bezier(0.16,1,0.3,1)',
    'Border más sutil: 91.4% → 94% (light), 17.5% → 20% (dark)',
    'Shadows registradas: shadow-card, shadow-card-hover, shadow-toast',
    'Dialog: backdrop-blur-sm, rounded-xl, sin slide animation',
    'Toast: rounded-[10px], shadow-toast, entrada desde derecha',
    'Select: h-10 → h-9, rounded-md → rounded-lg',
    'Hover gate: hoverable: variant con @media (hover: hover)',
    'gap-1.5 → gap-2 en 4 páginas',
    'Button sizes: sm h-8→h-7, lg px-8→px-5',
    'Dropdown items padding: px-2 py-1.5 → px-3 py-2',
    'p-2.5 → p-3 en actividad reciente del dashboard',
  ];
  for (const item of tasteItems) bullet(doc, item);

  sectionH2(doc, '5.2  De la auditoría emilkowalski (9 fixes)');
  const emilItems = [
    'Button :active press state scale-[0.97]',
    'Custom easing curves registradas en Tailwind',
    'transition-all reemplazado en selector universal, hover-card, toast, quick actions, kanban',
    'DropdownMenu animado con animate-in + zoom-in-95',
    'Kanban: active:scale-[1.02] → active:scale-[0.97]',
    'prefers-reduced-motion en globals.css',
  ];
  for (const item of emilItems) bullet(doc, item);

  sectionH2(doc, '5.3  Fixes específicos de UI');
  const uiItems = [
    'Select: transform-origin desde Radix CSS variable',
    'Reportes: transition-all → transition-[transform,box-shadow] en cards',
    'Progress bars: scaleX + origin-left (GPU acelerado, sin layout)',
    'Charts: animationDuration 600-700ms → 300ms',
    'Charts: colores distintivos primary vs emerald (WCAG contraste)',
    'Comparativa: fix double-plus bug (+{w.cambio} → {w.cambio})',
    'Nuevos Pacientes chart: fix %-height → absolute inset-0',
    'Volumen WhatsApp chart: fix %-height → absolute inset-0',
    'Kanban "En Atención": hover no funcionaba — corregido',
  ];
  for (const item of uiItems) bullet(doc, item);

  sectionH2(doc, '5.4  Recharts Integration');
  body(doc, '4 componentes de chart SVG creados con Recharts: TurnosChart (apilado), NuevosPacientesChart (gradient), VolumenWhatsAppChart (agrupado), DistribucionEstadosChart (coloreado por celda). Tooltips personalizados, animación escalonada (stagger 100ms), leyendas custom, ejes con formato fecha.');
  body(doc, 'Extracción reportes-data.ts: página reducida de 903 a 703 líneas, datos movidos a archivo separado (216 líneas).');
  body(doc, 'Exportación Excel con SheetJS: 5 hojas (Resumen, Turnos, Intenciones, Obra Social, Canales).');
  body(doc, 'Comparativa Mensual: componente completo con KPIs, gráfico barras agrupadas, tabla de intenciones, cards WhatsApp.');

  // ─── 6. ERROR HANDLING ──────────────────────────────
  sectionH1(doc, '6. Error Handling — Nuevas Páginas');

  const w5 = [180, 200, 120];
  tableHeader(doc, ['Archivo', 'Ruta', 'Tipo'], w5);
  const rows5 = [
    ['not-found.tsx', 'app/', 'Página 404 custom'],
    ['error.tsx', 'app/', 'Error boundary global'],
    ['loading.tsx', 'app/', 'Loading spinner global'],
    ['error.tsx', 'app/dashboard/', 'Error boundary dashboard'],
    ['loading.tsx', 'app/dashboard/', 'Skeleton dashboard'],
    ['error.tsx', 'app/dashboard/reportes/', 'Error boundary reportes'],
    ['loading.tsx', 'app/dashboard/reportes/', 'Skeleton reportes'],
    ['loading.tsx', 'app/dashboard/pacientes/[id]/', 'Skeleton detalle paciente'],
    ['skeleton.tsx', 'components/ui/', 'Componente Skeleton'],
  ];
  alt = false;
  for (const r of rows5) {
    tableRow(doc, r, w5, alt);
    alt = !alt;
  }

  // ─── 7. INFRAESTRUCTURA ─────────────────────────────
  sectionH1(doc, '7. Infraestructura Docker');

  const w6 = [200, 300];
  tableHeader(doc, ['Recurso', 'Detalle'], w6);
  const rows6 = [
    ['Dockerfile', 'Multi-stage (deps → builder → runner), HEALTHCHECK, usuario no-root'],
    ['.dockerignore', 'Excluye node_modules, .next, .git, .envs, docs, IDE'],
    ['docker-compose.yml', '4 servicios: dashboard, postgres, n8n, ollama'],
    ['Health check', 'GET /api/health → PostgreSQL check, uptime, versión'],
    ['.env.example', 'Template completo con variables requeridas y opcionales'],
    ['next.config.js', 'output standalone, bundle analyzer, headers seguridad'],
  ];
  alt = false;
  for (const r of rows6) {
    tableRow(doc, r, w6, alt);
    alt = !alt;
  }

  // ─── 8. BASE DE DATOS ───────────────────────────────
  sectionH1(doc, '8. Base de Datos — Migraciones');

  body(doc, '8 migraciones SQL ejecutables en orden:');
  bullet(doc, '001-006: Migraciones base del esquema inicial');
  bullet(doc, '007_credenciales: Tabla de credenciales con encriptación AES-256-GCM');
  bullet(doc, '008_seguridad: auditoria_accesos + soft delete (8 tablas) + constraints (UNIQUE, CHECK) + índices (FKs, GIN, compuestos)');

  sectionH2(doc, 'Migration 008 — Detalle');
  bullet(doc, 'Tabla auditoria_accesos con 5 índices (created_at, usuario_id, accion, entidad, entidad_id)');
  bullet(doc, 'Soft delete: turnos, historial_medico, recetas, facturacion, conversaciones, mensajes, tareas_pendientes, bloqueos_agenda');
  bullet(doc, 'Constraints: uq_medicos_matricula, uq_pacientes_afiliado_obra_social, chk_turnos_duracion, chk_facturacion_monto');
  bullet(doc, 'Índices FKs: turnos_paciente_id, turnos_medico_id, historial_medico_paciente, recetas_paciente_id, conversaciones_paciente_id, mensajes_conversacion_id');
  bullet(doc, 'Índice compuesto: idx_conversaciones_estado_ultima (estado, ultima_interaccion DESC)');
  bullet(doc, 'Índice GIN: idx_pacientes_tags');

  // ─── 9. WORKFLOWS n8n ───────────────────────────────
  sectionH1(doc, '9. Workflows n8n');

  const w7 = [50, 170, 60, 60, 155];
  tableHeader(doc, ['ID', 'Nombre', 'Nodos', 'Estado', 'Modificado'], w7);
  const rows7 = [
    ['WF-01', 'WhatsApp Inbound + Triaje IA', '17', '⏸️ Inactivo', 'SQL injection fix'],
    ['WF-02', 'Gestión de Turnos', '15', '⏸️ Inactivo', 'Nodo conectado'],
    ['WF-03', 'Recordatorios Automáticos', '17', '⏸️ Inactivo', '-'],
    ['WF-04', 'Correo Inteligente IMAP + IA', '12', '⏸️ Inactivo', '-'],
    ['WF-05', 'Resumen Diario del Médico', '14', '⏸️ Inactivo', 'Merge+Code node'],
    ['WF-06', 'Recetas y Renovaciones', '11', '⏸️ Inactivo', '-'],
    ['WF-07', 'Backup Automático Encriptado', '-', '⏸️ Inactivo', '-'],
  ];
  alt = false;
  for (const r of rows7) {
    tableRow(doc, r, w7, alt);
    alt = !alt;
  }

  // ─── 10. PERFORMANCE ────────────────────────────────
  sectionH1(doc, '10. Performance');

  bullet(doc, 'Bundle analyzer: @next/bundle-analyzer@14.2.35 activado con ANALYZE=true');
  bullet(doc, 'Dynamic imports: 5 componentes Recharts (~150KB) con next/dynamic + ssr:false');
  bullet(doc, 'Carga bajo demanda: charts se cargan solo al navegar a Reportes');
  bullet(doc, 'Script analyze: pnpm analyze genera reporte en .next/analyze/');

  // ─── 11. DX ─────────────────────────────────────────
  sectionH1(doc, '11. Developer Experience (DX)');

  bullet(doc, 'Prettier: .prettierrc + .prettierignore (semi, singleQuote, printWidth 100)');
  bullet(doc, 'VSCode: .vscode/settings.json (formato automático, TS SDK, Tailwind CSS)');
  bullet(doc, 'Husky v9: pre-commit hook activo');
  bullet(doc, 'Lint-staged: eslint --fix + prettier --write + vitest run --related');
  bullet(doc, 'pnpm workspace: comandos desde raíz (pnpm dev, pnpm test, pnpm build)');
  bullet(doc, 'Scripts: test, test:watch, format, format:check, analyze, type-check');
  bullet(doc, 'PDF Generator: scripts/generate-pdf.js con pdfkit');

  // ─── 12. DOCUMENTACIÓN ──────────────────────────────
  sectionH1(doc, '12. Documentación Generada');

  const w8 = [250, 250];
  tableHeader(doc, ['Archivo', 'Contenido'], w8);
  const rows8 = [
    ['README.md', 'Overview con features, stack, estructura del repo'],
    ['INSTALL.md', 'Guía de inicio rápido (Docker y local)'],
    ['CHANGELOG.md', 'Historial v0.1.0 → v0.3.0'],
    ['docs/architecture.md', 'Arquitectura del sistema con diagramas'],
    ['docs/workflows.md', '7 workflows n8n documentados'],
    ['docs/database.md', 'Esquema completo (18 tablas, vistas, índices)'],
    ['docs/prompts-seguridad.md', 'Guía anti-jailbreak para Ollama'],
    ['docs/guia-mejoras-sprint1.md', 'Sprint 1: seguridad, Docker, workflows, UI'],
    ['docs/guia-mejoras-sprint2.md', 'Sprint 2: error handling, testing, DX, perf'],
    ['docs/guia-completa-sprint1-2.html', 'HTML imprimible PDF (Sprint 1+2)'],
    ['docs/guia-mejoras-sprint1-2.pdf', 'PDF con pdfkit (Sprint 1+2)'],
  ];
  alt = false;
  for (const r of rows8) {
    tableRow(doc, r, w8, alt);
    alt = !alt;
  }

  // ─── 13. PENDIENTES SPRINT 3 ────────────────────────
  sectionH1(doc, '13. Pendientes — Sprint 3');

  body(doc, 'Tareas para deploy en Dokploy:');

  const w9 = [50, 310, 60, 80];
  tableHeader(doc, ['#', 'Tarea', 'Prioridad', 'Depende'], w9);
  const rows9 = [
    ['1', 'Ejecutar migration 007 + 008 en producción (psql)', '🔴 Crítica', 'Acceso VPS'],
    ['2', 'Reimportar workflows en n8n UI (WF-01, WF-02, WF-05)', '🔴 Crítica', 'n8n deployado'],
    ['3', 'Configurar credenciales desde Dashboard', '🔴 Crítica', 'Admin login'],
    ['4', 'Activar workflows #1, #4 y #7 en n8n', '🟠 Alta', '#3'],
    ['5', 'Configurar webhooks Twilio → dominio real', '🟠 Alta', 'Dominio'],
    ['6', 'Reemplazar UUIDs placeholder médicos', '🟠 Alta', '#1'],
    ['7', 'Configurar Google Calendar / SMTP', '🟡 Media', '-'],
    ['8', 'Comprar dominio y configurar SSL', '🔴 Crítica', '-'],
    ['9', 'Configurar GPG key backup encriptado', '🟡 Media', 'Acceso SSH'],
    ['10', 'Actualizar WORKFLOW_CONTAINER_URL/API_KEY', '🔴 Crítica', 'n8n deployado'],
  ];
  alt = false;
  for (const r of rows9) {
    tableRow(doc, r, w9, alt);
    alt = !alt;
  }

  // ─── 14. MEJORAS FUTURAS ────────────────────────────
  sectionH1(doc, '14. Mejoras Futuras — Sprint 4+');

  const w10 = [120, 380];
  tableHeader(doc, ['Área', 'Mejora Propuesta'], w10);
  const rows10 = [
    ['Testing', 'Tests de integración APIs (fetch) + e2e con Playwright'],
    ['Frontend', 'Modo oscuro completo, tema configurable por usuario'],
    ['Frontend', 'Internacionalización (i18n)'],
    ['Backend', 'WebSockets para notificaciones en tiempo real'],
    ['Backend', 'API REST completa con OpenAPI/Swagger'],
    ['Infra', 'CI/CD con GitHub Actions (build + test + lint)'],
    ['Infra', 'Monitoreo con Sentry o similar'],
    ['Infra', 'Migrar de JSON fallback a PostgreSQL exclusivo'],
    ['Infra', 'Cache con Redis para sesiones y rate limiting'],
    ['n8n', 'Workflow de conciliación de pagos / facturación'],
    ['n8n', 'Workflow de encuestas post-consulta'],
    ['Seguridad', 'Roles y permisos granulares (RBAC)'],
    ['Seguridad', 'Dashboard visual de auditoría de accesos'],
    ['DX', 'Storybook para componentes UI'],
  ];
  alt = false;
  for (const r of rows10) {
    tableRow(doc, r, w10, alt);
    alt = !alt;
  }

  // ─── PIE ─────────────────────────────────────────────
  doc.addPage();
  doc.fontSize(16).font('Helvetica-Bold').fillColor(C.text);
  doc.text('Resumen de Archivos Modificados', { align: 'center' });
  doc.moveDown(1);

  const w11 = [300, 200];
  tableHeader(doc, ['Archivo', 'Tipo de Cambio'], w11);
  const files = [
    ['dashboard/Dockerfile + .dockerignore', 'Nueva infraestructura Docker'],
    ['docker-compose.yml', 'Orquestación 4 servicios'],
    ['app/api/health/route.ts', 'Health check endpoint'],
    ['middleware.ts', 'Rate limiting + headers seguridad'],
    ['lib/auth.ts', 'User enumeration fix + 2FA + lockout'],
    ['lib/data-store.ts', 'JSON atomic writes fix'],
    ['lib/utils.ts', 'slugify trim guiones extremos'],
    ['lib/password-validator.ts', 'Validador contraseñas'],
    ['lib/account-lockout.ts', 'Bloqueo por intentos fallidos'],
    ['lib/audit-log.ts', 'Auditoría de accesos'],
    ['lib/mfa.ts', '2FA TOTP con speakeasy'],
    ['lib/encryption.ts', 'AES-256-GCM'],
    ['lib/credential-store.ts', 'Credenciales encriptadas + sync n8n'],
    ['lib/n8n-sync.ts', 'Sincronización API n8n'],
    ['lib/export-reporte-excel.ts', 'Exportación Excel 5 hojas'],
    ['drizzle/schema.ts', '14 tablas + auditoría + 2FA'],
    ['app/api/pacientes/[id]/route.ts', 'Auth + validación + auditoría'],
    ['app/api/webhooks/twilio/route.ts', 'Fix firma + JSON body + prod/dev'],
    ['app/api/credenciales/route.ts', 'CRUD credenciales encriptadas'],
    ['app/api/auth/2fa/setup/route.ts', 'Setup 2FA QR + backup codes'],
    ['app/page.tsx', 'Login con flujo 2FA'],
    ['app/not-found.tsx', 'Página 404 custom'],
    ['app/error.tsx', 'Error boundary global'],
    ['app/loading.tsx', 'Loading spinner global'],
    ['app/dashboard/loading.tsx', 'Skeleton dashboard'],
    ['app/dashboard/error.tsx', 'Error boundary dashboard'],
    ['app/dashboard/reportes/loading.tsx', 'Skeleton reportes'],
    ['app/dashboard/reportes/error.tsx', 'Error boundary reportes'],
    ['app/dashboard/pacientes/[id]/loading.tsx', 'Skeleton detalle paciente'],
    ['app/dashboard/atencion/page.tsx', 'Fix hover en Kanban "En Atención"'],
    ['app/dashboard/reportes/page.tsx', 'Dynamic imports Recharts + refactor'],
    ['app/dashboard/reportes/reportes-data.ts', 'Tipos + datos mock separados'],
    ['app/dashboard/turnos/page.tsx', 'Filtros + acciones + calendario'],
    ['app/dashboard/configuracion/page.tsx', 'Refactor + IntegracionesDashboard'],
    ['components/ui/button.tsx', 'Variantes, tamaños, :active state'],
    ['components/ui/skeleton.tsx', 'Nuevo componente Skeleton'],
    ['components/ui/dialog.tsx', 'backdrop-blur, rounded-xl'],
    ['components/ui/toast.tsx', 'Animación + shadow + padding'],
    ['components/ui/dropdown-menu.tsx', 'Animación + padding items'],
    ['components/select.tsx', 'transform-origin + sizes'],
    ['components/charts/*.tsx', '4 charts Recharts + animaciones'],
    ['components/reportes/comparativa-mensual.tsx', 'Comparativa KPIs + gráfico'],
    ['components/configuracion/setup-2fa.tsx', 'Setup 2FA QR + verificación'],
    ['components/configuracion/credenciales-tab.tsx', 'CRUD credenciales encriptadas'],
    ['next.config.js', 'Standalone + bundle analyzer + headers'],
    ['tailwind.config.ts', 'Easing, shadows, hoverable variant'],
    ['app/globals.css', 'prefers-reduced-motion + colores'],
    ['vitest.config.ts', 'Nuevo: configuración vitest'],
    ['lib/__tests__/*.test.ts', '59 tests (utils, password, lockout)'],
    ['components/ui/__tests__/button.test.tsx', '10 tests button'],
    ['.prettierrc + .prettierignore', 'Configuración Prettier'],
    ['.vscode/settings.json', 'Configuración VSCode workspace'],
    ['pnpm-workspace.yaml', 'Workspace pnpm root → dashboard'],
    ['package.json (root)', 'Scripts delegados al workspace'],
    ['database/migrations/008_seguridad.sql', 'Auditoría + soft delete + constraints'],
    ['n8n-workflows/current/wf-01-agent.json', 'SQL injection fix'],
    ['n8n-workflows/current/wf-02-gestion-turnos.json', 'Nodo huérfano conectado'],
    ['n8n-workflows/current/wf-05-resumen-diario.json', 'Merge + Code aggregator'],
    ['scripts/backup-encriptado.sh', 'Backup pg_dump + GPG + rotación'],
    ['scripts/backup-volumenes.sh', 'Backup volúmenes Docker (n8n_data, metabase_data, recordings)'],
    ['scripts/generate-pdf.js', 'Generador PDF con pdfkit'],
    ['docs/*', 'Documentación completa (10+ archivos)'],
  ];
  alt = false;
  for (const [file, desc] of files) {
    checkSpace(doc, 20);
    tableRow(doc, [file, desc], w11, alt);
    alt = !alt;
  }

  // ─── FINAL ──────────────────────────────────────────
  doc.moveDown(3);
  doc.fontSize(9).font('Helvetica').fillColor(C.muted);
  doc.text('Documento generado automáticamente — Consultorio Médico v' + VERSION, {
    align: 'center',
  });
  doc.text('Commits: d54a248 | 6f6e8fe | e8bc1db | 2d88ce6 | 8025dcb | 3e85ca2 | 1ea95d2', {
    align: 'center',
  });

  doc.end();
  stream.on('finish', () => {
    console.log(`✅ PDF generado: ${OUTPUT}`);
    console.log(`   Tamaño: ${(fs.statSync(OUTPUT).size / 1024).toFixed(1)} KB`);
    console.log(`   Páginas: ~${pageNum + 1}`);
  });
}

genPDF();
