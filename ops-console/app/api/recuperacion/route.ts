import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { execSync, exec } from 'child_process'
import fs from 'fs'
import { getDb } from '@/lib/db'
import { sql } from 'drizzle-orm'

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

interface BackupFile { filename: string; path: string; sizeBytes: number; createdAt: string }
interface TenantInfo { id: string; nombre: string }

function parseFile(filename: string, fullPath: string): BackupFile {
  const stats = fs.statSync(fullPath)
  return {
    filename,
    path: fullPath,
    sizeBytes: stats.size,
    createdAt: stats.mtime.toISOString(),
  }
}

function parseSshFileLine(line: string): { filename: string; sizeBytes: number; mtime: number } | null {
  const parts = line.trim().split(/\s+/)
  if (parts.length < 2) return null
  const filename = parts[0]
  const sizeBytes = parseInt(parts[1], 10)
  const mtime = parseInt(parts[2], 10)
  return isNaN(sizeBytes) || isNaN(mtime) ? null : { filename, sizeBytes, mtime }
}

async function listFilesViaSsh(pattern: string): Promise<BackupFile[]> {
  try {
    const raw = await sshExec(`ls -1 ${BACKUP_DIR}/${pattern} 2>/dev/null | head -20 || true`)
    const files = raw.split('\n').filter(Boolean)
    if (files.length === 0) return []

    const statsOut = await sshExec(`stat -c '%n %s %Y' ${BACKUP_DIR}/${pattern} 2>/dev/null || true`)
    const statMap = new Map<string, BackupFile>()
    for (const line of statsOut.split('\n').filter(Boolean)) {
      const parsed = parseSshFileLine(line)
      if (parsed) {
        statMap.set(parsed.filename, {
          filename: parsed.filename,
          path: `${BACKUP_DIR}/${parsed.filename}`,
          sizeBytes: parsed.sizeBytes,
          createdAt: new Date(parsed.mtime * 1000).toISOString(),
        })
      }
    }
    return Array.from(statMap.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } catch {
    return []
  }
}

async function listLocalFiles(pattern: string, dir: string): Promise<BackupFile[]> {
  try {
    if (!fs.existsSync(dir)) return []
      return fs.readdirSync(dir)
      .filter(f => {
        if (pattern.endsWith('*.tenant.sql.gz.gpg')) return f.endsWith('.tenant.sql.gz.gpg')
        if (pattern.endsWith('*.sql.gz.gpg')) return f.endsWith('.sql.gz.gpg') && !f.endsWith('.tenant.sql.gz.gpg')
        if (pattern.endsWith('*.tar.gz.gpg')) return f.endsWith('.tar.gz.gpg')
        return f.endsWith('.gpg')
      })
      .sort().reverse()
      .slice(0, 20)
      .map(f => parseFile(f, `${dir}/${f}`))
  } catch {
    return []
  }
}

function guessTenantFromFilename(filename: string): string | null {
  const match = filename.match(/^(.+?)_\d{8}_\d{6}\.tenant\.sql\.gz\.gpg$/)
  return match ? match[1] : null
}

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tenantFilter = searchParams.get('tenantId')

    let postgres: BackupFile[] = []
    let volumes: BackupFile[] = []
    let tenants: BackupFile[] = []
    let diskSpace = ''
    let tenantList: TenantInfo[] = []

    // Load tenant names from DB for the UI
    try {
      const db = getDb()
      const rows = await db.execute(sql`SELECT id, nombre FROM public.tenants ORDER BY nombre`)
      tenantList = rows as unknown as TenantInfo[]
    } catch { /* DB not available */ }

    // Local listing first
    if (fs.existsSync(BACKUP_DIR)) {
      try {
        const df = execSync('df -h ' + BACKUP_DIR + ' 2>/dev/null || true').toString()
        diskSpace = df.split('\n').filter(l => l.trim()).slice(-1).join('')

        postgres = await listLocalFiles('*.sql.gz.gpg', BACKUP_DIR)
        volumes = await listLocalFiles('*.tar.gz.gpg', BACKUP_DIR)
        tenants = await listLocalFiles('*.tenant.sql.gz.gpg', BACKUP_DIR)

        // Filter by tenant if requested
        if (tenantFilter) {
          const slug = tenantFilter.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
          tenants = tenants.filter(t => guessTenantFromFilename(t.filename) === slug)
        }
      } catch { /* local falla */ }
    } else {
      // SSH fallback
      if (setupSshKey() && checkSshKey()) {
        try {
          postgres = await listFilesViaSsh('*.sql.gz.gpg')
          volumes = await listFilesViaSsh('*.tar.gz.gpg')
          const allTenants = await listFilesViaSsh('*.tenant.sql.gz.gpg')
          if (tenantFilter) {
            const slug = tenantFilter.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
            tenants = allTenants.filter(t => guessTenantFromFilename(t.filename) === slug)
          } else {
            tenants = allTenants
          }
        } catch { /* ssh falla */ }
      }
    }

    return NextResponse.json({
      backups: { postgres, volumes, tenants },
      diskSpace: diskSpace.trim(),
      tenantList,
    })
  } catch (e) {
    console.error('[recuperacion] Error listing:', e)
    return NextResponse.json({ error: 'Error al listar backups' }, { status: 500 })
  }
}
