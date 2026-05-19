const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, 'database', 'migrations');
const PG_PASS = '***REMOVED***';

async function main() {
  // 1. Conectar como postgres y dar permisos
  const admin = new Client({
    host: '51.222.207.250', port: 5432, database: 'consultorio_medico',
    user: 'postgres', password: PG_PASS, connectionTimeoutMillis: 10000
  });
  await admin.connect();
  console.log('✅ Conectado como postgres');

  await admin.query('GRANT ALL ON SCHEMA public TO dashboard_user');
  await admin.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO dashboard_user');
  await admin.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO dashboard_user');
  await admin.query('GRANT CREATE ON SCHEMA public TO dashboard_user');
  console.log('✅ Permisos otorgados a dashboard_user\n');
  await admin.end();

  // 2. Conectar como dashboard_user y ejecutar migraciones
  const client = new Client({
    host: '51.222.207.250', port: 5432, database: 'consultorio_medico',
    user: 'dashboard_user', password: '***REMOVED***', connectionTimeoutMillis: 10000
  });
  await client.connect();

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let ok = 0, fail = 0;
  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf8').trim();
    if (!sql) continue;
    process.stdout.write(`${file}... `);
    try {
      await client.query(sql);
      console.log('✅');
      ok++;
    } catch (err) {
      console.log(`❌ ${err.message.split('\n')[0]}`);
      fail++;
    }
  }

  // 3. Verificar resultado
  const res = await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' ORDER BY tablename");
  console.log(`\n📊 ${res.rows.length} tablas creadas (${ok} OK, ${fail} errores):`);
  for (const r of res.rows) console.log('  -', r.tablename);

  await client.end();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
