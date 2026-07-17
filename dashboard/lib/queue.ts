import { Queue, type QueueOptions } from 'bullmq';
import Redis from 'ioredis';
import { getRedis } from '@/lib/redis';
import { safeLog, safeWarn, safeError } from '@/lib/logger';
import { captureError } from '@/lib/glitchtip';

function createBullConnection(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  try {
    return new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
  } catch {
    return null;
  }
}

function getQueueOpts(): QueueOptions | null {
  const connection = createBullConnection();
  if (!connection) return null;
  return {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 3600 * 24 },
      removeOnFail: { age: 3600 * 24 * 7 },
    },
  };
}

let _pdfQueue: Queue | null = null;
let _reminderQueue: Queue | null = null;
let _anonymizationQueue: Queue | null = null;

function ensureRedis(): boolean {
  return !!process.env.REDIS_URL;
}

export function getPdfQueue(): Queue | null {
  if (!ensureRedis()) return null;
  if (!_pdfQueue) {
    const opts = getQueueOpts();
    if (!opts) return null;
    _pdfQueue = new Queue('pdf-generation', opts);
  }
  return _pdfQueue;
}

export function getReminderQueue(): Queue | null {
  if (!ensureRedis()) return null;
  if (!_reminderQueue) {
    const opts = getQueueOpts();
    if (!opts) return null;
    _reminderQueue = new Queue('reminders', opts);
  }
  return _reminderQueue;
}

export function getAnonymizationQueue(): Queue | null {
  if (!ensureRedis()) return null;
  if (!_anonymizationQueue) {
    const opts = getQueueOpts();
    if (!opts) return null;
    _anonymizationQueue = new Queue('anonymization', opts);
  }
  return _anonymizationQueue;
}

export async function enqueuePdfGeneration(name: string, data: Record<string, unknown>) {
  const queue = getPdfQueue();
  if (!queue) {
    safeWarn('[Queue] Redis no disponible, ejecutando inline');
    return null;
  }
  return queue.add(name, data);
}

export async function enqueueReminders(name: string, data: Record<string, unknown>) {
  const queue = getReminderQueue();
  if (!queue) {
    safeWarn('[Queue] Redis no disponible, ejecutando inline');
    return null;
  }
  return queue.add(name, data);
}

export async function enqueueAnonymization(name: string, data: Record<string, unknown>) {
  const queue = getAnonymizationQueue();
  if (!queue) {
    safeWarn('[Queue] Redis no disponible, ejecutando inline');
    return null;
  }
  return queue.add(name, data);
}
