import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';

export type ServiceStatus = 'up' | 'degraded' | 'down';

export interface ServiceHealth {
  name: string;
  displayName: string;
  status: ServiceStatus;
  latencyMs: number;
  lastCheck: string;
  lastOk: string | null;
  message?: string;
  url?: string;
  critical: boolean;
  category: 'database' | 'cache' | 'queue' | 'ai' | 'communication' | 'realtime';
}

export interface InfraHealthSummary {
  globalStatus: 'healthy' | 'degraded' | 'critical';
  services: ServiceHealth[];
  criticalDown: ServiceHealth[];
  timestamp: string;
}

function getMessage(error: unknown): string {
  if (error instanceof Error) return error.message?.slice(0, 100) || 'unknown error';
  return String(error).slice(0, 100);
}

async function checkService<T>(
  name: string,
  displayName: string,
  checkFn: () => Promise<T>,
  options: {
    critical: boolean;
    category: ServiceHealth['category'];
    url?: string;
    timeoutMs?: number;
    successCondition?: (result: T) => boolean;
  }
): Promise<ServiceHealth> {
  const start = Date.now();
  const lastCheck = new Date().toISOString();
  let lastOk: string | null = null;
  let status: ServiceStatus = 'down';
  let message: string | undefined;
  let latencyMs = 0;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 5000);
    const result = await checkFn();
    clearTimeout(timeout);

    latencyMs = Date.now() - start;
    const isSuccess = options.successCondition ? options.successCondition(result) : true;

    if (isSuccess) {
      status = latencyMs > 1000 ? 'degraded' : 'up';
      lastOk = lastCheck;
    } else {
      status = 'degraded';
      message = 'Unexpected response';
    }
  } catch (e: unknown) {
    latencyMs = Date.now() - start;
    const msg = getMessage(e);
    status = msg.includes('timeout') || msg.includes('aborted') ? 'down' : 'degraded';
    message = msg;
  }

  return {
    name,
    displayName,
    status,
    latencyMs,
    lastCheck,
    lastOk,
    message,
    url: options.url,
    critical: options.critical,
    category: options.category,
  };
}

export async function checkPostgres(): Promise<ServiceHealth> {
  return checkService('postgres', 'PostgreSQL', async () => {
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    return true;
  }, {
    critical: true,
    category: 'database',
    timeoutMs: 3000,
  });
}

export async function checkRedis(): Promise<ServiceHealth> {
  return checkService('redis', 'Redis', async () => {
    const { getRedis } = await import('@/lib/redis');
    const redis = await getRedis();
    if (!redis) throw new Error('Redis no configurado (REDIS_URL ausente)');
    await redis.ping();
    return true;
  }, {
    critical: true,
    category: 'cache',
    timeoutMs: 3000,
    url: 'redis://redis:6379',
  });
}

export async function checkN8n(): Promise<ServiceHealth> {
  return checkService('n8n', 'n8n', async () => {
    const n8nUrl = process.env.N8N_BASE_URL || 'http://172.18.0.1:5678';
    const res = await fetch(`${n8nUrl}/healthz`);
    return res.ok;
  }, {
    critical: true,
    category: 'queue',
    timeoutMs: 3000,
    url: 'https://n8n.aicorebots.com',
  });
}

export async function checkOllama(): Promise<ServiceHealth> {
  return checkService('ollama', 'Ollama', async () => {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://172.18.0.1:11434';
    const res = await fetch(`${ollamaUrl}/api/tags`);
    return res.ok;
  }, {
    critical: false,
    category: 'ai',
    timeoutMs: 5000,
    url: 'http://ollama:11434',
  });
}

export async function checkChatwoot(): Promise<ServiceHealth> {
  return checkService('chatwoot', 'Chatwoot', async () => {
    const chatwootUrl = process.env.CHATWOOT_URL || 'http://chatwoot:3000';
    const res = await fetch(`${chatwootUrl}/api/v1/health`);
    return res.ok;
  }, {
    critical: false,
    category: 'communication',
    timeoutMs: 5000,
    url: 'https://chatwoot.aicorebots.com',
  });
}

export async function checkEvolutionApi(): Promise<ServiceHealth> {
  return checkService('evolution', 'Evolution API', async () => {
    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://evolution:8080';
    const res = await fetch(`${evolutionUrl}/health`);
    return res.ok;
  }, {
    critical: false,
    category: 'communication',
    timeoutMs: 5000,
    url: 'https://evolution.aicorebots.com',
  });
}

export async function checkLiveKit(): Promise<ServiceHealth> {
  return checkService('livekit', 'LiveKit', async () => {
    const livekitUrl = process.env.LIVEKIT_URL || 'http://livekit:7880';
    const res = await fetch(`${livekitUrl}/health`);
    return res.ok;
  }, {
    critical: false,
    category: 'realtime',
    timeoutMs: 5000,
    url: 'https://livekit.aicorebots.com',
  });
}

const CRITICAL_SERVICES = ['postgres', 'redis', 'n8n'] as const;

export function computeGlobalStatus(services: ServiceHealth[]): InfraHealthSummary['globalStatus'] {
  const criticalDown = services.filter(
    s => CRITICAL_SERVICES.includes(s.name as typeof CRITICAL_SERVICES[number]) && s.status === 'down'
  );

  if (criticalDown.length > 0) return 'critical';

  const anyDown = services.some(s => s.status === 'down');
  const anyDegraded = services.some(s => s.status === 'degraded');

  if (anyDown) return 'degraded';
  if (anyDegraded) return 'degraded';
  return 'healthy';
}

export function getMinutesSinceLastOk(lastOk: string | null): number | null {
  if (!lastOk) return null;
  const lastOkTime = new Date(lastOk).getTime();
  const now = Date.now();
  return Math.floor((now - lastOkTime) / 60000);
}

const ALL_CHECKS = [
  checkPostgres,
  checkRedis,
  checkN8n,
  checkOllama,
  checkChatwoot,
  checkEvolutionApi,
  checkLiveKit,
] as const;

export async function runAllHealthChecks(): Promise<InfraHealthSummary> {
  const results = await Promise.allSettled(ALL_CHECKS.map(fn => fn()));

  const services: ServiceHealth[] = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      name: ALL_CHECKS[index].name.replace('check', '').toLowerCase(),
      displayName: ALL_CHECKS[index].name.replace('check', ''),
      status: 'down' as ServiceStatus,
      latencyMs: 0,
      lastCheck: new Date().toISOString(),
      lastOk: null,
      message: getMessage(result.reason),
      critical: CRITICAL_SERVICES.includes(ALL_CHECKS[index].name.replace('check', '').toLowerCase() as typeof CRITICAL_SERVICES[number]),
      category: 'queue' as ServiceHealth['category'],
    };
  });

  return {
    globalStatus: computeGlobalStatus(services),
    services,
    criticalDown: services.filter(s => CRITICAL_SERVICES.includes(s.name as typeof CRITICAL_SERVICES[number]) && s.status === 'down'),
    timestamp: new Date().toISOString(),
  };
}