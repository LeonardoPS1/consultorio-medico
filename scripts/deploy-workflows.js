#!/usr/bin/env node
/**
 * deploy-workflows.js — Deploy de workflows n8n vía API REST
 * 
 * Importa todos los workflows desde n8n-workflows/current/ a una instancia n8n.
 * 
 * Uso:
 *   node scripts/deploy-workflows.js
 * 
 * Variables de entorno necesarias:
 *   N8N_BASE_URL="https://n8n.aicorebots.com" 
 *   N8N_API_KEY="your_n8n_api_key"
 * 
 * Opciones:
 *   --activate   Activa los workflows después de importarlos
 *   --dry-run    Solo muestra lo que haría, sin aplicar cambios
 */

const fs = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────
const N8N_BASE_URL = (process.env.N8N_BASE_URL || 'http://localhost:5678').replace(/\/$/, '');
const N8N_API_KEY = process.env.N8N_API_KEY || '';
const WORKFLOWS_DIR = path.join(__dirname, '..', 'n8n-workflows', 'current');
const ACTIVATE = process.argv.includes('--activate');
const DRY_RUN = process.argv.includes('--dry-run');

if (!N8N_API_KEY) {
  console.error('❌ N8N_API_KEY no configurado. Seteá la variable de entorno.');
  console.error('   Ej: N8N_API_KEY=tu_key node scripts/deploy-workflows.js');
  process.exit(1);
}

const headers = {
  'X-N8N-API-KEY': N8N_API_KEY,
  'Content-Type': 'application/json',
};

// ─── Helpers ──────────────────────────────────────────────────
async function apiRequest(method, endpoint, body = null) {
  const url = `${N8N_BASE_URL}/api/v1/${endpoint}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  if (DRY_RUN) {
    console.log(`  🔍 [DRY RUN] ${method} ${url}`);
    return null;
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }
  return res.json();
}

function escapeN8nExpression(value) {
  // Reemplaza {{ }} por {{ }} (ya están así en el JSON)
  return value;
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 Deploy workflows a n8n\n`);
  console.log(`   N8N URL: ${N8N_BASE_URL}`);
  console.log(`   Origen:  ${WORKFLOWS_DIR}`);
  console.log(`   Activar: ${ACTIVATE ? 'SÍ' : 'NO'}`);
  console.log(`   Dry run: ${DRY_RUN ? 'SÍ' : 'NO'}\n`);

  if (!fs.existsSync(WORKFLOWS_DIR)) {
    console.error(`❌ Directorio no encontrado: ${WORKFLOWS_DIR}`);
    process.exit(1);
  }

  // Verificar conexión
  try {
    await apiRequest('GET', 'workflows');
    console.log('✅ Conectado a n8n\n');
  } catch (e) {
    console.error(`❌ No se pudo conectar a n8n: ${e.message}`);
    process.exit(1);
  }

  const files = fs.readdirSync(WORKFLOWS_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

  console.log(`📁 ${files.length} workflows encontrados\n`);

  let ok = 0, fail = 0, exist = 0;

  for (const file of files) {
    const filePath = path.join(WORKFLOWS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    let workflow;
    try {
      workflow = JSON.parse(content);
    } catch {
      console.log(`❌ ${file} - JSON inválido`);
      fail++;
      continue;
    }

    const workflowName = workflow.name || file;
    console.log(`📦 ${workflowName}`);

    try {
      // Buscar si ya existe un workflow con ese nombre (fetch all and filter locally)
      const allWorkflows = await apiRequest('GET', 'workflows');
      const existing = allWorkflows?.data?.find(w => w.name === workflowName);

      if (existing) {
        const existingId = existing.id;
        console.log(`   ⚠️ Ya existe (id: ${existingId}), actualizando...`);

        // Update workflow - use PUT, include settings (required), exclude tags (read-only)
        await apiRequest('PUT', `workflows/${existingId}`, {
          name: workflowName,
          nodes: workflow.nodes || [],
          connections: workflow.connections || {},
          settings: workflow.settings || {},
        });

        if (ACTIVATE && !existing.active) {
          await apiRequest('POST', `workflows/${existingId}/activate`);
          console.log(`   ▶️ Activado`);
        }
        exist++;
      } else {
        // Create new workflow - exclude tags from body
        const created = await apiRequest('POST', 'workflows', {
          name: workflowName,
          nodes: workflow.nodes || [],
          connections: workflow.connections || {},
          settings: workflow.settings || {},
          // tags are read-only in API
        });

        const newId = created?.id || created?.data?.id || '?';
        console.log(`   ✅ Creado (id: ${newId})`);

        if (ACTIVATE) {
          await apiRequest('POST', `workflows/${newId}/activate`);
          console.log(`   ▶️ Activado`);
        }
        ok++;
      }
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
      fail++;
    }
  }

  console.log(`\n📊 Resultados: ${ok} OK, ${exist} existentes, ${fail} errores`);

  if (!ACTIVATE && !DRY_RUN) {
    console.log('💡 Para activar los workflows, ejecutar con --activate');
  }
  console.log('✅ Done\n');
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
