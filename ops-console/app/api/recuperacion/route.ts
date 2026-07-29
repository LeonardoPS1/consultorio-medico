import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { execSync, exec } from 'child_process'
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

function sshExec(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const sshCmd = [
      'ssh',
      '-i', SSH_KEY_FILE,
      '-o StrictHostKeyChecking=no',
      '-o UserKnownHostsFile=/dev/null',
      '-o BatchMode=yes',
      '-o ConnectTimeout=10',
      `${SSH_USER}@${SSH_HOST}`,
      `"${cmd}"`,
    ].join(' ')
    exec(sshCmd, { timeout: 15_000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message))
      else resolve(stdout)
    })
  })
}

async function listBackupsViaSsh(): Promise<{ postgres: { filename: string; sizeBytes: number; createdAt: string }[]; volumes: { filename: string; sizeBytes: number; createdAt: string }[] }> {
  const lsCmd = `ls -1 ${BACKUP_DIR}/ 2>/dev/null || true`
  const files = (await sshExec(lsCmd)).split('\n').filter(Boolean)

  const parseFile = (f: string) => {
    const statCmd = `stat -c '%s %Y' "${BACKUP_DIR}/${f}" 2>/dev/null || echo "0 0"`
    return sshExec(statCmd).then(out => {
      const [size, mtime] = out.trim().split(' ')
      return {
        filename: f,
        sizeBytes: parseInt(size || '0', 10),
        createdAt: new Date(parseInt(mtime || '0', 10) * 1000).toISOString(),
      }
    })
  }

  const pgFiles = files.filter(f => f.endsWith('.sql.gz.gpg')).sort().reverse().slice(0, 5)
  const volFiles = files.filter(f => f.endsWith('.tar.gz.gpg')).sort().reverse().slice(0, 10)

  const [postgres, volumes] = await Promise.all([
    Promise.all(pgFiles.map(parseFile)),
    Promise.all(volFiles.map(parseFile)),
  ])

  return { postgres, volumes }
}

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let diskSpace = ''

    // Intento local primero
    if (fs.existsSync(BACKUP_DIR)) {
      try {
        const pgBackups = fs.readdirSync(BACKUP_DIR)
          .filter(f => f.endsWith('.sql.gz.gpg')).sort().reverse().slice(0, 5)
        const volBackups = fs.readdirSync(BACKUP_DIR)
          .filter(f => f.endsWith('.tar.gz.gpg')).sort().reverse().slice(0, 10)

        const df = execSync('df -h ' + BACKUP_DIR + ' 2>/dev/null || true').toString()
        diskSpace = df.split('\n').filter(l => l.trim()).slice(-1).join('')

        return NextResponse.json({
          backups: {
            postgres: pgBackups.map(f => ({
              filename: f, path: `${BACKUP_DIR}/${f}`,
              sizeBytes: fs.statSync(`${BACKUP_DIR}/${f}`).size,
              createdAt: fs.statSync(`${BACKUP_DIR}/${f}`).mtime.toISOString(),
            })),
            volumes: volBackups.map(f => ({
              filename: f, path: `${BACKUP_DIR}/${f}`,
              sizeBytes: fs.statSync(`${BACKUP_DIR}/${f}`).size,
              createdAt: fs.statSync(`${BACKUP_DIR}/${f}`).mtime.toISOString(),
            })),
          },
          diskSpace: diskSpace.trim(),
        })
      } catch { /* local falla, intentar SSH */ }
    }

    // Fallback: SSH al VPS
    if (setupSshKey() && checkSshKey()) {
      try {
        const backups = await listBackupsViaSsh()
        return NextResponse.json({ backups, diskSpace })
      } catch { /* ssh falla */ }
    }

    return NextResponse.json({ backups: { postgres: [], volumes: [] }, diskSpace: '' })
  } catch (e) {
    console.error('[recuperacion] Error listing:', e)
    return NextResponse.json({ error: 'Error al listar backups' }, { status: 500 })
  }
}
