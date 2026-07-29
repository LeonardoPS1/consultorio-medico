import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { execSync, exec } from 'child_process'
import fs from 'fs'

export const dynamic = 'force-dynamic'

const BACKUP_DIR = process.env.BACKUP_DIR || '/var/backups/consultorio'
const SCRIPTS_DIR = '/opt/consultorio/scripts'
const SSH_KEY_FILE = '/tmp/ops_ssh_key'

const SSH_HOST = process.env.OPS_SSH_HOST || '51.222.207.250'
const SSH_USER = process.env.OPS_SSH_USER || 'ubuntu'

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
    const normalized = content.replace(/\r\n/g, '\n').trim()
    fs.writeFileSync(SSH_KEY_FILE, normalized + '\n', { mode: 0o600 })
    return fs.existsSync(SSH_KEY_FILE) && fs.readFileSync(SSH_KEY_FILE, 'utf8').length > 50
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

async function runViaSsh(scriptName: string): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const cmd = [
      'ssh',
      '-i', SSH_KEY_FILE,
      '-o StrictHostKeyChecking=no',
      '-o UserKnownHostsFile=/dev/null',
      '-o BatchMode=yes',
      '-o ConnectTimeout=10',
      `${SSH_USER}@${SSH_HOST}`,
      `"bash /opt/consultorio/scripts/${scriptName} ${BACKUP_DIR} 2>&1"`,
    ].join(' ')

    exec(cmd, { timeout: 300_000 }, (err, stdout, stderr) => {
      const output = stdout + (stderr ? `\nSTDERR: ${stderr}` : '')
      if (err) {
        resolve({ success: false, output: output || err.message })
      } else {
        resolve({ success: true, output })
      }
    })
  })
}

async function runViaDocker(scriptFile: string, extraDeps: string): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const cmd = [
      'docker run --rm',
      '-v /var/run/docker.sock:/var/run/docker.sock',
      `-v ${SCRIPTS_DIR}:/scripts:ro`,
      `-v ${BACKUP_DIR}:/backup`,
      'alpine:3.20',
      'sh -c',
      `"apk add --no-cache docker-cli gpg bash ${extraDeps} >/dev/null 2>&1 && bash /scripts/${scriptFile} /backup"`,
    ].join(' ')

    exec(cmd, { timeout: 300_000 }, (err, stdout, stderr) => {
      const output = stdout + (stderr ? `\nSTDERR: ${stderr}` : '')
      if (err) {
        resolve({ success: false, output: output || err.message })
      } else {
        resolve({ success: true, output })
      }
    })
  })
}

async function runDirect(scriptPath: string): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    exec(`bash ${scriptPath} ${BACKUP_DIR} 2>&1`, {
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

export async function POST() {
  try {
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
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

    if (hasSshKey) {
      results.postgres = await runViaSsh('backup-encriptado.sh')
      results.volumes = await runViaSsh('backup-volumenes.sh')
      if (fs.existsSync(`${SCRIPTS_DIR}/backup-infra.sh`)) {
        results.infra = await runViaSsh('backup-infra.sh')
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

    if (Object.keys(results).length === 0) {
      return NextResponse.json({
        error: 'No se ejecutó ningún script de backup. Verifica que los scripts existan.',
      })
    }

    const allOk = Object.values(results).every(r => r.success)

    return NextResponse.json({
      success: allOk,
      message: allOk
        ? 'Backups creados exitosamente'
        : 'Algunos backups fallaron. Revisa los detalles abajo.',
      results,
    })
  } catch (e) {
    console.error('[crear-backup] Error:', e)
    return NextResponse.json({ error: 'Error interno al crear backup' }, { status: 500 })
  }
}
