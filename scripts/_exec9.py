"""Better n8n API probe"""
import paramiko
import json
import base64

HOST = '51.222.207.250'
USER = 'ubuntu'
PASSWORD = 'Cool220479..@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

N8N = 'aicore-n8nrunnerpostgresollama-a715gi-n8n-1'

# More detailed probe
probe_script = '''
const http = require('http');

const urls = [
  'http://127.0.0.1:5678/healthz',
  'http://localhost:5678/healthz',
  'http://0.0.0.0:5678/healthz',
];

urls.forEach(url => {
  const req = http.get(url, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      console.log(url, '-> Status:', res.statusCode, 'Body:', body.substring(0, 100));
    });
  });
  req.on('error', (e) => {
    console.log(url, '-> ERROR:', e.code, e.message);
  });
  req.setTimeout(3000, () => {
    console.log(url, '-> TIMEOUT');
    req.destroy();
  });
});

// Check /etc/hosts
const fs = require('fs');
try {
  const hosts = fs.readFileSync('/etc/hosts', 'utf8');
  console.log('\\n/etc/hosts:');
  console.log(hosts);
} catch(e) {
  console.log('no /etc/hosts:', e.message);
}

// Check network interfaces
const os = require('os');
const ifaces = os.networkInterfaces();
Object.keys(ifaces).forEach(ifname => {
  ifaces[ifname].forEach(iface => {
    if (iface.family === 'IPv4') {
      console.log(`Interface ${ifname}: ${iface.address}`);
    }
  });
});
'''

encoded = base64.b64encode(probe_script.encode()).decode()
cmd = f'echo {encoded} | base64 -d | sudo tee /tmp/probe2.js > /dev/null && sudo docker cp /tmp/probe2.js {N8N}:/tmp/probe2.js && sudo docker exec {N8N} node /tmp/probe2.js 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=20)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
if out: print(out)
if err: print(f'ERR: {err}')

client.close()
