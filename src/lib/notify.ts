import { createPrismaClient } from './prismaClient';
import { getAccountNotificationRecipients } from './access';
import type { Actor } from './actor';

const prisma = createPrismaClient();

type NotifiableEntry = {
  id: string;
  accountId: string;
  amount: number | string;
  category?: { name?: string; type?: 'INCOME' | 'EXPENSE' } | null;
};

// Fan out an in-app notification to everyone who can access the affected
// account (members + admins), except the actor. Fire-and-forget: never blocks
// or fails the request.
export async function notifyEntryChange(
  actor: Actor | null,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entry: NotifiableEntry,
): Promise<void> {
  try {
    const accountId = entry.accountId;
    if (!accountId) return;

    const recipients = await getAccountNotificationRecipients(actor, accountId);
    if (recipients.length === 0) return;

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { name: true, customerId: true },
    });

    const kind = entry.category?.type === 'INCOME' ? 'income' : 'expense';
    const verb = action === 'CREATE' ? 'added' : action === 'UPDATE' ? 'updated' : 'deleted';
    const who = actor?.name ?? 'Someone';
    const cat = entry.category?.name ? ` · ${entry.category.name}` : '';
    const summary = `${who} ${verb} ${kind} ${Number(entry.amount) || 0}${cat} in ${account?.name ?? 'an account'}`;

    await prisma.notification.createMany({
      data: recipients.map(r => ({
        customerId: account?.customerId ?? actor?.customerId ?? null,
        recipientId: r.id,
        actorId: actor?.id ?? null,
        actorName: who,
        action,
        resource: 'entry',
        resourceId: entry.id,
        accountId,
        accountName: account?.name ?? null,
        summary,
      })),
    });
  } catch (error) {
    console.error('notifyEntryChange failed:', error);
  }
}
