import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { platformAuditLog } from '@/drizzle/schema'
import { exec, execSync } from 'child_process'
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

async function verifyViaSsh(filename: string): Promise<{ valid: boolean; message: string; size: string }> {
  return new Promise((resolve) => {
    const cmd = [...sshBaseCmd(), `"gpg --batch --quiet --decrypt ${BACKUP_DIR}/${filename} > /dev/null 2>&1 && echo 'OK' || echo 'FAIL'"`].join(' ')
    exec(cmd, { timeout: 60_000 }, (err, stdout) => {
      const ok = !err && stdout.trim() === 'OK'
      resolve({ valid: ok, message: ok ? 'Integridad verificada' : 'Error de integridad', size: '' })
    })
  })
}

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const file = searchParams.get('file')

    if (!file) {
      return NextResponse.json({ error: 'Se requiere ?file=' }, { status: 400 })
    }

    const basename = file.split('/').pop() || file
    const localPath = `${BACKUP_DIR}/${basename}`

    let result: { valid: boolean; message: string; size: string }

    if (fs.existsSync(localPath)) {
      try {
        const size = (fs.statSync(localPath).size / (1024 * 1024)).toFixed(2) + ' MB'
          const out = execSync(`gpg --batch --quiet --decrypt "${localPath}" > /dev/null 2>&1 && echo "OK" || echo "FAIL"`, {
          timeout: 60_000,
          cwd: '/tmp',
        }).toString().trim()
        result = { valid: out === 'OK', message: out === 'OK' ? 'Integridad verificada' : 'Error de integridad', size }
      } catch {
        result = { valid: false, message: 'Error al verificar localmente', size: '' }
      }
    } else if (setupSshKey() && checkSshKey()) {
      result = await verifyViaSsh(basename)
    } else {
      return NextResponse.json({ error: 'Archivo no encontrado ni SSH disponible' }, { status: 404 })
    }

    await getDb().insert(platformAuditLog).values({
      operatorEmail: session.email,
      accion: 'backup.verify',
      recurso: `backup/${basename}`,
      detalles: { valid: result.valid },
      motivo: `Verificación de backup ${basename} por ${session.nombre}`,
    })

    return NextResponse.json(result)
  } catch (e) {
    console.error('[recuperacion] Error verifying backup:', e)
    return NextResponse.json({ error: 'Error al verificar backup' }, { status: 500 })
  }
}
