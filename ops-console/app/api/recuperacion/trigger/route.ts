import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { platformAuditLog } from '@/drizzle/schema'
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

async function runViaSsh(cmd: string): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve) => {
    const fullCmd = [...sshBaseCmd(), `"${cmd.replace(/"/g, '\\"')}"`].join(' ')
    exec(fullCmd, { timeout: 120_000 }, (err, stdout, stderr) => {
      resolve({
        stdout,
        stderr,
        exitCode: err?.code ?? 0,
      })
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

    const repos = ['/opt/consultorio-medico', '/opt/consultorio']
    let repoPath = ''

    for (const r of repos) {
      const { stdout } = await runViaSsh(`test -d ${r} && echo "EXISTE" || true`)
      if (stdout.trim() === 'EXISTE') {
        repoPath = r
        break
      }
    }

    if (!repoPath) {
      return NextResponse.json({
        error: `No se encontró el repo en ninguna ruta conocida. Caminos probados: ${repos.join(', ')}`,
      }, { status: 500 })
    }

    const cmd = `cd ${repoPath} && sudo -n bash scripts/recover.sh --force 2>&1`
    const result = await runViaSsh(cmd)

    const fullOutput = result.stdout + (result.stderr ? `\nSTDERR: ${result.stderr}` : '')
    const isOk = result.exitCode === 0
    const mensaje = `Recuperación ${isOk ? 'completada' : 'falló'} desde ops.aicorebots.com por ${session.nombre}`

    await getDb().insert(platformAuditLog).values({
      operatorEmail: session.email,
      accion: 'recuperacion',
      recurso: 'sistema',
      detalles: { exitCode: result.exitCode, output: fullOutput.slice(0, 1000) },
      motivo: mensaje,
    })

    return NextResponse.json({
      success: isOk,
      message: isOk
        ? 'Recuperación completada exitosamente'
        : `Recuperación falló (exit code ${result.exitCode}). Revisar logs.`,
      output: fullOutput.slice(0, 3000),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    console.error('[recuperacion] Error al ejecutar recuperación:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
