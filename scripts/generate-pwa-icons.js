/**
 * Genera los íconos PNG para PWA a partir del SVG existente.
 * Requiere: sharp (instalado en el dashboard)
 * Uso: node scripts/generate-pwa-icons.js
 */

const path = require('path');
const fs = require('fs');

const sharp = require(path.join(__dirname, '..', 'dashboard', 'node_modules', 'sharp'));

const SVG_PATH = path.join(__dirname, '..', 'dashboard', 'public', 'icons', 'icon-192x192.svg');
const OUTPUT_DIR = path.join(__dirname, '..', 'dashboard', 'public', 'icons');
const SIZES = [48, 96, 144, 192, 512];

async function generate() {
  console.log('🎯 Generando íconos PWA...\n');

  if (!fs.existsSync(SVG_PATH)) {
    console.error('❌ No se encontró el SVG en:', SVG_PATH);
    process.exit(1);
  }

  const svgBuffer = fs.readFileSync(SVG_PATH);

  for (const size of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      const kb = (fs.statSync(outputPath).size / 1024).toFixed(1);
      console.log(`  ✅ ${size}x${size} → ${kb} KB`);
    } catch (err) {
      console.error(`  ❌ ${size}x${size}: ${err.message}`);
    }
  }

  // También generar favicon.ico como PNG (ICO requiere lib especial, usamos PNG de 48x48)
  const faviconPath = path.join(__dirname, '..', 'dashboard', 'public', 'favicon.png');
  try {
    await sharp(svgBuffer)
      .resize(48, 48)
      .png()
      .toFile(faviconPath);
    console.log(`  ✅ favicon.png (48x48) → generado`);
  } catch (err) {
    console.error(`  ❌ favicon: ${err.message}`);
  }

  console.log('\n✅ Todos los íconos generados en:', OUTPUT_DIR);
}

generate().catch(console.error);
