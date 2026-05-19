const { Client } = require('pg');
const client = new Client({
  host: '51.222.207.250', port: 5432, database: 'consultorio_medico',
  user: 'dashboard_user', password: '***REMOVED***', connectionTimeoutMillis: 10000
});
(async () => {
  try {
    await client.connect();
    console.log('Conectado OK');
    const res = await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' ORDER BY tablename");
    console.log('Tablas:', res.rows.map(r => r.tablename).join(', ') || 'NINGUNA');
    await client.end();
  } catch(e) { 
    console.log('Error:', e.message); 
  }
})();
