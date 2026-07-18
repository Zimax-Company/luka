import { createPrismaClient } from './prismaClient';

const prisma = createPrismaClient();

// Normalise arbitrary text into a handle slug (a-z, 0-9, underscore).
export function slugifyHandle(input: string): string {
  const base = (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  return base || 'acct';
}

// Return a globally-unique handle derived from `desired`, appending _2, _3… on
// collision. Pass excludeAccountId when renaming an existing account's handle.
export async function uniqueHandle(desired: string, excludeAccountId?: string): Promise<string> {
  const base = slugifyHandle(desired);
  let candidate = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await prisma.account.findFirst({
      where: { handle: candidate, ...(excludeAccountId ? { id: { not: excludeAccountId } } : {}) },
      select: { id: true },
    });
    if (!clash) return candidate;
    n += 1;
    candidate = `${base}_${n}`;
  }
}

// Resolve a handle (with or without a leading @) to its active account.
export async function resolveHandle(
  handle: string,
): Promise<{ id: string; name: string; customerId: string | null; handle: string | null } | null> {
  const clean = (handle || '').replace(/^@/, '').trim().toLowerCase();
  if (!clean) return null;
  const acc = await prisma.account.findUnique({
    where: { handle: clean },
    select: { id: true, name: true, customerId: true, handle: true, isActive: true },
  });
  if (!acc || !acc.isActive) return null;
  return { id: acc.id, name: acc.name, customerId: acc.customerId, handle: acc.handle };
}
