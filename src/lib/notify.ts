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

// A new transfer is pending — notify the RECIPIENT account's members/admins.
export async function notifyTransferCreated(
  actor: Actor | null,
  transfer: { id: string; toAccountId: string; amount: number | string; toHandle?: string | null; senderName: string },
): Promise<void> {
  try {
    const recipients = await getAccountNotificationRecipients(actor, transfer.toAccountId);
    if (recipients.length === 0) return;
    const account = await prisma.account.findUnique({
      where: { id: transfer.toAccountId },
      select: { name: true, customerId: true, handle: true },
    });
    const target = transfer.toHandle ?? account?.handle ?? account?.name ?? 'your account';
    const summary = `${transfer.senderName} posted ${Number(transfer.amount) || 0} to @${target} — accept to record it as income`;
    await prisma.notification.createMany({
      data: recipients.map(r => ({
        customerId: account?.customerId ?? null,
        recipientId: r.id,
        actorId: actor?.id ?? null,
        actorName: transfer.senderName,
        action: 'CREATE',
        resource: 'transfer',
        resourceId: transfer.id,
        accountId: transfer.toAccountId,
        accountName: account?.name ?? null,
        summary,
      })),
    });
  } catch (error) {
    console.error('notifyTransferCreated failed:', error);
  }
}

// A transfer was accepted/rejected — notify the original SENDER.
export async function notifyTransferDecided(
  actor: Actor | null,
  transfer: { id: string; senderId?: string | null; fromAccountId: string; amount: number | string; toAccountName?: string | null },
  accepted: boolean,
): Promise<void> {
  try {
    if (!transfer.senderId) return;
    const who = actor?.name ?? 'Someone';
    const verb = accepted ? 'accepted' : 'rejected';
    const extra = accepted ? '' : ' — your expense was reversed';
    const summary = `${who} ${verb} your ${Number(transfer.amount) || 0} posting to ${transfer.toAccountName ?? 'an account'}${extra}`;
    await prisma.notification.create({
      data: {
        recipientId: transfer.senderId,
        actorId: actor?.id ?? null,
        actorName: who,
        action: accepted ? 'UPDATE' : 'DELETE',
        resource: 'transfer',
        resourceId: transfer.id,
        accountId: transfer.fromAccountId,
        accountName: null,
        summary,
      },
    });
  } catch (error) {
    console.error('notifyTransferDecided failed:', error);
  }
}
