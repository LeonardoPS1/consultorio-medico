import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { platformAuditLog } from '@/drizzle/schema'
import { execSync, exec } from 'child_process'
import fs from 'fs'

export const dynamic = 'force-dynamic'

const BACKUP_DIR = process.env.BACKUP_DIR || '/var/backups/consultorio'
const SCRIPTS_DIR = '/opt/consultorio/scripts'
const SSH_KEY_FILE = '/tmp/ops_ssh_key'

const SSH_HOST = process.env.OPS_SSH_HOST || '51.222.207.250'
const SSH_USER = process.env.OPS_SSH_USER || 'ubuntu'
const SSH_SCRIPTS_DIR_CANDIDATES = [
  process.env.OPS_SCRIPTS_DIR,
  '/opt/consultorio-medico/scripts',
  '/opt/consultorio/scripts',
].filter(Boolean) as string[]

function pickSshScriptsDir(): Promise<string> {
  return new Promise((resolve, reject) => {
    const cmds = SSH_SCRIPTS_DIR_CANDIDATES.map(dir => ({
      dir,
      cmd: [...sshBaseCmdNoDir(), `"test -f ${dir}/backup-encriptado.sh && echo '${dir}' || true"`].join(' '),
    }))

    let idx = 0
    const tryNext = () => {
      if (idx >= cmds.length) return reject(new Error('No se encontró scripts dir en el VPS'))
      const { dir, cmd } = cmds[idx++]
      exec(cmd, { timeout: 10_000 }, (err, stdout) => {
        if (!err && stdout.trim()) resolve(dir)
        else tryNext()
      })
    }
    tryNext()
  })
}

let _cachedScriptsDir: string | null = null
async function getSshScriptsDir(): Promise<string> {
  if (_cachedScriptsDir) return _cachedScriptsDir
  _cachedScriptsDir = await pickSshScriptsDir()
  return _cachedScriptsDir
}

function checkDockerSocket(): boolean {
  try { execSync('docker info', { stdio: 'pipe', timeout: 5000 }); return true }
  catch { return false }
}

function checkScriptsDir(): boolean {
  try { return fs.existsSync(SCRIPTS_DIR) && fs.existsSync(`${SCRIPTS_DIR}/backup-encriptado.sh`) }
  catch { return false }
}

function writeSshKey(content: string): boolean {
  try {
    const normalized = content.replace(/\r\n/g, '\n').trim() + '\n'
    fs.writeFileSync(SSH_KEY_FILE, normalized, { mode: 0o600 })
    return fs.readFileSync(SSH_KEY_FILE, 'utf8').includes('-----BEGIN')
  } catch { return false }
}

function setupSshKey(): boolean {
  try {
    const keyFromSecret = fs.readFileSync('/run/secrets/ops_ssh_key', 'utf8')
    if (keyFromSecret && writeSshKey(keyFromSecret)) return true
  } catch { /* not a docker secret */ }
  const keyFromEnv = process.env.OPS_SSH_KEY
  if (!keyFromEnv) return false
  if (keyFromEnv.startsWith('-----BEGIN')) {
    if (writeSshKey(keyFromEnv)) return true
  }
  try {
    const decoded = Buffer.from(keyFromEnv, 'base64').toString('utf8')
    if (writeSshKey(decoded)) return true
  } catch { /* not base64 */ }
  return false
}

function checkSshKey(): boolean {
  try {
    const key = fs.readFileSync(SSH_KEY_FILE, 'utf8')
    return key.includes('BEGIN') && key.includes('END')
  } catch { return false }
}

function sshBaseCmd(): string[] {
  return [
    'ssh',
    '-i', SSH_KEY_FILE,
    '-o StrictHostKeyChecking=no',
    '-o UserKnownHostsFile=/dev/null',
    '-o BatchMode=yes',
    '-o ConnectTimeout=10',
    `${SSH_USER}@${SSH_HOST}`,
  ]
}

function sshBaseCmdNoDir(): string[] {
  return sshBaseCmd()
}

function generateTenantBackupScript(tenantId: string): string {
  const esc = (s: string) => s.replace(/'/g, "'\\''")
  const tid = esc(tenantId)
  return [
    '#!/bin/bash',
    'set -euo pipefail',
    'BACKUP_DIR="${1:-/var/backups/consultorio}"',
    'TENANT_ID="${2:' + tid + '}"',
    'GPG_RECIPIENT="${GPG_RECIPIENT:-admin@consultorio.com}"',
    'TIMESTAMP=$(date +%Y%m%d_%H%M%S)',
    'OUTPUT="${BACKUP_DIR}/${TENANT_ID}_${TIMESTAMP}.tenant.sql.gz.gpg"',
    'mkdir -p "$BACKUP_DIR"',
    'PG_CONTAINER=$(docker ps --no-trunc --format "{{.Names}}" 2>/dev/null | grep -E "\\-postgres-1(\\.|$)" | grep -v chatwoot | grep -v evolution | grep -v dokploy | grep -v pgbouncer | head -1)',
    'if [[ -z "$PG_CONTAINER" ]]; then echo "No PG container"; exit 1; fi',
    'echo "Backing up tenant ${TENANT_ID} from container ${PG_CONTAINER}..."',
    'SQL=$(cat <<EOSQL',
    'BEGIN;',
    "\\COPY (SELECT * FROM public.sucursales WHERE tenant_id = '" + tid + "') TO '/tmp/t_suc.csv' CSV HEADER;",
    "\\COPY (SELECT m.* FROM public.medicos m JOIN public.sucursales s ON s.id=m.sucursal_id WHERE s.tenant_id='" + tid + "') TO '/tmp/t_med.csv' CSV HEADER;",
    "\\COPY (SELECT p.* FROM public.pacientes p JOIN public.sucursales s ON s.id=p.sucursal_id WHERE s.tenant_id='" + tid + "') TO '/tmp/t_pac.csv' CSV HEADER;",
    "\\COPY (SELECT t.* FROM public.turnos t JOIN public.sucursales s ON s.id=t.sucursal_id WHERE s.tenant_id='" + tid + "') TO '/tmp/t_tur.csv' CSV HEADER;",
    "\\COPY (SELECT r.* FROM public.recetas r JOIN public.pacientes p ON p.id=r.paciente_id JOIN public.sucursales s ON s.id=p.sucursal_id WHERE s.tenant_id='" + tid + "') TO '/tmp/t_rec.csv' CSV HEADER;",
    "\\COPY (SELECT n.* FROM public.notas_soap n JOIN public.pacientes p ON p.id=n.paciente_id JOIN public.sucursales s ON s.id=p.sucursal_id WHERE s.tenant_id='" + tid + "') TO '/tmp/t_not.csv' CSV HEADER;",
    "\\COPY (SELECT c.* FROM public.conversaciones c JOIN public.pacientes p ON p.id=c.paciente_id JOIN public.sucursales s ON s.id=p.sucursal_id WHERE s.tenant_id='" + tid + "') TO '/tmp/t_con.csv' CSV HEADER;",
    "\\COPY (SELECT f.* FROM public.facturacion f JOIN public.turnos t ON t.id=f.turno_id JOIN public.sucursales s ON s.id=t.sucursal_id WHERE s.tenant_id='" + tid + "') TO '/tmp/t_fac.csv' CSV HEADER;",
    "\\COPY (SELECT * FROM public.usuarios WHERE tenant_id='" + tid + "') TO '/tmp/t_usr.csv' CSV HEADER;",
    "\\COPY (SELECT * FROM public.horarios_atencion WHERE tenant_id='" + tid + "') TO '/tmp/t_hor.csv' CSV HEADER;",
    "\\COPY (SELECT * FROM public.api_keys WHERE tenant_id='" + tid + "') TO '/tmp/t_key.csv' CSV HEADER;",
    "\\COPY (SELECT * FROM public.plantillas_mensajes WHERE tenant_id='" + tid + "') TO '/tmp/t_pla.csv' CSV HEADER;",
    "\\COPY (SELECT * FROM public.derivaciones WHERE tenant_id='" + tid + "') TO '/tmp/t_der.csv' CSV HEADER;",
    "\\COPY (SELECT * FROM public.webhook_configs WHERE tenant_id='" + tid + "') TO '/tmp/t_wbh.csv' CSV HEADER;",
    "\\COPY (SELECT * FROM public.ordenes_estudio WHERE tenant_id='" + tid + "') TO '/tmp/t_ord.csv' CSV HEADER;",
    "\\COPY (SELECT * FROM public.documentos_medicos WHERE tenant_id='" + tid + "') TO '/tmp/t_doc.csv' CSV HEADER;",
    "\\COPY (SELECT * FROM public.consentimientos WHERE tenant_id='" + tid + "') TO '/tmp/t_cto.csv' CSV HEADER;",
    "\\COPY (SELECT * FROM public.blacklist WHERE tenant_id='" + tid + "') TO '/tmp/t_blk.csv' CSV HEADER;",
    "\\COPY (SELECT * FROM public.notificaciones WHERE tenant_id='" + tid + "') TO '/tmp/t_noti.csv' CSV HEADER;",
    'COMMIT;',
    'EOSQL',
    ')',
    'echo "$SQL" | PGPASSWORD="${PG_SUPERPASS:-7anlnf0odssgmuwyjchqzdpk}" docker exec -i "$PG_CONTAINER" psql -U "${PG_SUPERUSER:-reece.schmeler67}" -d consultorio_medico -v ON_ERROR_STOP=1 2>&1',
    'tar czf - /tmp/t_*.csv 2>/dev/null | gpg --batch --yes --trust-model always --recipient "$GPG_RECIPIENT" --output "$OUTPUT" --encrypt',
    'rm -f /tmp/t_*.csv',
    'gpg --batch --quiet --decrypt "$OUTPUT" > /dev/null 2>&1 && echo "OK: $OUTPUT ($(du -h "$OUTPUT" | cut -f1))" || echo "FAIL"',
  ].join('\n')
}

async function readScript(scriptName: string, tenantId?: string): Promise<string> {
  if (scriptName === 'backup-tenant.sh' && tenantId) {
    return generateTenantBackupScript(tenantId)
  }
  const localPath = `${SCRIPTS_DIR}/${scriptName}`
  if (fs.existsSync(localPath)) {
    return fs.readFileSync(localPath, 'utf8')
  }
  const dir = await getSshScriptsDir()
  return new Promise((resolve, reject) => {
    const cmd = [...sshBaseCmd(), `"cat ${dir}/${scriptName}"`].join(' ')
    exec(cmd, { timeout: 30_000 }, (err, stdout) => {
      if (err) reject(new Error(err.message))
      else resolve(stdout)
    })
  })
}

async function runScriptViaSsh(scriptName: string, patches?: Record<string, string>, extraArgs?: string, tenantId?: string): Promise<{ success: boolean; output: string }> {
  try {
    const content = await readScript(scriptName, tenantId)
    let patched = content
    if (patches) {
      for (const [from, to] of Object.entries(patches)) {
        patched = patched.replaceAll(from, to)
      }
    }
    const b64 = Buffer.from(patched, 'utf8').toString('base64')

    return new Promise((resolve) => {
      const args = `${BACKUP_DIR} ${extraArgs || ''}`.trim()
      const cmd = [
        ...sshBaseCmd(),
        `"echo ${b64} | base64 -d | bash -s -- ${args} 2>&1"`,
      ].join(' ')

      exec(cmd, { timeout: 600_000 }, (err, stdout, stderr) => {
        const output = stdout + (stderr ? `\nSTDERR: ${stderr}` : '')
        if (err) {
          resolve({ success: false, output: output || err.message })
        } else {
          resolve({ success: true, output })
        }
      })
    })
  } catch (e) {
    return { success: false, output: `Error al leer script: ${e instanceof Error ? e.message : e}` }
  }
}

async function runViaDocker(scriptFile: string, extraDeps: string, extraArgs?: string): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const args = `/backup ${extraArgs || ''}`.trim()
    const cmd = [
      'docker run --rm',
      '-v /var/run/docker.sock:/var/run/docker.sock',
      `-v ${SCRIPTS_DIR}:/scripts:ro`,
      `-v ${BACKUP_DIR}:/backup`,
      'alpine:3.20',
      'sh -c',
      `"apk add --no-cache docker-cli gpg bash ${extraDeps} >/dev/null 2>&1 && bash /scripts/${scriptFile} ${args}"`,
    ].join(' ')

    exec(cmd, { timeout: 600_000 }, (err, stdout, stderr) => {
      const output = stdout + (stderr ? `\nSTDERR: ${stderr}` : '')
      if (err) {
        resolve({ success: false, output: output || err.message })
      } else {
        resolve({ success: true, output })
      }
    })
  })
}

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const tenantId = body.tenantId as string | undefined
    const isTenant = !!tenantId && isUUID(tenantId)

    // Validate tenant exists if provided
    if (isTenant) {
      try {
        const db = getDb()
        const { sql } = await import('drizzle-orm')
        const result = await db.execute(sql`SELECT 1 FROM public.tenants WHERE id = ${tenantId}`)
        if ((result as any[]).length === 0) {
          return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 })
        }
      } catch (e) {
        return NextResponse.json({ error: 'Error validando tenant' }, { status: 500 })
      }
    }

    const hasDockerSocket = checkDockerSocket()
    const hasScripts = checkScriptsDir()
    const hasSshKey = setupSshKey() && checkSshKey()

    if (!hasDockerSocket && !hasScripts && !hasSshKey) {
      return NextResponse.json({
        error: 'No hay método disponible para crear backups. ' +
          'Configurá una clave SSH (OPS_SSH_KEY / secret ops_ssh_key) ' +
          'o montá los volúmenes docker.sock y scripts en el contenedor ops-console.',
      }, { status: 500 })
    }

    const results: Record<string, { success: boolean; output: string }> = {}

    if (isTenant) {
      // Per-tenant backup
      const tenantArg = `"${tenantId}"`

      if (hasSshKey) {
        results.tenant = await runScriptViaSsh('backup-tenant.sh', undefined, tenantArg, tenantId)
      } else if (hasDockerSocket) {
        results.tenant = await runViaDocker('backup-tenant.sh', 'postgresql-client', tenantArg)
      } else {
        results.tenant = await runDirect(`${SCRIPTS_DIR}/backup-tenant.sh`, tenantArg)
      }
    } else {
      // Full PG backup (existing behavior)
      if (hasSshKey) {
        results.postgres = await runScriptViaSsh('backup-encriptado.sh', {
          'docker ps --format': 'docker ps --no-trunc --format',
        })
        results.volumes = await runScriptViaSsh('backup-volumenes.sh', {
          '"_${SUFFIX}$"': '"(^|_)${SUFFIX}$"',
        })
        if (fs.existsSync(`${SCRIPTS_DIR}/backup-infra.sh`)) {
          results.infra = await runScriptViaSsh('backup-infra.sh')
        }
      } else if (hasDockerSocket) {
        results.postgres = await runViaDocker('backup-encriptado.sh', 'postgresql-client')
        results.volumes = await runViaDocker('backup-volumenes.sh', '')
        if (hasScripts && fs.existsSync(`${SCRIPTS_DIR}/backup-infra.sh`)) {
          results.infra = await runViaDocker('backup-infra.sh', '')
        }
      } else {
        results.postgres = await runDirect(`${SCRIPTS_DIR}/backup-encriptado.sh`)
        results.volumes = await runDirect(`${SCRIPTS_DIR}/backup-volumenes.sh`)
        if (fs.existsSync(`${SCRIPTS_DIR}/backup-infra.sh`)) {
          results.infra = await runDirect(`${SCRIPTS_DIR}/backup-infra.sh`)
        }
      }
    }

    if (Object.keys(results).length === 0) {
      return NextResponse.json({
        error: 'No se ejecutó ningún script de backup.',
      })
    }

    const allOk = Object.values(results).every(r => r.success)

    // Audit
    await getDb().insert(platformAuditLog).values({
      operatorEmail: session.email,
      accion: 'backup.create',
      recurso: isTenant ? `tenant/${tenantId}` : 'sistema',
      detalles: { tenantId, results: Object.keys(results) },
      motivo: `Backup ${isTenant ? 'per-tenant' : 'completo'} por ${session.nombre}`,
    })

    return NextResponse.json({
      success: allOk,
      message: allOk
        ? (isTenant ? 'Backup del tenant creado exitosamente' : 'Backups creados exitosamente')
        : 'Algunos backups fallaron. Revisa los detalles abajo.',
      results,
    })
  } catch (e) {
    console.error('[crear-backup] Error:', e)
    return NextResponse.json({ error: 'Error interno al crear backup' }, { status: 500 })
  }
}

async function runDirect(scriptPath: string, ...extraArgs: string[]): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const args = [BACKUP_DIR, ...extraArgs].join(' ')
    exec(`bash ${scriptPath} ${args} 2>&1`, {
      timeout: 300_000,
      env: { ...process.env, BACKUP_DIR },
    }, (err, stdout, stderr) => {
      const output = stdout + (stderr ? `\nSTDERR: ${stderr}` : '')
      if (err) {
        resolve({ success: false, output: output || err.message })
      } else {
        resolve({ success: true, output })
      }
    })
  })
}
