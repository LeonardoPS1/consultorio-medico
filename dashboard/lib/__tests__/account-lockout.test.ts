import { describe, it, expect, beforeEach, vi } from 'vitest';

// ------------------------------------------------------------------
// Fake en memoria de la tabla `account_lockouts`.
// El test original fue escrito para una implementación in-memory y quedó
// obsoleto cuando el servicio pasó a PostgreSQL: el mock devolvía siempre []
// y ninguna aserción podía pasar.
// ------------------------------------------------------------------

interface LockoutRow {
  email: string;
  attempts: number;
  lockedUntil: Date | null;
  updatedAt: Date;
}

// `vi.hoisted` garantiza que el store exista antes de que se resuelvan los
// imports (los `vi.mock` se elevan al tope del módulo).
const { store } = vi.hoisted(() => ({
  store: new Map<
    string,
    { email: string; attempts: number; lockedUntil: Date | null; updatedAt: Date }
  >(),
}));

// `eq()` real devuelve un SQL opaco; lo reemplazamos por un objeto del que
// podamos extraer la clave comparada.
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: (_column: unknown, value: unknown) => ({ __eqKey: value }),
  };
});

type ChainOp = 'select' | 'update' | 'delete';

function makeChain(op: ChainOp, payload?: Partial<LockoutRow>) {
  let key: string | undefined;
  const extractKey = (clause: unknown): string | undefined => {
    const value = (clause as { __eqKey?: unknown } | undefined)?.__eqKey;
    return typeof value === 'string' ? value : undefined;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fake chainable builder
  const chain: any = {
    from: () => chain,
    where: (clause: unknown) => {
      key = extractKey(clause);
      if (op === 'select') return chain;
      if (op === 'update') {
        const row = key ? store.get(key) : undefined;
        if (row && key) store.set(key, { ...row, ...payload, updatedAt: new Date() });
      }
      if (op === 'delete' && key) store.delete(key);
      return Promise.resolve();
    },
    limit: async () => {
      const row = key ? store.get(key) : undefined;
      return row ? [{ ...row }] : [];
    },
  };
  return chain;
}

vi.mock('@/lib/db', () => ({
  db: {
    select: () => makeChain('select'),
    insert: () => ({
      values: async (values: Partial<LockoutRow> & { email: string }) => {
        store.set(values.email, {
          email: values.email,
          attempts: values.attempts ?? 1,
          lockedUntil: values.lockedUntil ?? null,
          updatedAt: new Date(),
        });
      },
    }),
    update: () => ({
      set: (payload: Partial<LockoutRow>) => makeChain('update', payload),
    }),
    delete: () => makeChain('delete'),
  },
}));

import {
  isAccountLocked,
  incrementFailedAttempts,
  resetFailedAttempts,
  getRemainingAttempts,
} from '@/lib/account-lockout';

describe('account-lockout', () => {
  beforeEach(() => {
    store.clear();
  });

  describe('incrementFailedAttempts', () => {
    it('primer intento no bloquea', async () => {
      const result = await incrementFailedAttempts('test@example.com');
      expect(result.locked).toBe(false);
    });

    it('bloquea después de 5 intentos', async () => {
      for (let i = 0; i < 5; i++) {
        await incrementFailedAttempts('test@example.com');
      }
      const result = await isAccountLocked('test@example.com');
      expect(result.locked).toBe(true);
      expect(result.remainingMinutes).toBe(15);
    });

    it('no bloquea si fallan 3 veces (4to intento)', async () => {
      for (let i = 0; i < 3; i++) {
        await incrementFailedAttempts('test@example.com');
      }
      const result = await incrementFailedAttempts('test@example.com');
      expect(result.locked).toBe(false);
    });

    it('normaliza el email a minúsculas', async () => {
      await incrementFailedAttempts('Test@Example.com');
      expect(store.has('test@example.com')).toBe(true);
      expect(store.has('Test@Example.com')).toBe(false);
    });
  });

  describe('isAccountLocked', () => {
    it('no está bloqueada si no hay intentos', async () => {
      const result = await isAccountLocked('test@example.com');
      expect(result.locked).toBe(false);
    });

    it('está bloqueada tras 5 intentos', async () => {
      for (let i = 0; i < 5; i++) {
        await incrementFailedAttempts('test@example.com');
      }
      const result = await isAccountLocked('test@example.com');
      expect(result.locked).toBe(true);
    });

    it('case insensitive para email', async () => {
      for (let i = 0; i < 5; i++) {
        await incrementFailedAttempts('Test@Example.com');
      }
      const result = await isAccountLocked('TEST@EXAMPLE.COM');
      expect(result.locked).toBe(true);
    });

    it('se desbloquea sola cuando expira la ventana', async () => {
      for (let i = 0; i < 5; i++) {
        await incrementFailedAttempts('test@example.com');
      }
      const entry = store.get('test@example.com');
      expect(entry?.lockedUntil).toBeTruthy();

      // Simular que ya pasaron los 15 minutos
      store.set('test@example.com', {
        ...(entry as LockoutRow),
        lockedUntil: new Date(Date.now() - 1000),
      });

      const result = await isAccountLocked('test@example.com');
      expect(result.locked).toBe(false);
      // La entrada expirada se limpia
      expect(store.has('test@example.com')).toBe(false);
    });
  });

  describe('resetFailedAttempts', () => {
    it('resetea contador después de bloqueo', async () => {
      for (let i = 0; i < 5; i++) {
        await incrementFailedAttempts('test@example.com');
      }
      expect((await isAccountLocked('test@example.com')).locked).toBe(true);

      await resetFailedAttempts('test@example.com');
      expect((await isAccountLocked('test@example.com')).locked).toBe(false);
      expect(store.has('test@example.com')).toBe(false);
    });
  });

  describe('getRemainingAttempts', () => {
    it('devuelve 5 si no hay intentos', async () => {
      expect(await getRemainingAttempts('test@example.com')).toBe(5);
    });

    it('devuelve intentos restantes', async () => {
      await incrementFailedAttempts('test@example.com');
      await incrementFailedAttempts('test@example.com');
      expect(await getRemainingAttempts('test@example.com')).toBe(3);
    });

    it('devuelve 0 si está bloqueada', async () => {
      for (let i = 0; i < 5; i++) {
        await incrementFailedAttempts('test@example.com');
      }
      expect(await getRemainingAttempts('test@example.com')).toBe(0);
    });
  });
});
