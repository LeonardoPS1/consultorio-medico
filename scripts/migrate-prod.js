/**
 * Script standalone para ejecutar migraciones en producción.
 * Uso: node scripts/migrate-prod.js
 * 
 * Requiere: puerto 5432 de PostgreSQL expuesto en la VPS.
 * Variables de entorno o editar las credenciales abajo.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const PROD_CONFIG = {
  host: '51.222.207.250',
  port: 5432,
  database: 'consultorio_medico',
  user: 'postgres',
  password: '***REMOVED***',
  connectionTimeoutMillis: 10000,
};

const MIGRATIONS_DIR = path.join(__dirname, '..', 'database', 'migrations');

async function main() {
  const admin = new Client(PROD_CONFIG);
  
  console.log('🔌 Conectando a PostgreSQL...');
  await admin.connect();
  console.log('✅ Conectado como postgres\n');

  // Otorgar permisos
  console.log('🔑 Otorgando permisos a dashboard_user...');
  await admin.query('GRANT ALL ON SCHEMA public TO dashboard_user');
  await admin.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO dashboard_user');
  await admin.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO dashboard_user');
  await admin.query('GRANT CREATE ON SCHEMA public TO dashboard_user');
  console.log('✅ Permisos otorgados\n');
  await admin.end();

  // Ejecutar migraciones como dashboard_user
  const client = new Client({
    ...PROD_CONFIG,
    user: 'dashboard_user',
    password: '***REMOVED***',
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
