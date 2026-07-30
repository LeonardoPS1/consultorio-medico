import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { platformAuditLog } from '@/drizzle/schema'
import { exec } from 'child_process'
import fs from 'fs'

export const dynamic = 'force-dynamic'

const BACKUP_DIR = process.env.BACKUP_DIR || '/var/backups/consultorio'
const SSH_KEY_FILE = '/tmp/ops_ssh_key'
const SSH_HOST = process.env.OPS_SSH_HOST || '51.222.207.250'
const SSH_USER = process.env.OPS_SSH_USER || 'ubuntu'

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

async function deleteViaSsh(filename: string): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const rmCmd = `rm -f ${BACKUP_DIR}/${filename} 2>&1 && echo "ELIMINADO" || echo "ERROR"`
    const rcloneCmd = `if [ -n "$RCLONE_REMOTE" ]; then rclone delete "$RCLONE_REMOTE/${filename}" 2>/dev/null || true; fi`

    const full = `cd /opt/consultorio && bash scripts/delete-backup.sh --force ${BACKUP_DIR}/${filename} 2>&1 || ${rmCmd}`
    const cmd = [...sshBaseCmd(), `"${full}"`].join(' ')

    exec(cmd, { timeout: 30_000 }, (err, stdout, stderr) => {
      const output = stdout + (stderr ? `\nSTDERR: ${stderr}` : '')
      resolve({
        success: !err || stdout.includes('ELIMINADO'),
        output: output.slice(0, 1000),
      })
    })
  })
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { backupFile } = body as { backupFile: string }
    const force = body.force === true

    if (!backupFile) {
      return NextResponse.json({ error: 'Se requiere backupFile' }, { status: 400 })
    }

    const basename = backupFile.split('/').pop() || backupFile
    let result: { success: boolean; output: string }

    // Try local first
    const localPath = `${BACKUP_DIR}/${basename}`
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath)
      result = { success: true, output: `✅ ${basename} eliminado localmente` }
    } else if (setupSshKey() && checkSshKey()) {
      result = await deleteViaSsh(basename)
    } else {
      return NextResponse.json({
        error: 'No se pudo eliminar: archivo no encontrado localmente ni SSH disponible',
      }, { status: 500 })
    }

    await getDb().insert(platformAuditLog).values({
      operatorEmail: session.email,
      accion: 'backup.delete',
      recurso: `backup/${basename}`,
      detalles: { force, backupFile: basename },
      motivo: `Eliminación de backup ${basename} por ${session.nombre}`,
    })

    return NextResponse.json(result)
  } catch (e) {
    console.error('[recuperacion] Error deleting backup:', e)
    return NextResponse.json({ error: 'Error al eliminar backup' }, { status: 500 })
  }
}
