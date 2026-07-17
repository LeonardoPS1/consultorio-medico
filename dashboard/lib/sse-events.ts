import { safeLog, safeWarn } from '@/lib/logger';

interface SSEClient {
  id: string;
  tenantId: string;
  write(data: string): void;
  close(): void;
}

interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
}

let clients: SSEClient[] = [];
let clientIdCounter = 0;

export function addClient(tenantId: string, write: (data: string) => void, close: () => void): string {
  const id = `sse-${++clientIdCounter}`;
  clients.push({ id, tenantId, write, close });

  // Heartbeat cada 30s
  const heartbeat = setInterval(() => {
    write(`event: heartbeat\ndata: {}\n\n`);
  }, 30_000);

  const originalClose = close;
    close: () => {
    clearInterval(heartbeat);
    originalClose();
    clients = clients.filter((c) => c.id !== id);
    safeLog('[SSE] Cliente desconectado:', { clientId: id });
  };

  clients = clients.filter((c) => c.id !== id);
  clients.push({ id, tenantId, write, close: () => { clearInterval(heartbeat); originalClose(); } });

  safeLog('[SSE] Cliente conectado:', { clientId: id, tenantId });
  return id;
}

export function removeClient(id: string): void {
  clients = clients.filter((c) => c.id !== id);
}

export function emitEvent(tenantId: string, event: SSEEvent): void {
  const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
  let sent = 0;
  for (const client of clients) {
    if (client.tenantId === tenantId) {
      try {
        client.write(payload);
        sent++;
      } catch {
        removeClient(client.id);
      }
    }
  }
  if (sent > 0) {
    safeLog('[SSE] Evento emitido:', { type: event.type, tenantId, clients: sent });
  }
}
