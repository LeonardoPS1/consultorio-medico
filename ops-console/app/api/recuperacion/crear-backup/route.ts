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
const SSH_SCRIPTS_DIR = process.env.OPS_SCRIPTS_DIR || '/opt/consultorio-medico/scripts'

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

async function readScriptViaSsh(scriptName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const cmd = [...sshBaseCmd(), `"cat ${SSH_SCRIPTS_DIR}/${scriptName}"`].join(' ')
    exec(cmd, { timeout: 30_000 }, (err, stdout) => {
      if (err) reject(new Error(err.message))
      else resolve(stdout)
    })
  })
}

async function runScriptViaSsh(scriptName: string, patches?: Record<string, string>, extraArgs?: string): Promise<{ success: boolean; output: string }> {
  try {
    const content = await readScriptViaSsh(scriptName)
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
        results.tenant = await runScriptViaSsh('backup-tenant.sh', undefined, tenantArg)
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
