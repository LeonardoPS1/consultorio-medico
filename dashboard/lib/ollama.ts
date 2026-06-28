/**
 * Cliente Ollama optimizado para velocidad.
 *
 * Estrategia:
 * 1. Si OLLAMA_BASE_URL está configurada, prueba SOLO esa URL primero
 *    con timeout agresivo (10s). Si falla, prueba fallbacks.
 * 2. Sin config, prueba todas las URLs posibles en paralelo (Promise.race)
 *    para obtener la respuesta más rápida.
 * 3. keep_alive permanente (-1m) para mantener el modelo en RAM.
 * 4. Timeout global reducido a 45s (vs 120s anterior).
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

  // Configurada primero, luego fallbacks distintas
  const urls = [configured];
  for (const fb of ALL_URLS) {
    if (fb !== configured && !urls.includes(fb)) urls.push(fb);
  }
  return urls;
}

// ─── Función principal ────────────────────────────────────────

/**
 * Llama a Ollama para generar una respuesta.
 *
 * Con OLLAMA_BASE_URL configurada: prueba secuencial (config → fallbacks)
 * Sin config: Promise.race entre TODAS las URLs (más rápido en desarrollo)
 */
export async function ollamaChat(options: OllamaChatOptions): Promise<OllamaChatResult> {
  const model = process.env.OLLAMA_MODEL || 'gemma3';
  const configured = process.env.OLLAMA_BASE_URL;
  const urls = getUrls();

  safeLog(`[Ollama] ${urls.length} URLs, modelo: ${model}, config: ${configured || '(no)'}`);

  const timeoutPorUrl = configured ? 10_000 : 8_000;
  const globalTimeout = 45_000;

  const globalController = new AbortController();
  const globalTimer = setTimeout(() => globalController.abort(), globalTimeout);

  let lastError = '';

  try {
    // ─── Con URL configurada: secuencial (configurada primero) ──
    if (configured) {
      const result = await tryUrlsSequentially(urls, model, options, timeoutPorUrl, globalController);
      if (result) return result;
      lastError = 'Todas las URLs fallaron';
    } else {
      // ─── Sin config: Promise.race para máxima velocidad ───────
      const result = await tryUrlsInParallel(urls, model, options, timeoutPorUrl, globalController);
      if (result) return result;
      lastError = 'Todas las URLs fallaron en paralelo';
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

// ─── Helper: intentar URLs secuencialmente ────────────────────

async function tryUrlsSequentially(
  urls: string[],
  model: string,
  options: OllamaChatOptions,
  timeoutMs: number,
  globalController: AbortController,
): Promise<OllamaChatResult | null> {
  for (const baseUrl of urls) {
    if (globalController.signal.aborted) break;

    const result = await tryUrl(baseUrl, model, options, timeoutMs, globalController.signal);
    if (result) return result;
  }
  return null;
}

// ─── Helper: Promise.race entre todas las URLs ────────────────

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

  const result = await Promise.race(attempts);
  if (result) return result;

  // Si todas fallaron, esperar a que terminen todas
  await Promise.allSettled(attempts);
  return null;
}

// ─── Helper: intentar una URL ─────────────────────────────────

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
      const res = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.models?.map((m: { name: string }) => m.name) || [];
      }
      return [];
    }),
  );

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.length > 0) return r.value;
  }
  return [];
}
