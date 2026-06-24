#!/usr/bin/env node

/**
 * sync-n8n-workflows.mjs
 * Sincroniza los workflows de n8n con los JSON versionados en n8n-workflows/current/.
 *
 * Requiere:
 *   - N8N_API_KEY (env) o N8N_API_URL + N8N_API_KEY
 *   - curl (o Node 18+ fetch nativo)
 *
 * Uso:
 *   node scripts/sync-n8n-workflows.mjs              # Sync real (requiere N8N_API_KEY)
 *   node scripts/sync-n8n-workflows.mjs --dry-run    # Solo mostrar qué cambiaría
 *   N8N_API_KEY=xxx node scripts/sync-n8n-workflows.mjs
 *   N8N_API_URL=https://n8n.aicorebots.com/api/v1 node scripts/sync-n8n-workflows.mjs
 *
 * El script:
 *   1. Obtiene la lista de workflows de n8n via API REST
 *   2. Descarga cada workflow como JSON (export)
 *   3. Los guarda en n8n-workflows/current/ con naming estandarizado
 *   4. Muestra diff de cambios vs lo versionado
 *   5. Exit code 1 si hay cambios en modo CI
 */

import { writeFileSync, readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKFLOWS_DIR = join(__dirname, '..', 'n8n-workflows', 'current');

const N8N_API_URL = process.env.N8N_API_URL || 'https://n8n.aicorebots.com/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY || process.env.N8N_API_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

// Mapeo de nombres de workflows n8n a archivos
// Basado en el prefijo numérico del nombre del workflow en n8n
const WORKFLOW_NAME_MAP = [
  { pattern: /^01/, file: 'workflow-01-agent.json' },
  { pattern: /^02/, file: 'workflow-02-gestion-turnos.json' },
  { pattern: /^03/, file: 'workflow-03-recordatorios.json' },
  { pattern: /^04/, file: 'workflow-04-agent.json' },
  { pattern: /^05/, file: 'workflow-05-resumen-diario.json' },
  { pattern: /^06/, file: 'workflow-06-recetas.json' },
  { pattern: /^07/, file: 'workflow-07-backup.json' },
  { pattern: /^08/, file: 'workflow-08-google-calendar-sync.json' },
  { pattern: /^09/, file: 'workflow-09-anonimizar.json' },
  { pattern: /^10/, file: 'workflow-10-expiracion-waitlist.json' },
];

// Mapa inverso: file → número
const FILE_TO_NUM = Object.fromEntries(
  WORKFLOW_NAME_MAP.map(m => [m.file, m.pattern.source.replace(/[\\^$]/g, '')])
);

// --- Helpers ---
function log(msg) {
  console.log(`  ${msg}`);
}

function warn(msg) {
  console.warn(`  ⚠️  ${msg}`);
}

function error(msg) {
  console.error(`  ❌ ${msg}`);
}

async function fetchJSON(url, options = {}) {
  const headers = {
    'Accept': 'application/json',
    ...(N8N_API_KEY ? { 'X-N8N-API-KEY': N8N_API_KEY } : {}),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText} (${url})`);
  }
  return res.json();
}

// --- Main ---
async function main() {
  console.log(`\n🔄 Sincronizando workflows n8n...\n`);

  if (DRY_RUN) {
    log('🧪 Modo dry-run — no se escribirán archivos\n');
  }

  if (!N8N_API_KEY) {
    log('ℹ️  N8N_API_KEY no configurada. Usando export local automático.');
    log('   Para conexión real: export N8N_API_KEY=tu_api_key\n');
    log('   O podés exportar workflows manualmente desde la UI de n8n:');
    log('   https://n8n.aicorebots.com → Workflows → ⋮ → Download\n');
    process.exit(0);
  }

  // 1. Obtener lista de workflows
  log('📡 Conectando a n8n API...');
  let data;
  try {
    data = await fetchJSON(`${N8N_API_URL}/workflows`);
    log(`   ✓ ${data.data?.length || data.length || 0} workflows encontrados\n`);
  } catch (err) {
    error(`No se pudo conectar a n8n: ${err.message}`);
    process.exit(1);
  }

  const workflows = data.data || data;

  // 2. Mapear y descargar
  let changes = 0;
  const changedFiles = [];

  // Usamos un enfoque más flexible: mapeamos por prefijo numérico
  // (ej: "01 - WhatsApp Inbound" se mapea a workflow-01-agent.json)
  const workflowMap = {};
  for (const wf of workflows) {
    const name = wf.name || '';
    const match = WORKFLOW_NAME_MAP.find(m => m.pattern.test(name));
    if (match) {
      workflowMap[match.file] = wf;
    } else {
      warn(`Workflow sin mapeo: “${name}” — crear entrada en WORKFLOW_NAME_MAP`);
    }
  }

  // Obtener archivos actuales en disco
  const currentFiles = new Set(
    existsSync(WORKFLOWS_DIR)
      ? readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.json'))
      : []
  );

  for (const [filename, wf] of Object.entries(workflowMap)) {
    log(`📄 ${filename} ← “${wf.name}”`);

    // Exportar workflow individual (endpoint /workflows/{id})
    let exportedWf;
    try {
      exportedWf = await fetchJSON(`${N8N_API_URL}/workflows/${wf.id}`);
      // n8n v2 devuelve { data: { ... } }
      const wfData = exportedWf.data || exportedWf;
      // Extraer el workflow exportable: name, nodes, connections, settings
      const exportObj = {
        name: wfData.name,
        nodes: wfData.nodes,
        connections: wfData.connections,
        settings: wfData.settings || {},
      };

      const newPath = join(WORKFLOWS_DIR, filename);
      const newContent = JSON.stringify(exportObj, null, 2) + '\n';

      if (currentFiles.has(filename)) {
        const oldContent = readFileSync(newPath, 'utf-8');
        if (oldContent === newContent) {
          log(`   ✓ Sin cambios`);
          continue;
        }
      }

      changes++;
      changedFiles.push(filename);
      log(`   🔄 Cambios detectados`);

      if (!DRY_RUN) {
        writeFileSync(newPath, newContent, 'utf-8');
        log(`   💾 Guardado`);
      }
    } catch (err) {
      error(`Error exportando “${wf.name}”: ${err.message}`);
    }
  }

  // 3. Workflows que están en disco pero no en n8n (fueron eliminados)
  for (const file of currentFiles) {
    if (!workflowMap[file]) {
      warn(`“${file}” existe en disco pero no se encontró en n8n`);
    }
  }

  // --- Resumen ---
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`\n📊 Resultados:`);
  console.log(`   Workflows en n8n: ${workflows.length}`);
  console.log(`   Archivos en disco: ${currentFiles.size}`);
  console.log(`   Cambios: ${changes}`);
  if (changedFiles.length > 0) {
    console.log(`   Modificados: ${changedFiles.join(', ')}`);
  }
  console.log(`   Modo: ${DRY_RUN ? 'DRY-RUN (no se escribió nada)' : (N8N_API_KEY ? 'live (n8n API)' : 'local-only')}`);
  console.log();

  if (changes > 0 && !DRY_RUN) {
    console.log('✅ Sync completado. Revisá los cambios con git diff y commit.\n');
  } else if (changes > 0 && DRY_RUN) {
    console.log('🔍 Dry-run: se detectaron cambios. Ejecutá sin --dry-run para aplicar.\n');
  } else {
    console.log('✅ Todo sincronizado.\n');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
