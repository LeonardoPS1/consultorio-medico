/**
 * Cliente Ollama centralizado y robusto.
 * Único punto de comunicación con Ollama en toda la app.
 * Maneja health checks, timeouts, fallback de URLs y logging consistente.
 */

import { safeLog, safeWarn, safeError } from './logger';

// ─── Configuración ─────────────────────────────────────────────

interface OllamaConfig {
  baseUrl: string;
  model: string;
  healthCheckTimeout: number;
  requestTimeout: number;
  globalTimeout: number;
}

function getConfig(): OllamaConfig {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'gemma3';

  return {
    baseUrl,
    model,
    healthCheckTimeout: 8000,
    requestTimeout: 30000,
    globalTimeout: 60000,
  };
}

/**
 * URLs de fallback cuando OLLAMA_BASE_URL no está configurada.
 * Orden: Docker networks (producción Dokploy) → service name → localhost.
 */
const FALLBACK_URLS = [
  'http://172.18.0.1:11434',
  'http://172.17.0.1:11434',
  'http://172.19.0.1:11434',
  'http://host.docker.internal:11434',
  'http://ollama:11434',
  'http://localhost:11434',
];

// ─── Tipos ─────────────────────────────────────────────────────

export interface OllamaChatOptions {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  keepAlive?: string;
}

export interface OllamaChatResult {
  content: string;
  success: boolean;
  error?: string;
  sourceUrl: string;
}

// ─── Health Check (exportado) ──────────────────────────────────

/**
 * Verifica si una URL de Ollama responde (GET /api/tags) con timeout.
 * Exportado para uso por otros módulos que necesiten health check aislado.
 */
export async function ollamaHealthCheck(url: string, timeout = 4000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${url}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Resolver URLs a probar ───────────────────────────────────

function resolveUrls(configuredUrl: string): string[] {
  // Siempre probar la URL configurada PRIMERO, luego fallbacks
  // Esto soluciona cuando OLLAMA_BASE_URL apunta a una IP no alcanzable
  // desde el contenedor del dashboard (ej: 172.18.0.1 vs 172.17.0.1)
  const urls = [configuredUrl];
  for (const fallback of FALLBACK_URLS) {
    if (fallback !== configuredUrl && !urls.includes(fallback)) {
      urls.push(fallback);
    }
  }
  return urls;
}

// ─── Función principal ─────────────────────────────────────────

/**
 * Genera una respuesta usando Ollama.
 *
 * Estrategia:
 * 1. Si OLLAMA_BASE_URL está configurada → usa SOLO esa URL
 * 2. Si no → prueba FALLBACK_URLS en orden (Docker gateway → service → localhost)
 * 3. Cada URL: health check rápido → POST /v1/chat/completions
 * 4. Timeout individual por request + timeout global
 * 5. Si todo falla → success=false con el último error
 */
export async function ollamaChat(options: OllamaChatOptions): Promise<OllamaChatResult> {
  const config = getConfig();
  const { model, healthCheckTimeout, requestTimeout, globalTimeout } = config;

  const urls = resolveUrls(config.baseUrl);
  safeLog(`[Ollama] URLs a probar: [${urls.join(', ')}], modelo: ${model}`);

  // Timeout GLOBAL para todo el proceso
  const globalController = new AbortController();
  const globalTimer = setTimeout(() => globalController.abort(), globalTimeout);

  try {
    let lastError: string | null = null;
    let attemptedAny = false;

    for (const baseUrl of urls) {
      if (globalController.signal.aborted) {
        lastError = 'Timeout global alcanzado';
        break;
      }

      // 1. Health check rápido
      safeLog(`[Ollama] Health check: ${baseUrl}/api/tags`);
      const alive = await ollamaHealthCheck(baseUrl, healthCheckTimeout);
      if (!alive) {
        safeWarn(`[Ollama] Health check falló para ${baseUrl} — saltando`);
        lastError = `Health check falló para ${baseUrl}`;
        continue;
      }

      attemptedAny = true;
      safeLog(`[Ollama] Health check OK en ${baseUrl}, generando...`);

      // 2. Request individual con su propio timeout
      const requestController = new AbortController();
      const requestTimer = setTimeout(() => requestController.abort(), requestTimeout);

      // Combinar signals: global + request individual
      const combinedSignal = AbortSignal.any([globalController.signal, requestController.signal]);

      try {
        const res = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: options.messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 250,
            keep_alive: options.keepAlive ?? '-1m',
          }),
          signal: combinedSignal,
        });

        clearTimeout(requestTimer);

        if (!res.ok) {
          const body = await res.text().catch(() => 'sin body');
          lastError = `Ollama respondió ${res.status} — body: ${body.slice(0, 200)}`;
          safeWarn(`[Ollama] ${lastError}`);
          continue;
        }

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content?.trim();

        if (!content) {
          lastError = 'Respuesta vacía de Ollama';
          safeWarn(`[Ollama] ${lastError}`);
          continue;
        }

        safeLog(`[Ollama] Respuesta OK desde ${baseUrl} (${content.length} chars)`);
        return { content, success: true, sourceUrl: baseUrl };
      } catch (fetchErr) {
        clearTimeout(requestTimer);
        lastError = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        safeWarn(`[Ollama] Error en ${baseUrl}: ${lastError}`);
        continue;
      }
    }

    // Todas las URLs fallaron
    const envInfo = `OLLAMA_BASE_URL=${process.env.OLLAMA_BASE_URL || '(no configurada)'}, OLLAMA_MODEL=${process.env.OLLAMA_MODEL || '(no configurado)'}`;
    const msg = !attemptedAny
      ? `Ninguna URL de Ollama respondió al health check. ${envInfo}. Último: ${lastError}`
      : `Todas las URLs de Ollama fallaron. ${envInfo}. Último error: ${lastError}`;
    safeWarn(`[Ollama] ${msg}`);
    return { content: '', success: false, error: msg, sourceUrl: urls[0] };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    safeError(`[Ollama] Error inesperado: ${err}`);
    return { content: '', success: false, error: err, sourceUrl: urls[0] };
  } finally {
    clearTimeout(globalTimer);
  }
}

// ─── Utilidad para listar modelos ──────────────────────────────

export async function listModels(): Promise<string[]> {
  const config = getConfig();
  try {
    const res = await fetch(`${config.baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.models?.map((m: { name: string }) => m.name) || [];
  } catch {
    return [];
  }
}
