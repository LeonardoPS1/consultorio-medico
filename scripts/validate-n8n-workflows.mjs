#!/usr/bin/env node

/**
 * validate-n8n-workflows.mjs
 * Valida la estructura de los workflows n8n exportados como JSON.
 * Se usa en CI para asegurar que los archivos en n8n-workflows/current/
 * sean válidos antes de hacer deploy.
 *
 * Uso:
 *   node scripts/validate-n8n-workflows.mjs
 *   node scripts/validate-n8n-workflows.mjs --strict  # valida también campos opcionales
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKFLOWS_DIR = join(__dirname, '..', 'n8n-workflows', 'current');
const ARCHIVE_DIR = join(__dirname, '..', 'n8n-workflows', 'archive');
const STRICT = process.argv.includes('--strict');

const REQUIRED_NODE_FIELDS = ['name', 'type', 'typeVersion', 'parameters'];
const ALLOWED_WEBHOOK_PATHS = [
  /^[\w-]+$/,            // paths simples (ej: "consultorio-inbound")
  /^webhook\//,           // n8n paths con prefijo webhook/
  /^https?:\/\//,         // URLs completas
];
const FORBIDDEN_PATTERNS = [
  /51\.222\.207\.250/,  // IP de producción hardcodeada
  /password=|PASSWORD=|SECRET=|API_KEY=/i,
  /-----BEGIN (RSA |EC )?PRIVATE KEY-----/,
];

let errors = 0;
let warnings = 0;

function error(msg, file) {
  console.error(`  ❌ ${msg}${file ? ` (${file})` : ''}`);
  errors++;
}

function warn(msg, file) {
  console.warn(`  ⚠️  ${msg}${file ? ` (${file})` : ''}`);
  warnings++;
}

function validateJSON(filePath, filename) {
  let wf;
  try {
    const raw = readFileSync(filePath, 'utf-8');
    wf = JSON.parse(raw);
  } catch (err) {
    error(`JSON inválido: ${err.message}`, filename);
    return;
  }

  // --- Campos top-level ---
  if (!wf.name || typeof wf.name !== 'string') {
    error('Falta "name" (string)', filename);
  }
  if (!Array.isArray(wf.nodes)) {
    error('Falta "nodes" (array)', filename);
    return; // no podemos seguir sin nodes
  }
  if (wf.nodes.length === 0) {
    error('"nodes" está vacío', filename);
    return;
  }
  if (!wf.connections || typeof wf.connections !== 'object') {
    error('Falta "connections" (object)', filename);
  }

  const nodeNames = new Set();
  const nodeIds = new Set();
  const nodeTypes = new Set();

  // --- Validar nodos ---
  for (const [i, node] of wf.nodes.entries()) {
    const label = `${filename}:${i} (“${node.name || '?'}”)`;

    // Campos requeridos
    for (const field of REQUIRED_NODE_FIELDS) {
      if (node[field] === undefined || node[field] === null) {
        error(`Nodo #${i} falta "${field}"`, label);
      }
    }

    // typeVersion debe ser número
    if (node.typeVersion !== undefined && typeof node.typeVersion !== 'number') {
      error(`Nodo #${i} “typeVersion” no es número`, label);
    }

    // position debe ser [x, y]
    if (node.position && !Array.isArray(node.position)) {
      error(`Nodo #${i} “position” no es array`, label);
    }

    // Nombres duplicados
    if (node.name && nodeNames.has(node.name)) {
      error(`Nombre de nodo duplicado: “${node.name}”`, filename);
    }
    if (node.name) {
      nodeNames.add(node.name);
    }
    // IDs duplicados
    if (node.id && nodeIds.has(node.id)) {
      error(`ID de nodo duplicado: “${node.id}”`, filename);
    }
    if (node.id) {
      nodeIds.add(node.id);
    }
    if (node.type) {
      nodeTypes.add(node.type);
    }

    // WebhookId solo en nodos webhook
    if (node.webhookId && node.type !== 'n8n-nodes-base.webhook') {
      warn(`Nodo “${node.name}” tiene webhookId pero no es tipo webhook`, label);
    }

    // Validar parámetros de webhooks
    if (node.type === 'n8n-nodes-base.webhook' && node.parameters) {
      const httpMethod = node.parameters.httpMethod || '';
      const path = node.parameters.path || '';
      const options = node.parameters.options || {};

      if (httpMethod && !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(httpMethod)) {
        warn(`Webhook “${node.name}” usa método HTTP inusual: ${httpMethod}`, label);
      }

      if (path && !ALLOWED_WEBHOOK_PATHS.some(p => p.test(path))) {
        warn(`Webhook “${node.name}” con path sospechoso: ${path}`, label);
      }

      // Verificar que no tenga rawBody sin necesidad
      if (options.rawBody) {
        warn(`Webhook “${node.name}” tiene rawBody habilitado — asegurar que sea necesario`, label);
      }
    }
  }

  // --- Validar connections ---
  // n8n usa node NAMES para connections, pero workflows exportados
  // con IDs pueden usar node IDs. Validamos contra ambos.
  const nodeRefs = new Set([...nodeNames, ...nodeIds]);
  function findNode(ref) {
    return nodeNames.has(ref) || nodeIds.has(ref);
  }

  if (wf.connections) {
    for (const [sourceRef, outputs] of Object.entries(wf.connections)) {
      if (!findNode(sourceRef)) {
        error(`Connection source “${sourceRef}” no existe como nodo (name|id)`, filename);
      }

      if (outputs.main) {
        for (const [outIdx, targets] of outputs.main.entries()) {
          if (!Array.isArray(targets)) {
            error(`Output #${outIdx} de “${sourceRef}” no es array`, filename);
            continue;
          }
          for (const target of targets) {
            if (target.node && !findNode(target.node)) {
              error(`Connection “${sourceRef}” → “${target.node}” no existe como nodo (name|id)`, filename);
            }
            if (target.type && target.type !== 'main') {
              warn(`Connection “${sourceRef}” usa tipo no estándar: ${target.type}`, filename);
            }
          }
        }
      }
    }
  }

  // --- Validar ausencia de secretos hardcodeados ---
  const raw = readFileSync(filePath, 'utf-8');
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(raw)) {
      error(`Contiene patrón prohibido: ${pattern}`, filename);
    }
  }

  // --- Verificar settings mínimos (si existen) ---
  if (wf.settings && typeof wf.settings !== 'object') {
    error('"settings" no es un objeto', filename);
  }
}

// --- Ejecutar ---
console.log(`\n🔍 Validando workflows n8n...\n`);

// Solo validamos current/ en CI (archive/ es histórico)
const dirs = ['current'];
if (STRICT) dirs.push('archive');

for (const dir of dirs) {
  const fullDir = join(join(__dirname, '..', 'n8n-workflows'), dir);
  let files;
  try {
    files = readdirSync(fullDir).filter(f => f.endsWith('.json'));
  } catch {
    warn(`Directorio n8n-workflows/${dir} no encontrado`);
    continue;
  }

  if (files.length === 0) {
    warn(`No hay workflows JSON en n8n-workflows/${dir}`);
    continue;
  }

  console.log(`📂 n8n-workflows/${dir}/ (${files.length} archivos)`);
  for (const file of files.sort()) {
    console.log(`\n  📄 ${file}`);
    validateJSON(join(fullDir, file), file);
  }
}

// --- Resumen ---
console.log(`\n${'─'.repeat(50)}`);
console.log(`\n📊 Resultados:`);
console.log(`   Archivos validados: ${dirs.reduce((acc, d) => {
  try { return acc + readdirSync(join(join(__dirname, '..', 'n8n-workflows'), d)).filter(f => f.endsWith('.json')).length; }
  catch { return acc; }
}, 0)}`);
console.log(`   Errores: ${errors}`);
console.log(`   Advertencias: ${warnings}`);
console.log(`   Modo: ${STRICT ? 'strict' : 'normal'}`);
console.log();

if (errors > 0) {
  process.exit(1);
}

if (warnings > 0) {
  console.log('⚠️  Warnings encontrados (no bloquean). Revisar manualmente.\n');
}

console.log('✅ Todos los workflows son válidos.\n');
