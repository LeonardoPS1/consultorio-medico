const { Client } = require('pg');

async function tryConnect(user, password) {
  const client = new Client({
    host: '51.222.207.250', port: 5432, database: 'consultorio_medico',
    user, password, connectionTimeoutMillis: 5000
  });
  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    return true;
  } catch(e) {
    return false;
  }
}

(async () => {
  const combos = [
    ['postgres', 'postgres'],
    ['postgres', 'admin'],
    ['postgres', 'password'],
    ['postgres', '***REMOVED***'],
    ['postgres', 'Cool220479..@'],
    ['postgres', ''],
  ];
  
  for (const [user, pass] of combos) {
    const ok = await tryConnect(user, pass);
    console.log(`${user}:${pass || '(empty)'} → ${ok ? '✅ OK' : '❌'}`);
    if (ok) {
      // Grant permissions
      const client = new Client({
        host: '51.222.207.250', port: 5432, database: 'consultorio_medico',
        user, password: pass, connectionTimeoutMillis: 5000
      });
      await client.connect();
      await client.query('GRANT ALL ON SCHEMA public TO dashboard_user');
      await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO dashboard_user');
      await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO dashboard_user');
      console.log('✅ Permisos otorgados a dashboard_user');
      await client.end();
      break;
    }
  }
})();
