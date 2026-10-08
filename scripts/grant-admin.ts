import 'dotenv/config';
import { db } from '../src/server/db';
import { appendAudit } from '../src/server/audit';

async function main() {
  const telegramId = process.argv[2];
  if (!telegramId || !/^\d{1,20}$/.test(telegramId))
    throw new Error('Usage: npm run admin:grant -- <authenticated Telegram numeric ID>');
  await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { telegramId } });
    if (!user) throw new Error('That Telegram account must sign in before role assignment');
    const existing = await tx.adminGrant.findUnique({ where: { userId_role: { userId: user.id, role: 'ELECTION_MANAGER' } } });
    if (existing) return;
    await tx.adminGrant.create({ data: { userId: user.id, role: 'ELECTION_MANAGER' } });
    await appendAudit(tx, JSON.stringify({ action: 'ADMIN_GRANT', role: 'ELECTION_MANAGER', actor: user.id }));
  });
  process.stdout.write('Election manager role assigned.\n');
}
main().finally(() => db.$disconnect());
