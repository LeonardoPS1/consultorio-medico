import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { webhookConfigs } from '@/drizzle/operations';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { apiHandler, ok } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';

// POST /api/webhooks/configs/[id]/regenerate-secret
export const POST = apiHandler(
  async (_request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
    const { id } = await paramsPromise;
    await requireAuth();
    const secret = randomBytes(32).toString('hex');
    const [updated] = await db
      .update(webhookConfigs)
      .set({ secret, updatedAt: new Date() })
      .where(eq(webhookConfigs.id, id))
      .returning();
    return ok({ data: { secret: updated.secret } });
  },
);
