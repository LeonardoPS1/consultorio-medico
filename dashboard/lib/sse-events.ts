import { safeLog, safeWarn } from '@/lib/logger';

interface SSEClient {
  id: string;
  tenantId?: string;
  userId?: string;
  write(data: string): void;
  close(): void;
}

interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
}

let clients: SSEClient[] = [];
let clientIdCounter = 0;

/** Registra un cliente SSE conectado con su tenant (y opcionalmente userId para fan-out dirigido). */
export function addClient(
  tenantId: string,
  write: (data: string) => void,
  close: () => void,
  options?: { userId?: string },
): string {
  const id = `sse-${++clientIdCounter}`;
  const client: SSEClient = { id, tenantId, ...(options?.userId ? { userId: options.userId } : {}), write, close };
  clients.push(client);

  // Heartbeat cada 30s
  const heartbeat = setInterval(() => {
    write(`event: heartbeat\ndata: {}\n\n`);
  }, 30_000);

  const originalClose = close;
  client.close = () => {
    clearInterval(heartbeat);
    originalClose();
    removeClient(id);
  };

  safeLog('[SSE] Cliente conectado:', { clientId: id, tenantId, userId: options?.userId });
  return id;
}

export function removeClient(id: string): void {
  clients = clients.filter((c) => c.id !== id);
}

/** Fan-out por tenant (reemplaza el evento original). */
export function emitEvent(tenantId: string, event: SSEEvent): void {
  emit((client) => client.tenantId === tenantId, event);
}

/** Fan-out dirigido a un usuario específico (mensajería interna staff). */
export function emitEventToUser(userId: string, event: SSEEvent): void {
  emit((client) => Boolean(client.userId && client.userId === userId), event);
}

function emit(predicate: (client: SSEClient) => boolean, event: SSEEvent): void {
  const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
  let sent = 0;
  for (const client of clients) {
    if (predicate(client)) {
      try {
        client.write(payload);
        sent++;
      } catch {
        removeClient(client.id);
      }
    }
  }
  if (sent > 0) {
    safeLog('[SSE] Evento emitido:', { type: event.type, clients: sent });
  }
}

export { safeWarn };