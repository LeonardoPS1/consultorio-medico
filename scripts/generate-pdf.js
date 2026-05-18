// ============================================================
// generate-pdf.js — Genera PDF con todas las mejoras Sprint 1+2
// Uso: node scripts/generate-pdf.js
// ============================================================

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, '..', 'docs', 'guia-mejoras-sprint1-2.pdf');
const VERSION = '0.4.0';
const DATE = '17 de mayo de 2026';

// ─── Colores ────────────────────────────────────────────────
const C = {
  primary: '#2563eb',
  text: '#1a1a2e',
  muted: '#64748b',
  border: '#e2e8f0',
  bgLight: '#f8fafc',
  bgDanger: '#fef2f2',
  danger: '#ef4444',
  bgOk: '#f0fdf4',
  ok: '#16a34a',
  code: '#0f172a',
  codeText: '#e2e8f0',
};

// ─── Helpers ────────────────────────────────────────────────
function coverPage(doc) {
  const pageH = doc.page.height;

  // Barra decorativa superior
  doc.rect(0, 0, doc.page.width, 8).fill(C.primary);

  doc.fontSize(28).font('Helvetica-Bold').fillColor(C.text);
  doc.text('Guía Completa de Mejoras', { align: 'center' }, doc.y + 180);

  doc.moveDown(0.5);
  doc.fontSize(14).font('Helvetica').fillColor(C.muted);
  doc.text('Consultorio Médico — Sprint 1 + Sprint 2', { align: 'center' });

  doc.moveDown(2);
  doc.fontSize(11).fillColor(C.text);
  doc.text(`Versión: ${VERSION}`, { align: 'center' });
  doc.text(`Fecha: ${DATE}`, { align: 'center' });
  doc.text(`Build: TypeScript 0 errores • Tests: 59 pasan (4 suites)`, {
    align: 'center',
  });
  doc.text(`Commits: d54a248, 6f6e8fe, e8bc1db, 2d88ce6, 8025dcb`, {
    align: 'center',
  });

  // Barra decorativa inferior
  doc.rect(0, pageH - 8, doc.page.width, 8).fill(C.primary);
}

function sectionTitle(doc, text, num) {
  doc.addPage();
  doc.rect(0, 0, doc.page.width, 38).fill(C.primary);
  doc
    .fontSize(18)
    .font('Helvetica-Bold')
    .fillColor('#ffffff')
    .text(`${num}. ${text}`, 40, 10, { width: doc.page.width - 80 });

  doc.moveDown(4);
  doc.fillColor(C.text);
}

function subTitle(doc, text) {
  doc.moveDown(1);
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#1e293b')
    .text(text);
  doc.moveDown(0.3);
  doc
    .moveTo(40, doc.y)
    .lineTo(doc.page.width - 40, doc.y)
    .strokeColor(C.border)
    .stroke();
  doc.moveDown(0.5);
  doc.fillColor(C.text);
}

function subSubTitle(doc, text) {
  doc.moveDown(0.8);
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#334155').text(text);
  doc.moveDown(0.3);
  doc.fillColor(C.text);
}

function body(doc, text) {
  doc.fontSize(10).font('Helvetica').fillColor(C.text).text(text, {
    align: 'left',
    lineGap: 2,
  });
  doc.moveDown(0.3);
}

function bullet(doc, text, indent = 20) {
  doc.fontSize(10).font('Helvetica').fillColor(C.text);
  doc.text(`  •  ${text}`, indent, doc.y, { lineGap: 2 });
  doc.moveDown(0.15);
}

function codeBlock(doc, code) {
  doc.moveDown(0.3);
  const yStart = doc.y;
  const lines = code.split('\n');
  const lineH = 11;
  const padding = 8;
  const blockH = lines.length * lineH + padding * 2;

  // Fondo
  doc.rect(40, yStart, doc.page.width - 80, blockH).fill(C.code);

  // Texto
  doc.fontSize(8.5).font('Courier').fillColor(C.codeText);
  let y = yStart + padding;
  for (const line of lines) {
    doc.text(line, 48, y, { lineGap: 0 });
    y += lineH;
  }
  doc.y = y + padding * 0.5;
  doc.fillColor(C.text);
}

function dangerBox(doc, text) {
  doc.moveDown(0.3);
  const yStart = doc.y;
  const padding = 8;
  const textW = doc.page.width - 80 - 28;
  const lines = Math.ceil(
    doc.fontSize(9).font('Helvetica').widthOfString(text) / textW,
  );
  const boxH = Math.max(28, lines * 13 + padding * 2);

  doc.rect(40, yStart, doc.page.width - 80, boxH).fill(C.bgDanger);
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor(C.danger)
    .text('⚠ ', 48, yStart + padding);

  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor(C.text)
    .text(text, 62, yStart + padding, { width: textW, lineGap: 1 });

  doc.y = yStart + boxH + 4;
}

function successBox(doc, text) {
  doc.moveDown(0.3);
  const yStart = doc.y;
  const padding = 8;
  const textW = doc.page.width - 80 - 28;
  const lines = Math.ceil(
    doc.fontSize(9).font('Helvetica').widthOfString(text) / textW,
  );
  const boxH = Math.max(28, lines * 13 + padding * 2);

  doc.rect(40, yStart, doc.page.width - 80, boxH).fill(C.bgOk);
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor(C.ok)
    .text('✓ ', 48, yStart + padding);
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor(C.text)
    .text(text, 62, yStart + padding, { width: textW, lineGap: 1 });
  doc.y = yStart + boxH + 4;
}

function tableHeader(doc, cols) {
  const colW = (doc.page.width - 80) / cols.length;
  doc.rect(40, doc.y, doc.page.width - 80, 18).fill('#f1f5f9');
  doc.fontSize(9).font('Helvetica-Bold').fillColor(C.text);
  let x = 44;
  for (const col of cols) {
    doc.text(col, x, doc.y + 4, { width: colW - 8, lineGap: 0 });
    x += colW;
  }
  doc.y += 18;
}

function tableRow(doc, cols, isAlt = false) {
  const colW = (doc.page.width - 80) / cols.length;
  if (isAlt) doc.rect(40, doc.y - 2, doc.page.width - 80, 20).fill('#fafafa');
  doc.fontSize(8.5).font('Helvetica').fillColor(C.text);
  let x = 44;
  for (const col of cols) {
    doc.text(col, x, doc.y, { width: colW - 8, lineGap: 0 });
    x += colW;
  }
  doc.y += 22;
}

function checkPageSpace(doc, needed = 60) {
  if (doc.y + needed > doc.page.height - 50) {
    doc.addPage();
  }
}

// ─── Main ───────────────────────────────────────────────────
function generate() {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    info: {
      Title: 'Guía de Mejoras — Consultorio Médico v0.4.0',
      Author: 'Aicore',
      Subject: 'Sprint 1 + Sprint 2',
      Keywords: 'consultorio medico, n8n, twilio, nextjs, testing',
    },
  });

  const stream = fs.createWriteStream(OUTPUT);
  doc.pipe(stream);

  // ─── Cover ──────────────────────────────────────────────
  coverPage(doc);

  // ─── TOC ────────────────────────────────────────────────
  doc.addPage();
  doc.fontSize(18).font('Helvetica-Bold').fillColor(C.text).text('Índice');
  doc.moveDown(1);

  const toc = [
    ['1', 'Sprint 1 — Seguridad, Workflows n8n, DB y UI'],
    ['  1.1', 'Infraestructura Docker'],
    ['  1.2', 'Seguridad y Autenticación'],
    ['  1.3', 'Base de Datos — Migration 008'],
    ['  1.4', 'Workflows n8n'],
    ['  1.5', 'Frontend y UI'],
    ['2', 'Sprint 2 — Error Handling, Testing, DX, Performance'],
    ['  2.1', 'Error Handling (P1)'],
    ['  2.2', 'Testing Infrastructure (P2)'],
    ['  2.3', 'Developer Experience (P3)'],
    ['  2.4', 'Performance (P4)'],
    ['3', 'Verificación Post-Deploy'],
  ];

  for (const [num, title] of toc) {
    const isSection = !num.startsWith(' ');
    doc
      .fontSize(isSection ? 11 : 10)
      .font(isSection ? 'Helvetica-Bold' : 'Helvetica')
      .fillColor(isSection ? C.text : '#475569')
      .text(`${num.trim()}. ${title}`, 40, doc.y, { lineGap: 4 });
  }

  // ==========================================================
  // SPRINT 1
  // ==========================================================
  sectionTitle(doc, 'Sprint 1 — Seguridad, Workflows n8n, DB y UI', '1');

  // --- 1.1 Docker ---
  subTitle(doc, '1.1  Infraestructura Docker');

  body(doc, 'Archivos creados para el deploy con Dokploy:');

  tableHeader(doc, ['Archivo', 'Propósito']);
  tableRow(doc, ['dashboard/Dockerfile', 'Build multi-stage (3 etapas)']);
  tableRow(doc, ['dashboard/.dockerignore', 'Excluye archivos innecesarios'], true);
  tableRow(doc, ['docker-compose.yml', '4 servicios: dashboard, postgres, n8n, ollama']);
  tableRow(doc, ['app/api/health/route.ts', 'Health check endpoint'], true);
  tableRow(doc, ['.env.example', 'Template de variables de entorno']);

  body(doc, 'Dockerfile en 3 etapas: deps (pnpm install) → builder (next build standalone) → runner (node:20-alpine, usuario no-root). Incluye HEALTHCHECK cada 30s en /api/health.');

  body(doc, 'docker-compose.yml: 4 servicios en red bridge con volúmenes persistentes. PostgreSQL con migraciones automáticas via docker-entrypoint-initdb.d. Ollama con límite de 8G RAM.');

  // --- 1.2 Seguridad ---
  subTitle(doc, '1.2  Seguridad y Autenticación');

  subSubTitle(doc, 'Rate limiting de login');
  dangerBox(doc, 'El rate limit apuntaba a pathname === "/" pero NextAuth v5 POSTea a /api/auth/callback/credentials.');
  codeBlock(doc, `  // Antes (no funcionaba)
  if (pathname === '/' && request.method === 'POST')

  // Después (corregido)
  if (pathname.startsWith('/api/auth/') && request.method === 'POST')`);

  subSubTitle(doc, 'Autenticación en API pacientes');
  dangerBox(doc, 'GET/PATCH /api/pacientes/[id] no verificaban sesión.');
  body(doc, 'Nuevo helper requireAuth() retorna 401 si no hay sesión. GET retorna 404 si no existe. PATCH valida body vacío. Errores internos ocultan detalle en producción.');

  subSubTitle(doc, 'User enumeration');
  dangerBox(doc, 'Se revelaba si el email existía y cuántos intentos restaban.');
  body(doc, 'Mensaje unificado: "Email o contraseña incorrectos" en todos los casos. Eliminado getRemainingAttempts() del flujo de error. Cuenta bloqueada sin minutos restantes.');

  subSubTitle(doc, 'Validación de firma Twilio');
  dangerBox(doc, 'JSON bodies no poblaban params, la firma se validaba contra objeto vacío.');
  body(doc, 'Flujo validateTwilioRequest() con split producción/desarrollo. JSON bodies ahora pasan params. Error 403 sin detalles en producción. Eliminado console.log con teléfono de paciente.');

  subSubTitle(doc, 'JSON writes atómicos');
  dangerBox(doc, 'writeJSON() escribía directo al archivo. Race condition en writes concurrentes.');
  codeBlock(doc, `  function writeJSON<T>(path: string, data: T): void {
    const tmp = path + '.tmp.' + process.pid;
    fs.writeFileSync(tmp, JSON.stringify(data), 'utf-8');
    fs.renameSync(tmp, path); // Atómico en mismo filesystem
  }`);

  // --- 1.3 Migration 008 ---
  subTitle(doc, '1.3  Base de Datos — Migration 008');

  subSubTitle(doc, 'Tabla auditoria_accesos');
  codeBlock(doc, `  CREATE TABLE auditoria_accesos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    accion VARCHAR(100) NOT NULL,
    entidad VARCHAR(100) NOT NULL,
    ip VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  -- 5 índices: created_at, usuario_id, accion, entidad, entidad_id`);

  subSubTitle(doc, 'Soft Delete (8 tablas)');
  body(doc, 'Columna deleted_at TIMESTAMPTZ agregada a: turnos, historial_medico, recetas, facturacion, conversaciones, mensajes, tareas_pendientes, bloqueos_agenda.');

  subSubTitle(doc, 'Constraints');
  bullet(doc, 'uq_medicos_matricula — UNIQUE en matrícula');
  bullet(doc, 'uq_pacientes_afiliado_obra_social — UNIQUE en (afiliado, obra_social)');
  bullet(doc, 'chk_turnos_duracion — CHECK duración > 0');
  bullet(doc, 'chk_facturacion_monto — CHECK monto > 0');

  subSubTitle(doc, 'Índices');
  bullet(doc, 'FKs: turnos_paciente_id, turnos_medico_id, historial_medico_paciente, etc.');
  bullet(doc, 'GIN: idx_pacientes_tags');
  bullet(doc, 'Compuesto: idx_conversaciones_estado_ultima (estado, ultima_interaccion DESC)');

  // --- 1.4 Workflows n8n ---
  subTitle(doc, '1.4  Workflows n8n');

  subSubTitle(doc, 'WF-01: SQL injection fix');
  dangerBox(doc, 'Queries de "Consultar Turnos" y "Consultar Recetas" concatenaban strings SQL desde expresiones n8n.');
  codeBlock(doc, `  // Antes (vulnerable)
  "query": "={{ 'SELECT ... WHERE id = ' + $json.id }}"
  // Después (seguro)
  "query": "SELECT ... WHERE id = $1",
  "queryParams": "={{ [$json.id] }}"`);
  body(doc, 'Además: función esc() mejorada para backslashes, null bytes y caracteres de control.');

  subSubTitle(doc, 'WF-02: Nodo huérfano');
  dangerBox(doc, 'El nodo "PG - Crear Turno" NO estaba conectado al flujo. Los turnos nunca se guardaban en BD.');
  codeBlock(doc, `  // Antes:  Responder Horarios → Confirmación Turno
  // Después: Responder Horarios → PG Crear Turno → Confirmación Turno`);

  subSubTitle(doc, 'WF-05: Merge node + Code aggregator');
  dangerBox(doc, '4 queries paralelas alimentaban a Ollama sin Merge. Se ejecutaba 4 veces con datos parciales.');
  codeBlock(doc, `  Cron → [PG-Turnos, PG-Pacientes, PG-Mensajes, PG-Recetas]
       ↓
  Merge (combine multiplex)
       ↓
  Code - Agrupar Datos (objeto único)
       ↓
  Ollama - Generar Resumen (1 ejecución)`);

  // --- 1.5 UI ---
  subTitle(doc, '1.5  Frontend y UI');

  tableHeader(doc, ['Componente', 'Antes', 'Después']);
  tableRow(doc, ['Select', 'Sin transform-origin', 'var(--radix-select-content-transform-origin)']);
  tableRow(doc, ['Reportes cards', 'transition-all', 'transition-[transform,box-shadow]'], true);
  tableRow(doc, ['Progress bars', 'transition-[height]', 'scaleX + origin-left (GPU)']);
  tableRow(doc, ['Chart animación', '600-700ms', '300ms'], true);
  tableRow(doc, ['Chart colores', 'fillOpacity 0.4', 'Colores primario vs emerald']);
  tableRow(doc, ['Comparativa', '+{w.cambio}', '{w.cambio} (fix double-plus)'], true);

  // ==========================================================
  // SPRINT 2
  // ==========================================================
  sectionTitle(doc, 'Sprint 2 — Error Handling, Testing, DX, Performance', '2');

  // --- 2.1 Error Handling ---
  subTitle(doc, '2.1  Error Handling (P1)');

  body(doc, '9 archivos creados:');

  tableHeader(doc, ['Archivo', 'Ruta', 'Descripción']);
  tableRow(doc, ['not-found.tsx', 'app/', '404 con botones volver/retroceder']);
  tableRow(doc, ['error.tsx', 'app/', 'Error boundary global con ID + reintentar'], true);
  tableRow(doc, ['loading.tsx', 'app/', 'Spinner global centrado']);
  tableRow(doc, ['loading.tsx', 'app/dashboard/', 'Skeleton KPIs + charts + actividad'], true);
  tableRow(doc, ['error.tsx', 'app/dashboard/', 'Error boundary dashboard']);
  tableRow(doc, ['loading.tsx', 'app/dashboard/reportes/', 'Skeleton reportes'], true);
  tableRow(doc, ['error.tsx', 'app/dashboard/reportes/', 'Error reportes']);
  tableRow(doc, ['loading.tsx', 'app/dashboard/pacientes/[id]/', 'Skeleton detalle paciente'], true);
  tableRow(doc, ['skeleton.tsx', 'components/ui/', 'Componente Skeleton animate-pulse']);

  body(doc, 'Next.js 14 usa error.tsx como error boundary automático por segmento. Cada error.tsx recibe error (con digest) y reset() para reintentar.');

  // --- 2.2 Testing ---
  subTitle(doc, '2.2  Testing Infrastructure (P2)');

  body(doc, 'Stack instalado: vitest 4.1.6, @testing-library/react 16.3.2, @testing-library/jest-dom 6.9.1, @testing-library/user-event 14.6.1, jsdom 29.1.1, @vitejs/plugin-react 6.0.2.');

  subSubTitle(doc, 'vitest.config.ts');
  codeBlock(doc, `  export default defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      setupFiles: ['./lib/__tests__/setup.ts'],
      globals: true,
      include: ['**/*.test.{ts,tsx}'],
    },
    resolve: {
      alias: { '@': path.resolve(__dirname, '.') },
    },
  });`);

  body(doc, '59 tests en 4 suites:');

  subSubTitle(doc, 'utils.test.ts — 25 tests');
  bullet(doc, 'cn(): clases simples, falsy, merge Tailwind, condicionales');
  bullet(doc, 'formatPhone(): número argentino, vacío, sin código de país');
  bullet(doc, 'truncate(): corto, largo default 100, custom, exacto');
  bullet(doc, 'getInitials(): mayúsculas, acentos, apellido faltante');
  bullet(doc, 'slugify(): simple, especiales, guiones duplicados, espacios');
  bullet(doc, 'getTurnoColor() / getTurnoLabel(): estados y colores');

  subSubTitle(doc, 'password-validator.test.ts — 11 tests');
  bullet(doc, 'Rechaza: corta, sin mayúscula, sin minúscula, sin número, sin símbolo');
  bullet(doc, 'Acepta: contraseña válida con score=5');
  bullet(doc, 'Acumula múltiples errores, string vacío score 0');
  bullet(doc, 'passwordErrorsToString(): vacío, 1 error, múltiples');

  subSubTitle(doc, 'account-lockout.test.ts — 13 tests');
  bullet(doc, 'Primer intento no bloquea, 5to bloquea con 15 min');
  bullet(doc, 'Case insensitive para email');
  bullet(doc, 'resetFailedAttempts() desbloquea');
  bullet(doc, 'getRemainingAttempts(): 5 inicial, decrementa, 0 si bloqueado');

  subSubTitle(doc, 'button.test.tsx — 10 tests');
  bullet(doc, 'Renderizado con texto, variantes (default, destructive, outline, ghost, link)');
  bullet(doc, 'Tamaños (default, sm, lg, icon), disabled, asChild');
  bullet(doc, 'Click handler se dispara, disabled bloquea onClick');

  // --- 2.3 DX ---
  subTitle(doc, '2.3  Developer Experience (P3)');

  subSubTitle(doc, 'Prettier');
  body(doc, '.prettierrc: semi: true, singleQuote, trailingComma: all, printWidth: 100.');
  body(doc, '.prettierignore: node_modules, .next, .data.');

  subSubTitle(doc, 'VSCode (.vscode/settings.json)');
  bullet(doc, 'Formatter: esbenp.prettier-vscode, formatOnSave: true');
  bullet(doc, 'ESLint fix on save, TypeScript SDK configurado');
  bullet(doc, 'Tailwind CSS class regex para cn()');

  subSubTitle(doc, 'Lint-staged mejorado');
  codeBlock(doc, `  "*.{ts,tsx}": [
    "eslint --fix",
    "prettier --write",
    "vitest run --related --reporter=verbose"
  ]`);

  // --- 2.4 Performance ---
  subTitle(doc, '2.4  Performance (P4)');

  subSubTitle(doc, 'Bundle Analyzer');
  body(doc, '@next/bundle-analyzer@14.2.35 instalado. Se activa con ANALYZE=true en el entorno.');
  codeBlock(doc, `  pnpm analyze
  // o: ANALYZE=true next build`);

  subSubTitle(doc, 'Dynamic Imports');
  body(doc, '5 componentes de Recharts (~150KB total) migrados a next/dynamic con ssr:false:');
  bullet(doc, 'TurnosChart, NuevosPacientesChart, VolumenWhatsAppChart');
  bullet(doc, 'DistribucionEstadosChart, ComparativaMensual');
  body(doc, 'Cada uno con loading state skeleton. Se cargan solo al navegar a Reportes.');

  // ==========================================================
  // VERIFICACIÓN
  // ==========================================================
  sectionTitle(doc, 'Verificación Post-Deploy', '3');

  successBox(doc, 'TypeScript: 0 errores • Tests: 59 passed (4 suites) • Build: standalone');

  subSubTitle(doc, 'TypeScript');
  codeBlock(doc, `  cd dashboard
  pnpm type-check
  # → 0 errores`);

  subSubTitle(doc, 'Tests');
  codeBlock(doc, `  pnpm test        # vitest run (59 tests)
  pnpm test:watch  # modo desarrollo`);

  subSubTitle(doc, '404 page');
  codeBlock(doc, `  curl http://localhost:3000/pagina-inexistente
  # → HTML con "Página no encontrada"`);

  subSubTitle(doc, 'Rate limiting');
  codeBlock(doc, `  for i in $(seq 1 6); do
    curl -s -o /dev/null -w "%{http_code}\\n" \\
      -X POST http://localhost:3000/api/auth/callback/credentials
  done
  # → 200, 200, 200, 200, 200, 429`);

  subSubTitle(doc, 'Health check');
  codeBlock(doc, `  curl https://tudominio.com/api/health
  # → {"status":"ok","version":"0.4.0"}`);

  subSubTitle(doc, 'Auth API pacientes');
  codeBlock(doc, `  # Sin sesión → 401
  curl http://localhost:3000/api/pacientes/123
  # → {"error":"No autorizado. Iniciá sesión para acceder."}`);

  subSubTitle(doc, 'Bundle analysis');
  codeBlock(doc, `  cd dashboard && pnpm analyze
  # → .next/analyze/client.html`);

  // ─── Final ──────────────────────────────────────────────
  doc.addPage();
  doc.fontSize(16).font('Helvetica-Bold').fillColor(C.text);
  doc.text('Resumen de archivos modificados', { align: 'center' });
  doc.moveDown(1);

  tableHeader(doc, ['Archivo', 'Cambio']);
  const files = [
    ['Dockerfile + docker-compose.yml', 'Nueva infraestructura + health check'],
    ['middleware.ts', 'Fix rate limiting path'],
    ['lib/auth.ts', 'Fix user enumeration'],
    ['app/api/pacientes/[id]/route.ts', 'Auth + validación'],
    ['app/api/webhooks/twilio/route.ts', 'Fix firma + JSON body'],
    ['lib/data-store.ts', 'JSON atomic writes'],
    ['database/migrations/008_seguridad.sql', 'Auditoría + soft delete'],
    ['wf-01-agent.json', 'SQL injection fix'],
    ['wf-02-gestion-turnos.json', 'Fix nodo huérfano'],
    ['wf-05-resumen-diario.json', 'Merge + Code aggregator'],
    ['components/select.tsx', 'transform-origin fix'],
    ['components/charts/*.tsx', 'Animaciones + colores'],
    ['app/not-found.tsx', 'Página 404 custom'],
    ['app/error.tsx', 'Error boundary global'],
    ['app/dashboard/loading.tsx', 'Skeleton dashboard'],
    ['vitest.config.ts + tests/', '59 tests en 4 suites'],
    ['.prettierrc + .vscode/settings.json', 'Prettier + VSCode config'],
    ['next.config.js', 'Bundle analyzer + standalone'],
    ['app/dashboard/reportes/page.tsx', 'Dynamic imports Recharts'],
  ];

  let alt = false;
  for (const [file, desc] of files) {
    tableRow(doc, [file, desc], alt);
    alt = !alt;
  }

  // Pie de página final
  doc.moveDown(3);
  doc.fontSize(9).font('Helvetica').fillColor(C.muted);
  doc.text('Documento generado el ' + DATE + ' — Consultorio Médico v' + VERSION, {
    align: 'center',
  });
  doc.text('Commits: d54a248 | 6f6e8fe | e8bc1db | 2d88ce6 | 8025dcb', {
    align: 'center',
  });

  doc.end();
  stream.on('finish', () => {
    console.log(`✅ PDF generado: ${OUTPUT}`);
    console.log(`   Tamaño: ${(fs.statSync(OUTPUT).size / 1024).toFixed(1)} KB`);
  });
}

generate();
