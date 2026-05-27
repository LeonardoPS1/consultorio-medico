/**
 * Logger Seguro — Safe logging utility.
 *
 * 🛡️ Previene la fuga accidental de PII (Personally Identifiable Information)
 * en logs del sistema, consola y archivos.
 *
 * Uso:
 *   import { safeLog, safeWarn, safeError } from '@/lib/logger';
 *   safeLog('Usuario creado', { userId: 'abc-123', email: 'test@test.com' });
 *   // → "[SafeLog] Usuario creado" { userId: 'abc-123', email: 'te***@test.com' }
 *
 * Para logs internos sin PII, usar los métodos regulares.
 * Para logs con datos de pacientes, SIEMPRE usar safe*.
 */

import { maskPII } from '@/lib/anonymize';

type LogLevel = 'log' | 'warn' | 'error';

function safeLogMessage(level: LogLevel, message: string, data?: unknown): void {
  const sanitized = data !== undefined ? maskPII(data as Record<string, unknown>) : undefined;
  const prefix = `[Safe${level.charAt(0).toUpperCase() + level.slice(1)}]`;

  if (sanitized !== undefined) {
    switch (level) {
      case 'log':
        console.log(prefix, message, sanitized);
        break;
      case 'warn':
        console.warn(prefix, message, sanitized);
        break;
      case 'error':
        console.error(prefix, message, sanitized);
        break;
    }
  } else {
    switch (level) {
      case 'log':
        console.log(prefix, message);
        break;
      case 'warn':
        console.warn(prefix, message);
        break;
      case 'error':
        console.error(prefix, message);
        break;
    }
  }
}

/**
 * Loggea un mensaje informativo con sanitización automática de PII.
 * @param message Mensaje descriptivo
 * @param data Opcional: objeto con datos que serán sanitizados automáticamente
 */
export function safeLog(message: string, data?: unknown): void {
  safeLogMessage('log', message, data);
}

/**
 * Loggea una advertencia con sanitización automática de PII.
 */
export function safeWarn(message: string, data?: unknown): void {
  safeLogMessage('warn', message, data);
}

/**
 * Loggea un error con sanitización automática de PII.
 */
export function safeError(message: string, data?: unknown): void {
  safeLogMessage('error', message, data);
}

/**
 * Alternativa directa a console.log con sanitización.
 * Similar a safeLog pero sin prefijo, para reemplazar console.log existente.
 */
export function safeConsoleLog(...args: unknown[]): void {
  const sanitized = args.map((arg) => {
    if (arg !== null && typeof arg === 'object' && !(arg instanceof Error)) {
      return maskPII(arg as Record<string, unknown>);
    }
    return arg;
  });
  console.log(...sanitized);
}
