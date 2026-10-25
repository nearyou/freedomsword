import type { Prisma, User } from '@prisma/client';
import { db } from './db';
import { ApiError } from './errors';
import { serializable, lockCitizen } from './transaction';
import { requireEligibility } from './verification';
import { appendAudit } from './audit';
import { databaseNow } from './database-time';
import { effectiveElectionStatus } from './core/lifecycle';
import { sha256 } from './core/hash';
import { supportBalance, supportUnlockAt } from './core/support';

const budgetInclude = { allocations: { select: { candidateId: true, units: true } },
  withdrawals: { select: { units: true, availableAt: true }, orderBy: { availableAt: 'asc' as const } } };

async function summary(tx: Prisma.TransactionClient, userId: string, electionId: string) {
  const budget = await tx.supportBudget.findUnique({
    where: { userId_electionId: { userId, electionId } }, include: budgetInclude,
  });
  const now = await databaseNow(tx);
  return { electionId, ...supportBalance(budget?.allocations ?? [], budget?.withdrawals ?? [], now),
    serverTime: now.toISOString() };
}

export async function readSupport(user: User, electionId: string) {
  return db.$transaction(async (tx) => {
    const election = await tx.election.findUnique({ where: { id: electionId } });
    if (!election || election.status === 'DRAFT' || election.protocol !== 'CONTINUOUS_SUPPORT')
      throw new ApiError(404, 'Reusable-support election not found');
    return summary(tx, user.id, electionId);
  }, { maxWait: 20_000, timeout: 30_000 });
}

export interface SupportCommand {
  electionId: string;
  candidateId: string;
  action: 'allocate' | 'withdraw';
  units: number;
  requestId: string;
}

export async function changeSupport(user: User, input: SupportCommand) {
  if (!Number.isInteger(input.units) || input.units < 1 || input.units > 100)
    throw new ApiError(400, 'Choose between 1 and 100 whole units');
  const requestHash = sha256(JSON.stringify(input));
  return serializable(async (tx) => {
    await lockCitizen(tx, user.id);
    let budget = await tx.supportBudget.findUnique({
      where: { userId_electionId: { userId: user.id, electionId: input.electionId } },
    });
    if (budget) {
      const previous = await tx.supportEvent.findUnique({
        where: { budgetId_requestId: { budgetId: budget.id, requestId: input.requestId } },
      });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new ApiError(409, 'Request ID already used');
        return { ...await summary(tx, user.id, input.electionId), replayed: true };
      }
    }
    await requireEligibility(tx, user.id);
    const locked = await tx.election.updateMany({ where: { id: input.electionId,
      protocol: 'CONTINUOUS_SUPPORT' }, data: { revision: { increment: 1 } } });
    if (locked.count !== 1) throw new ApiError(409, 'This election does not use reusable support');
    const election = await tx.election.findUniqueOrThrow({ where: { id: input.electionId } });
    const now = await databaseNow(tx);
    if (effectiveElectionStatus(election, now) !== 'ACTIVE')
      throw new ApiError(409, 'This election is not open');
    const candidate = await tx.candidate.findFirst({
      where: { id: input.candidateId, electionId: input.electionId, withdrawn: false },
    });
    if (!candidate) throw new ApiError(400, 'Candidate does not belong to this election');
    if (!budget) {
      if (input.action === 'withdraw') throw new ApiError(409, 'No support to recall');
      budget = await tx.supportBudget.create({ data: { userId: user.id, electionId: election.id } });
    }
    const balance = await summary(tx, user.id, election.id);
    const allocation = balance.allocations.find((entry) => entry.candidateId === candidate.id);
    if (input.action === 'allocate') {
      if (input.units > balance.availableUnits)
        throw new ApiError(409, 'Not enough available units; recalled units unlock six months after each withdrawal');
      await tx.supportAllocation.upsert({
        where: { budgetId_candidateId: { budgetId: budget.id, candidateId: candidate.id } },
        create: { budgetId: budget.id, electionId: election.id, candidateId: candidate.id, units: input.units },
        update: { units: { increment: input.units } },
      });
    } else {
      if (!allocation || input.units > allocation.units)
        throw new ApiError(409, 'Recall amount exceeds your support for this candidate');
      await tx.supportAllocation.update({
        where: { budgetId_candidateId: { budgetId: budget.id, candidateId: candidate.id } },
        data: { units: { decrement: input.units } },
      });
      await tx.supportWithdrawal.create({ data: { budgetId: budget.id,
        units: input.units, availableAt: supportUnlockAt(now), createdAt: now } });
    }
    await tx.supportEvent.create({ data: { budgetId: budget.id, candidateId: candidate.id,
      type: input.action === 'allocate' ? 'ALLOCATE' : 'WITHDRAW', units: input.units,
      requestId: input.requestId, requestHash, createdAt: now } });
    // The legacy contract cannot enforce reusable support. Only the audit commitment is anchored.
    await appendAudit(tx, JSON.stringify({ action: `SUPPORT_${input.action.toUpperCase()}`,
      budgetId: budget.id, candidateId: candidate.id, units: input.units }), election.id);
    if (effectiveElectionStatus(election, await databaseNow(tx)) !== 'ACTIVE')
      throw new ApiError(409, 'Election window ended during this request');
    return { ...await summary(tx, user.id, election.id), replayed: false };
  });
}
