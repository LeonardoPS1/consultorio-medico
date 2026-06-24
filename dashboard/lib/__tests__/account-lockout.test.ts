import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock de la DB antes de importar el módulo
const mockAccountLockouts = new Map<
  string,
  { email: string; attempts: number; lockedUntil: Date | null; updatedAt: Date }
>();

vi.mock('@/lib/db', () => {
  return {
    db: {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() => {
        // Return based on what we're querying
        return [];
      }),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    },
  };
});

import {
  isAccountLocked,
  incrementFailedAttempts,
  resetFailedAttempts,
  getRemainingAttempts,
} from '@/lib/account-lockout';

describe('account-lockout', () => {
  beforeEach(() => {
    mockAccountLockouts.clear();
    vi.clearAllMocks();
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
      const result = await incrementFailedAttempts('test@example.com');
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
  });

  describe('isAccountLocked', () => {
    it('no está bloqueada si no hay intentos', async () => {
      const result = await isAccountLocked('test@example.com');
      expect(result.locked).toBe(false);
    });

    it('está bloqueada tras 5 intentos', async () => {
      for (let i = 0; i < 6; i++) {
        await incrementFailedAttempts('test@example.com');
      }
      const result = await isAccountLocked('test@example.com');
      expect(result.locked).toBe(true);
    });

    it('case insensitive para email', async () => {
      await incrementFailedAttempts('Test@Example.com');
      for (let i = 0; i < 5; i++) {
        await incrementFailedAttempts('test@example.com');
      }
      const result = await isAccountLocked('TEST@EXAMPLE.COM');
      expect(result.locked).toBe(true);
    });
  });

  describe('resetFailedAttempts', () => {
    it('resetea contador después de bloqueo', async () => {
      for (let i = 0; i < 6; i++) {
        await incrementFailedAttempts('test@example.com');
      }
      expect(await isAccountLocked('test@example.com')).toBe(true);

      await resetFailedAttempts('test@example.com');
      expect(await isAccountLocked('test@example.com')).toBe(false);
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
      for (let i = 0; i < 6; i++) {
        await incrementFailedAttempts('test@example.com');
      }
      expect(await getRemainingAttempts('test@example.com')).toBe(0);
    });
  });
});
