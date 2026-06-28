/**
 * Cliente Ollama robusto.
 *
 * Estrategia:
 * 1. Con OLLAMA_BASE_URL configurada:
 *    - Health check rápido (GET /api/tags, 3s timeout) para verificar conectividad
 *    - Si responde: POST con timeout generoso (25s) para permitir cold start del modelo
 *    - Si falla: prueba fallbacks en paralelo
 * 2. Sin config: Promise.race entre todas las URLs
 * 3. keep_alive permanente (-1m) para mantener el modelo en RAM entre requests
 * 4. Timeout global 60s
 */

import { safeLog, safeWarn, safeError } from './logger';

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

// ─── URLs disponibles ─────────────────────────────────────────

const ALL_URLS = [
  'http://host.docker.internal:11434',
  'http://172.18.0.1:11434',
  'http://172.17.0.1:11434',
  'http://172.19.0.1:11434',
  'http://ollama:11434',
  'http://localhost:11434',
];

function getUrls(): string[] {
  const configured = process.env.OLLAMA_BASE_URL;
  if (!configured) return ALL_URLS;

  // Configurada primera, luego fallbacks sin duplicar
  const urls = [configured];
  for (const fb of ALL_URLS) {
    if (fb !== configured && !urls.includes(fb)) urls.push(fb);
  }
  return urls;
}

// ─── Health check rápido (GET /api/tags) ─────────────────────

async function healthCheck(baseUrl: string, signal: AbortSignal): Promise<boolean> {
  try {
    const hcController = new AbortController();
    const hcTimer = setTimeout(() => hcController.abort(), 3000);
    const combined = AbortSignal.any([signal, hcController.signal]);

    const res = await fetch(`${baseUrl}/api/tags`, { signal: combined });
    clearTimeout(hcTimer);
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Función principal ────────────────────────────────────────

export async function ollamaChat(options: OllamaChatOptions): Promise<OllamaChatResult> {
  const model = process.env.OLLAMA_MODEL || 'gemma3';
  const configured = process.env.OLLAMA_BASE_URL;
  const urls = getUrls();

  safeLog(`[Ollama] ${urls.length} URLs, modelo: ${model}, config: ${configured || '(no config)'}`);

  const globalTimeout = 60_000;
  const globalController = new AbortController();
  const globalTimer = setTimeout(() => globalController.abort(), globalTimeout);

  let lastError = '';

  try {
    if (configured) {
      // ─── Con config: health check rápido → POST generoso ──
      // Health check 3s para ver si la URL responde
      const alive = await healthCheck(configured, globalController.signal);
      if (alive) {
        // POST con timeout generoso (25s para cold start del modelo)
        const result = await tryUrl(configured, model, options, 25_000, globalController.signal);
        if (result) return result;
        lastError = `POST falló pese a health check OK en ${configured}`;
      } else {
        lastError = `Health check falló en ${configured}`;
        safeWarn(`[Ollama] Health check falló en ${configured}, probando fallbacks...`);
      }

      // Fallbacks en paralelo
      const fallbacks = urls.slice(1);
      if (fallbacks.length > 0) {
        const result = await tryUrlsInParallel(fallbacks, model, options, 10_000, globalController);
        if (result) return result;
      }
      lastError = 'Todas las URLs fallaron';
    } else {
      // ─── Sin config: Promise.race ───────────────────────────
      const result = await tryUrlsInParallel(urls, model, options, 10_000, globalController);
      if (result) return result;
      lastError = 'Todas las URLs fallaron';
    }

    const env = `OLLAMA_BASE_URL=${configured || '(no config)'}, OLLAMA_MODEL=${model}`;
    const msg = `Ollama no disponible. ${env}. Último error: ${lastError}`;
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

// ─── Helpers ──────────────────────────────────────────────────

async function tryUrlsInParallel(
  urls: string[],
  model: string,
  options: OllamaChatOptions,
  timeoutMs: number,
  globalController: AbortController,
): Promise<OllamaChatResult | null> {
  const attempts = urls.map((baseUrl) =>
    tryUrl(baseUrl, model, options, timeoutMs, globalController.signal),
  );

  // Promise.race para obtener la más rápida
  const result = await Promise.race(attempts);
  if (result) return result;

  // Si todas fallaron, esperar que terminen
  await Promise.allSettled(attempts);
  return null;
}

async function tryUrl(
  baseUrl: string,
  model: string,
  options: OllamaChatOptions,
  timeoutMs: number,
  globalSignal: AbortSignal,
): Promise<OllamaChatResult | null> {
  try {
    const requestController = new AbortController();
    const requestTimer = setTimeout(() => requestController.abort(), timeoutMs);
    const combined = AbortSignal.any([globalSignal, requestController.signal]);

    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 400,
        keep_alive: options.keepAlive ?? '-1m',
      }),
      signal: combined,
    });

    clearTimeout(requestTimer);

    if (!res.ok) {
      const body = await res.text().catch(() => 'sin body');
      safeWarn(`[Ollama] ${baseUrl} → HTTP ${res.status}: ${body.slice(0, 100)}`);
      return null;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();

    if (content) {
      safeLog(`[Ollama] OK desde ${baseUrl} (${content.length} chars)`);
      return { content, success: true, sourceUrl: baseUrl };
    }

    safeWarn(`[Ollama] ${baseUrl} → respuesta vacía`);
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    safeWarn(`[Ollama] ${baseUrl} → ${msg}`);
    return null;
  }
}

// ─── Utilidad: listar modelos ─────────────────────────────────

export async function listModels(): Promise<string[]> {
  const urls = getUrls();
  const results = await Promise.allSettled(
    urls.map(async (baseUrl) => {
      try {
        const res = await fetch(`${baseUrl}/api/tags`, {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          return data.models?.map((m: { name: string }) => m.name) || [];
        }
      } catch {
        // ignore
      }
      return [];
    }),
  );

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.length > 0) return r.value;
  }
  return [];
}
