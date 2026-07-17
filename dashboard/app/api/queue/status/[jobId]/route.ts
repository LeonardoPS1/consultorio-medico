import { NextRequest, NextResponse } from 'next/server';
import { getPdfQueue, getReminderQueue, getAnonymizationQueue } from '@/lib/queue';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  const queues = [getPdfQueue(), getReminderQueue(), getAnonymizationQueue()].filter(Boolean);

  for (const queue of queues) {
    if (!queue) continue;
    const job = await queue.getJob(jobId);
    if (job) {
      const state = await job.getState();
      const progress = job.progress;
      const result = job.returnvalue;
      const failedReason = job.failedReason;

      return NextResponse.json({
        jobId,
        queue: queue.name,
        state,
        progress,
        result,
        failedReason,
        createdAt: job.timestamp,
      });
    }
  }

  return NextResponse.json({ error: 'Job no encontrado' }, { status: 404 });
}
