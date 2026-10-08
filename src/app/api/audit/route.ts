import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/server/db';
import { handle, json } from '@/server/http';
import { ApiError } from '@/server/errors';
import { verifyAuditSegment } from '@/lib/audit-chain';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  return handle(async () => {
    const params = new URL(request.url).searchParams;
    const parsed = z
      .object({
        after: z.coerce.number().int().min(0).max(2147483647),
        limit: z.coerce.number().int().min(1).max(100),
      })
      .safeParse({ after: params.get('after') ?? 0, limit: params.get('limit') ?? 20 });
    if (!parsed.success) throw new ApiError(400, 'Invalid audit page');
    const { after, limit } = parsed.data;
    return json(
      await db.$transaction(
        async (tx) => {
          const rows = await tx.auditEvent.findMany({
            where: { sequence: { gt: after } },
            orderBy: { sequence: 'asc' },
            take: limit + 1,
            select: {
              sequence: true,
              commitment: true,
              previousHash: true,
              hash: true,
              blockchain: { select: { adapter: true, status: true, receipt: true } },
            },
          });
          const previous = await tx.auditEvent.findFirst({
            where: { sequence: { lte: after } },
            orderBy: { sequence: 'desc' },
            select: { hash: true },
          });
          const events = rows.slice(0, limit);
          return {
            events,
            hasMore: rows.length > limit,
            total: await tx.auditEvent.count(),
            verifiedRange: verifyAuditSegment(events, previous?.hash ?? '0'.repeat(64)),
            nextAfter: events.at(-1)?.sequence ?? after,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      ),
    );
  });
}
