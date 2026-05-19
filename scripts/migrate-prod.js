/**
 * Script standalone para ejecutar migraciones en producción.
 * Uso: node scripts/migrate-prod.js
 * 
 * Requiere: puerto 5432 de PostgreSQL expuesto en la VPS.
 * 
 * Configuración vía variables de entorno:
 *   PG_HOST=51.222.207.250
 *   PG_PORT=5432
 *   PG_DATABASE=consultorio_medico
 *   PG_SUPERUSER=postgres
 *   PG_SUPERUSER_PASSWORD=...
 *   PG_APP_USER=dashboard_user
 *   PG_APP_PASSWORD=...
 * 
 * O crear un archivo .env en /scripts/ con esas variables.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Cargar .env si existe
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) {
      process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
}

const REQUIRED_VARS = ['PG_HOST', 'PG_PORT', 'PG_DATABASE', 'PG_SUPERUSER', 'PG_SUPERUSER_PASSWORD', 'PG_APP_USER', 'PG_APP_PASSWORD'];
for (const v of REQUIRED_VARS) {
  if (!process.env[v]) {
    console.error(`❌ Variable de entorno faltante: ${v}`);
    console.error('   Creá scripts/.env con las credenciales o pasalas como env vars.');
    process.exit(1);
  }
}

const PROD_CONFIG = {
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE,
  user: process.env.PG_SUPERUSER,
  password: process.env.PG_SUPERUSER_PASSWORD,
  connectionTimeoutMillis: 10000,
};

const MIGRATIONS_DIR = path.join(__dirname, '..', 'database', 'migrations');

async function main() {
  const admin = new Client(PROD_CONFIG);
  
  console.log('🔌 Conectando a PostgreSQL...');
  await admin.connect();
  console.log('✅ Conectado como superuser\n');

  // Otorgar permisos
  console.log('🔑 Otorgando permisos al usuario de la app...');
  await admin.query(`GRANT ALL ON SCHEMA public TO ${process.env.PG_APP_USER}`);
  await admin.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${process.env.PG_APP_USER}`);
  await admin.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${process.env.PG_APP_USER}`);
  await admin.query(`GRANT CREATE ON SCHEMA public TO ${process.env.PG_APP_USER}`);
  console.log('✅ Permisos otorgados\n');
  await admin.end();

  // Ejecutar migraciones como usuario de la app
  const client = new Client({
    ...PROD_CONFIG,
    user: process.env.PG_APP_USER,
    password: process.env.PG_APP_PASSWORD,
  });
  await client.connect();

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`📁 ${files.length} migraciones encontradas\n`);

  let ok = 0, fail = 0;
  const results = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8').trim();
    if (!content) { results.push(`⏭️ ${file} - vacío`); continue; }

    const statements = content.split(';').map(s => s.trim()).filter(s => s.length > 0);
    let fileOk = true;

    for (const stmt of statements) {
      try {
        await client.query(stmt + ';');
      } catch (err) {
        if (err.message?.includes('already exists') || err.message?.includes('duplicate')) {
          continue; // Idempotente
        }
        if (stmt.toUpperCase().includes('DROP') && err.message?.includes('does not exist')) {
          continue;
        }
        results.push(`❌ ${file}: ${err.message.split('\n')[0]}`);
        fileOk = false;
        fail++;
        break;
      }
    }
    if (fileOk) {
      results.push(`✅ ${file}`);
      ok++;
    }
  }

  // Verificar
  const res = await client.query(
    "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' ORDER BY tablename"
  );
  
  console.log('Resultados:');
  results.forEach(r => console.log(' ', r));
  console.log(`\n📊 ${res.rows.length} tablas creadas (${ok} OK, ${fail} errores):`);
  res.rows.forEach(r => console.log('  -', r.tablename));

  await client.end();
  console.log('\n✅ Done');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
