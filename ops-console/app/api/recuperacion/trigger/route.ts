import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const session = await getSessionFromCookie()
    if (!session?.rol || session.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const n8nUrl = process.env.N8N_URL || 'https://n8n.aicorebots.com'
    const n8nApiKey = process.env.N8N_API_KEY

    if (!n8nApiKey) {
      return NextResponse.json({ error: 'N8N_API_KEY no configurada' }, { status: 500 })
    }

    const res = await fetch(`${n8nUrl}/api/v1/workflows`, {
      headers: { 'X-N8N-API-KEY': n8nApiKey },
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'n8n no responde' }, { status: 502 })
    }

    const workflows = await res.json()
    const wf14 = workflows.data?.find(
      (w: { name: string; id: string }) =>
        w.name?.includes('14') && w.name?.toLowerCase().includes('recuperacion'),
    ) || workflows.data?.find(
      (w: { name: string; id: string }) =>
        w.name?.toLowerCase().includes('recuperacion'),
    )

    if (!wf14) {
      return NextResponse.json({
        error: 'WF-14 no encontrado. ¿Está deployado en n8n?',
        workflowsDisponibles: workflows.data?.map((w: { name: string; id: string }) => w.name),
      }, { status: 404 })
    }

    const execRes = await fetch(`${n8nUrl}/api/v1/workflows/${wf14.id}/execute`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode: 'trigger' }),
    })

    if (!execRes.ok) {
      const errBody = await execRes.text()
      return NextResponse.json({
        error: `Error al ejecutar WF-14: ${errBody}`,
      }, { status: 502 })
    }

    const execData = await execRes.json()

    await getDb().execute(sql`
      INSERT INTO workflow_logs (workflow_id, workflow_name, nivel, mensaje, metadata)
      VALUES (
        'WF-14',
        'Recuperación Automática',
        'info',
        'Recuperación iniciada desde ops.aicorebots.com por ${session.nombre}',
        ${JSON.stringify({ operator: session.email, executionId: execData.executionId })}
      )
    `)

    return NextResponse.json({
      success: true,
      message: 'WF-14 ejecutado. Revisar n8n para progreso.',
      executionId: execData.executionId,
    })
  } catch (e) {
    console.error('[recuperacion] Error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
