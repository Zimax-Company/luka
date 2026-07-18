import { createPrismaClient } from './prismaClient';
import type { Actor } from './actor';

const prisma = createPrismaClient();

// Account IDs the actor is allowed to see / act on.
//   • ADMIN  → every account in their customer (implicit, all-access)
//   • others → their explicit AccountAccess grants
// Returns [] for an unknown actor (deny by default). Clients always send the
// x-user-id / x-user-email headers, so a null actor means "not identified".
export async function getAccessibleAccountIds(actor: Actor | null): Promise<string[]> {
  if (!actor) return [];

  if (actor.role === 'ADMIN') {
    if (actor.customerId) {
      const rows = await prisma.account.findMany({
        where: { customerId: actor.customerId, isActive: true },
        select: { id: true },
      });
      return rows.map(r => r.id);
    }
    // Legacy admin without a customer: fall back to accounts they own.
    const owned = await prisma.account.findMany({
      where: { userId: actor.id, isActive: true },
      select: { id: true },
    });
    return owned.map(a => a.id);
  }

  const grants = await prisma.accountAccess.findMany({
    where: { userId: actor.id },
    select: { accountId: true },
  });
  return grants.map(g => g.accountId);
}

export async function canAccessAccount(actor: Actor | null, accountId: string | null | undefined): Promise<boolean> {
  if (!actor || !accountId) return false;
  const ids = await getAccessibleAccountIds(actor);
  return ids.includes(accountId);
}

// Filter any account-bearing rows (entries, categories, accounts) down to those
// the actor can access.
export function scopeByAccount<T extends { accountId?: string | null; id?: string }>(
  rows: T[],
  accountIds: string[],
  key: 'accountId' | 'id' = 'accountId',
): T[] {
  const set = new Set(accountIds);
  return rows.filter(r => {
    const v = key === 'id' ? r.id : r.accountId;
    return v != null && set.has(v);
  });
}

// The account a category belongs to (for write-access checks on entries/categories).
export async function getCategoryAccountId(categoryId: string): Promise<string | null> {
  if (!categoryId) return null;
  const c = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { accountId: true },
  });
  return c?.accountId ?? null;
}

// Recipients for an entry-change notification: everyone who can access the
// account (members + admins of the customer) EXCEPT the actor.
export async function getAccountNotificationRecipients(
  actor: Actor | null,
  accountId: string,
): Promise<Array<{ id: string }>> {
  if (!accountId) return [];

  // The account's customer (for finding its admins).
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { customerId: true },
  });
  const customerId = account?.customerId ?? actor?.customerId ?? null;

  const [members, admins] = await Promise.all([
    prisma.accountAccess.findMany({ where: { accountId }, select: { userId: true } }),
    customerId
      ? prisma.user.findMany({
          where: { customerId, role: 'ADMIN', isActive: true },
          select: { id: true },
        })
      : Promise.resolve([] as Array<{ id: string }>),
  ]);

  const ids = new Set<string>();
  for (const m of members) ids.add(m.userId);
  for (const a of admins) ids.add(a.id);
  if (actor) ids.delete(actor.id); // never notify yourself

  return Array.from(ids).map(id => ({ id }));
}
