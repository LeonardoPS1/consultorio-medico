import { db } from '@/lib/db';
import { safeWarn, safeError } from '@/lib/logger';
import { workflowLogs, workflowErrors } from '@/drizzle/schema';
import { desc, eq, and, gte, lte, count } from 'drizzle-orm';

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://172.18.0.1:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface N8nExecution {
  id: string;
  workflowId: string;
  workflowName?: string;
  status: 'success' | 'error' | 'waiting';
  startedAt: string;
  stoppedAt?: string;
  mode?: string;
}

interface N8nHealth {
  alive: boolean;
}

async function n8nFetch<T>(path: string): Promise<T | null> {
  try {
    const url = `${N8N_BASE_URL}${path}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (N8N_API_KEY) {
      headers['X-N8N-API-KEY'] = N8N_API_KEY;
    }
    const res = await fetch(url, { headers, next: { revalidate: 30 } });
    if (!res.ok) {
      safeWarn(`[n8n-monitor] ${res.status} on ${path}`);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    safeError(`[n8n-monitor] Error fetching ${path}:`, err instanceof Error ? { message: err.message } : err);
    return null;
  }
}

export async function fetchWorkflows(): Promise<N8nWorkflow[]> {
  const data = await n8nFetch<{ data: N8nWorkflow[] }>('/api/v1/workflows');
  return data?.data ?? [];
}

export async function fetchExecutions(limit = 50, workflowId?: string): Promise<N8nExecution[]> {
  let path = `/api/v1/executions?limit=${Math.min(limit, 100)}`;
  if (workflowId) path += `&workflowId=${workflowId}`;
  const data = await n8nFetch<{ data: N8nExecution[] }>(path);
  return data?.data ?? [];
}

export async function fetchHealth(): Promise<N8nHealth | null> {
  return n8nFetch<N8nHealth>('/healthz');
}

export async function logWorkflowExecution(input: {
  workflowId: string;
  workflowName?: string;
  executionId?: string;
  nivel: string;
  mensaje: string;
  metadata?: Record<string, unknown>;
}) {
  const [result] = await db.insert(workflowLogs).values({
    workflowId: input.workflowId,
    workflowName: input.workflowName,
    executionId: input.executionId,
    nivel: input.nivel,
    mensaje: input.mensaje,
    metadata: input.metadata ?? {},
  }).returning({ id: workflowLogs.id });
  return result;
}

export async function getWorkflowLogs(params: {
  limit?: number;
  offset?: number;
  workflowId?: string;
  nivel?: string;
  desde?: string;
  hasta?: string;
}) {
  const { limit = 50, offset = 0, workflowId, nivel, desde, hasta } = params;
  const conditions = [];
  if (workflowId) conditions.push(eq(workflowLogs.workflowId, workflowId));
  if (nivel) conditions.push(eq(workflowLogs.nivel, nivel));
  if (desde) conditions.push(gte(workflowLogs.createdAt, new Date(desde)));
  if (hasta) conditions.push(lte(workflowLogs.createdAt, new Date(hasta)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db
    .select({ total: count() })
    .from(workflowLogs)
    .where(where);

  const rows = await db
    .select()
    .from(workflowLogs)
    .where(where)
    .orderBy(desc(workflowLogs.createdAt))
    .limit(Math.min(limit, 500))
    .offset(offset);

  return { logs: rows, total: Number(totalResult?.total ?? 0) };
}

export async function getWorkflowErrors(params: {
  limit?: number;
  offset?: number;
  workflowId?: string;
}) {
  const { limit = 50, offset = 0, workflowId } = params;
  const conditions = [];
  if (workflowId) conditions.push(eq(workflowErrors.workflowId, workflowId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db
    .select({ total: count() })
    .from(workflowErrors)
    .where(where);

  const rows = await db
    .select()
    .from(workflowErrors)
    .where(where)
    .orderBy(desc(workflowErrors.createdAt))
    .limit(Math.min(limit, 500))
    .offset(offset);

  return { errors: rows, total: Number(totalResult?.total ?? 0) };
}

export async function getN8nStats() {
  const workflows = await fetchWorkflows();
  const activeCount = workflows.filter((w) => w.active).length;

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [errorsLast24h] = await db
    .select({ total: count() })
    .from(workflowErrors)
    .where(gte(workflowErrors.createdAt, twentyFourHoursAgo));

  const [logsSuccess24h] = await db
    .select({ total: count() })
    .from(workflowLogs)
    .where(
      and(
        gte(workflowLogs.createdAt, twentyFourHoursAgo),
        eq(workflowLogs.nivel, 'info'),
      ),
    );

  return {
    totalWorkflows: workflows.length,
    activeWorkflows: activeCount,
    errorsLast24h: Number(errorsLast24h?.total ?? 0),
    successfulExecutions24h: Number(logsSuccess24h?.total ?? 0),
  };
}
