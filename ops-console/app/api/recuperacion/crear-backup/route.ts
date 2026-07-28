import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { execSync, exec } from 'child_process'
import fs from 'fs'

export const dynamic = 'force-dynamic'

const BACKUP_DIR = process.env.BACKUP_DIR || '/var/backups/consultorio'
const SCRIPTS_DIR = '/opt/consultorio/scripts'

async function runScript(name: string, script: string): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    exec(`bash ${script} ${BACKUP_DIR} 2>&1`, {
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

    const scriptsExist = fs.existsSync(SCRIPTS_DIR)
    const dockerExists = (() => {
      try {
        execSync('docker --version', { stdio: 'pipe' })
        return true
      } catch { return false }
    })()

    if (!dockerExists) {
      return NextResponse.json({ error: 'Docker CLI no disponible en este container' }, { status: 500 })
    }

    const results: Record<string, { success: boolean; output: string }> = {}

    if (scriptsExist && fs.existsSync(`${SCRIPTS_DIR}/backup-encriptado.sh`)) {
      results.postgres = await runScript('backup-encriptado', `${SCRIPTS_DIR}/backup-encriptado.sh`)
    }

    if (scriptsExist && fs.existsSync(`${SCRIPTS_DIR}/backup-volumenes.sh`)) {
      results.volumes = await runScript('backup-volumenes', `${SCRIPTS_DIR}/backup-volumenes.sh`)
    }

    if (scriptsExist && fs.existsSync(`${SCRIPTS_DIR}/backup-infra.sh`)) {
      results.infra = await runScript('backup-infra', `${SCRIPTS_DIR}/backup-infra.sh`)
    }

    const allOk = Object.values(results).every(r => r.success)

    return NextResponse.json({
      success: allOk,
      message: allOk
        ? 'Backups creados exitosamente'
        : 'Algunos backups fallaron',
      results,
    })
  } catch (e) {
    console.error('[crear-backup] Error:', e)
    return NextResponse.json({ error: 'Error interno al crear backup' }, { status: 500 })
  }
}
