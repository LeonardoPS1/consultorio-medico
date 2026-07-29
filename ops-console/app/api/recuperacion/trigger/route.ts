import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { exec } from 'child_process'
import fs from 'fs'

export const dynamic = 'force-dynamic'

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

function runViaSsh(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const sshCmd = [
      'ssh',
      '-i', SSH_KEY_FILE,
      '-o StrictHostKeyChecking=no',
      '-o UserKnownHostsFile=/dev/null',
      '-o BatchMode=yes',
      '-o ConnectTimeout=10',
      `${SSH_USER}@${SSH_HOST}`,
      `"${cmd.replace(/"/g, '\\"')}"`,
    ].join(' ')
    exec(sshCmd, { timeout: 120_000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message))
      else resolve(stdout)
    })
  })
}

export async function POST() {
  try {
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!setupSshKey()) {
      return NextResponse.json({ error: 'SSH key no disponible' }, { status: 500 })
    }

    const scriptPath = '/opt/consultorio-medico/scripts/recover.sh'
    const cmd = `cd /opt/consultorio-medico && sudo bash ${scriptPath} --force 2>&1`

    const output = await runViaSsh(cmd)

    const success = output.toLowerCase().includes('recuperación completada') ||
      output.toLowerCase().includes('restore complete') ||
      output.toLowerCase().includes('success')

    await getDb().execute(sql`
      INSERT INTO workflow_logs (workflow_id, workflow_name, nivel, mensaje, metadata)
      VALUES (
        'WF-14',
        'Recuperación Automática',
        ${success ? 'info' : 'warning'},
        'Recuperación ${success ? 'completada' : 'iniciada (verificar)'} desde ops.aicorebots.com por ${session.nombre}',
        ${JSON.stringify({ operator: session.email, output: output.slice(0, 2000) })}
      )
    `)

    return NextResponse.json({
      success,
      message: success
        ? 'Recuperación completada exitosamente'
        : 'Recuperación ejecutada. Revisar logs para más detalles.',
      output: output.slice(0, 3000),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    console.error('[recuperacion] Error al ejecutar recuperación:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
