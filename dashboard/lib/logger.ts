import pino from 'pino';
import { maskPII } from '@/lib/anonymize';
import { getRequestId, getTenantId, getUserId } from '@/lib/request-context';

const level = (process.env.LOG_LEVEL as pino.Level) ?? 'info';

const transport =
  process.env.NODE_ENV === 'development'
    ? pino.transport({
        target: 'pino/file',
        options: { destination: 1 },
      })
    : undefined;

const baseLogger = pino({
  level,
  transport,
  serializers: {
    error: pino.stdSerializers.err,
  },
  redact: {
    paths: ['password', 'token', 'secret', 'authorization', 'cookie', 'rut', 'email'],
    censor: '[REDACTED]',
  },
});

function childLogger() {
  return baseLogger.child({
    requestId: getRequestId(),
    tenantId: getTenantId(),
    userId: getUserId(),
  });
}

function safeLogMessage(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: unknown): void {
  const log = childLogger();
  const sanitized = data !== undefined ? maskPII(data as Record<string, unknown>) : undefined;

  if (sanitized !== undefined) {
    log[level]({ data: sanitized }, message);
  } else {
    log[level](message);
  }
}

export function safeLog(message: string, data?: unknown): void {
  safeLogMessage('info', message, data);
}

export function safeWarn(message: string, data?: unknown): void {
  safeLogMessage('warn', message, data);
}

export function safeError(message: string, data?: unknown): void {
  safeLogMessage('error', message, data);
}

export function safeDebug(message: string, data?: unknown): void {
  safeLogMessage('debug', message, data);
}

export function safeConsoleLog(...args: unknown[]): void {
  const sanitized = args.map((arg) => {
    if (arg !== null && typeof arg === 'object' && !(arg instanceof Error)) {
      return maskPII(arg as Record<string, unknown>);
    }
    return arg;
  });
  childLogger().info({ data: sanitized }, 'console');
}

export const logger = baseLogger;
