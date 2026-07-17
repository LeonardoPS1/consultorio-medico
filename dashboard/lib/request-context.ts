import { AsyncLocalStorage } from 'async_hooks';

interface RequestContext {
  requestId: string;
  tenantId: string;
  userId?: string;
}

const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}

export function getRequestId(): string {
  return requestContext.getStore()?.requestId ?? 'global';
}

export function getTenantId(): string {
  return requestContext.getStore()?.tenantId ?? '00000000-0000-0000-0000-000000000000';
}

export function getUserId(): string | undefined {
  return requestContext.getStore()?.userId;
}

export function runWithContext<R>(
  ctx: RequestContext,
  fn: () => R,
): R {
  return requestContext.run(ctx, fn);
}

export function setUserId(userId: string): void {
  const store = requestContext.getStore();
  if (store) {
    store.userId = userId;
  }
}
