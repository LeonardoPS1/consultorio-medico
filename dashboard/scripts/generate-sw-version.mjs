/**
 * Genera public/sw-version.js con un hash único de build.
 * El service worker lo importa vía importScripts() para auto-versionado.
 *
 * Uso: node scripts/generate-sw-version.mjs
 * Se ejecuta automáticamente en postbuild (package.json)
 */
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Generar hash único basado en fecha + contenido de sw.js
const swPath = join(ROOT, 'public', 'sw.js');
let swContent = '';
let hash = '';

if (existsSync(swPath)) {
  swContent = readFileSync(swPath, 'utf-8');
  hash = createHash('md5')
    .update(swContent + Date.now().toString())
    .digest('hex')
    .slice(0, 8);
} else {
  hash = Date.now().toString(36);
}

const version = `v${hash}`;
const versionFile = join(ROOT, 'public', 'sw-version.js');
const content = `// Auto-generado — no modificar manualmente\nvar SW_VERSION = '${version}';\n`;

writeFileSync(versionFile, content, 'utf-8');
console.log(`✅ SW version generated: ${version}`);
