/**
 * Cliente Ollama simplificado y robusto.
 *
 * Estrategia: POST directo sin health check previo.
 * Si una URL no responde en 15s, pasa a la siguiente.
 * Timeout global: 120s para probar todas las URLs.
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

// ─── URLs a probar (en orden) ─────────────────────────────────

function getUrls(): string[] {
  const configured = process.env.OLLAMA_BASE_URL;
  if (!configured) {
    // Sin config → probar todas las posibles
    return [
      'http://host.docker.internal:11434',
      'http://172.18.0.1:11434',
      'http://172.17.0.1:11434',
      'http://172.19.0.1:11434',
      'http://ollama:11434',
      'http://localhost:11434',
    ];
  }

  // Con config → poner configurada PRIMERO, luego fallbacks distintas
  const fallbacks = [
    'http://host.docker.internal:11434',
    'http://172.18.0.1:11434',
    'http://172.17.0.1:11434',
    'http://172.19.0.1:11434',
    'http://ollama:11434',
    'http://localhost:11434',
  ];
  const urls = [configured];
  for (const fb of fallbacks) {
    if (fb !== configured && !urls.includes(fb)) urls.push(fb);
  }
  return urls;
}

// ─── Función principal ────────────────────────────────────────

/**
 * Llama a Ollama para generar una respuesta.
 * POST /v1/chat/completions directo, sin health check previo.
 * Prueba todas las URLs conocidas hasta que una responda.
 */
export async function ollamaChat(options: OllamaChatOptions): Promise<OllamaChatResult> {
  const model = process.env.OLLAMA_MODEL || 'gemma3';
  const urls = getUrls();
  const timeoutPorUrl = 15_000; // 15s por intento
  const globalTimeout = 120_000; // 2min global

  safeLog(`[Ollama] URLs: [${urls.join(', ')}], modelo: ${model}`);

  const globalController = new AbortController();
  const globalTimer = setTimeout(() => globalController.abort(), globalTimeout);

  let lastError = '';

  try {
    for (const baseUrl of urls) {
      if (globalController.signal.aborted) {
        lastError = 'Timeout global alcanzado';
        break;
      }

      safeLog(`[Ollama] Intentando ${baseUrl}...`);

      const requestController = new AbortController();
      const requestTimer = setTimeout(() => requestController.abort(), timeoutPorUrl);
      const combined = AbortSignal.any([globalController.signal, requestController.signal]);

      try {
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
          lastError = `HTTP ${res.status} en ${baseUrl}: ${body.slice(0, 150)}`;
          safeWarn(`[Ollama] ${lastError}`);
          continue;
        }

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content?.trim();

        if (content) {
          safeLog(`[Ollama] OK desde ${baseUrl} (${content.length} chars)`);
          return { content, success: true, sourceUrl: baseUrl };
        }

        lastError = `Respuesta vacía de ${baseUrl}`;
        safeWarn(`[Ollama] ${lastError}`);
        continue;
      } catch (err) {
        clearTimeout(requestTimer);
        lastError = err instanceof Error ? err.message : String(err);
        safeWarn(`[Ollama] ${baseUrl} → ${lastError}`);
        continue;
      }
    }

    // Todas fallaron
    const env = `OLLAMA_BASE_URL=${process.env.OLLAMA_BASE_URL || '(no config)'}, OLLAMA_MODEL=${model}`;
    const msg = `Todas las URLs de Ollama fallaron. ${env}. Último error: ${lastError}`;
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

// ─── Utilidad: listar modelos ─────────────────────────────────

export async function listModels(): Promise<string[]> {
  const urls = getUrls();
  for (const baseUrl of urls) {
    try {
      const res = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.models?.map((m: { name: string }) => m.name) || [];
      }
    } catch {
      continue;
    }
  }
  return [];
}
