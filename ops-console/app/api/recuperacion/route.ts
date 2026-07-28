import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { execSync } from 'child_process'
import fs from 'fs'

export const dynamic = 'force-dynamic'

const BACKUP_DIR = process.env.BACKUP_DIR || '/var/backups/consultorio'

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!fs.existsSync(BACKUP_DIR)) {
      return NextResponse.json({ backups: [], error: null })
    }

    const pgBackups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.sql.gz.gpg'))
      .sort()
      .reverse()
      .slice(0, 5)

    const volBackups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.tar.gz.gpg'))
      .sort()
      .reverse()
      .slice(0, 10)

    let diskSpace = ''
    try {
      const df = execSync('df -h ' + BACKUP_DIR + ' 2>/dev/null || true').toString()
      diskSpace = df.split('\n').filter(l => l.trim()).slice(-1).join('')
    } catch { /* ignore */ }

    return NextResponse.json({
      backups: {
        postgres: pgBackups.map(f => ({
          filename: f,
          path: `${BACKUP_DIR}/${f}`,
          sizeBytes: fs.statSync(`${BACKUP_DIR}/${f}`).size,
          createdAt: fs.statSync(`${BACKUP_DIR}/${f}`).mtime.toISOString(),
        })),
        volumes: volBackups.map(f => ({
          filename: f,
          path: `${BACKUP_DIR}/${f}`,
          sizeBytes: fs.statSync(`${BACKUP_DIR}/${f}`).size,
          createdAt: fs.statSync(`${BACKUP_DIR}/${f}`).mtime.toISOString(),
        })),
      },
      diskSpace: diskSpace.trim(),
    })
  } catch (e) {
    console.error('[recuperacion] Error listing:', e)
    return NextResponse.json({ error: 'Error al listar backups' }, { status: 500 })
  }
}
