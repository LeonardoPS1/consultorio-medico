import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { execSync, exec } from 'child_process'
import fs from 'fs'

export const dynamic = 'force-dynamic'

const BACKUP_DIR = process.env.BACKUP_DIR || '/var/backups/consultorio'
const SCRIPTS_DIR = '/opt/consultorio/scripts'

function checkDockerSocket(): boolean {
  try {
    execSync('docker info', { stdio: 'pipe', timeout: 5000 })
    return true
  } catch {
    return false
  }
}

function checkScriptsDir(): boolean {
  try {
    return fs.existsSync(SCRIPTS_DIR) && fs.existsSync(`${SCRIPTS_DIR}/backup-encriptado.sh`)
  } catch {
    return false
  }
}

async function runScriptInDocker(
  scriptFile: string,
  extraDeps: string,
): Promise<{ success: boolean; output: string }> {
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

async function runScriptDirect(scriptPath: string): Promise<{ success: boolean; output: string }> {
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

    if (!hasDockerSocket && !hasScripts) {
      return NextResponse.json({
        error: 'No es posible crear backups: Docker socket no disponible y scripts no encontrados. ' +
          'Verifica que el contenedor ops-console tenga acceso a /var/run/docker.sock y /opt/consultorio/scripts.',
      }, { status: 500 })
    }

    const results: Record<string, { success: boolean; output: string }> = {}

    if (hasDockerSocket) {
      results.postgres = await runScriptInDocker('backup-encriptado.sh', 'postgresql-client')
      results.volumes = await runScriptInDocker('backup-volumenes.sh', '')
      if (hasScripts && fs.existsSync(`${SCRIPTS_DIR}/backup-infra.sh`)) {
        results.infra = await runScriptInDocker('backup-infra.sh', '')
      }
    } else {
      results.postgres = await runScriptDirect(`${SCRIPTS_DIR}/backup-encriptado.sh`)
      results.volumes = await runScriptDirect(`${SCRIPTS_DIR}/backup-volumenes.sh`)
      if (fs.existsSync(`${SCRIPTS_DIR}/backup-infra.sh`)) {
        results.infra = await runScriptDirect(`${SCRIPTS_DIR}/backup-infra.sh`)
      }
    }

    if (Object.keys(results).length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No se ejecutó ningún script de backup. Verifica que los scripts existan en /opt/consultorio/scripts.',
        results: {},
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
