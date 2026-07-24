import { createPrismaClient } from './prismaClient';

const prisma = createPrismaClient();

export interface ItemInput {
  name: string;
  amount: number;
  categoryItemId?: string | null;
}

// Normalise + validate item lines against the entry amount. Returns a cleaned
// list, or an error message if invalid. Empty/absent items are allowed (null).
export function validateItems(
  raw: unknown,
  entryAmount: number,
): { items: ItemInput[] | null; error?: string } {
  if (raw == null) return { items: null };
  if (!Array.isArray(raw)) return { items: null, error: 'items must be a list' };

  const items: ItemInput[] = [];
  let sum = 0;
  for (const r of raw) {
    const name = String(r?.name ?? '').trim();
    const amount = Number(r?.amount);
    if (!name) return { items: null, error: 'Each item needs a name' };
    if (isNaN(amount) || amount <= 0) return { items: null, error: `Item "${name}" needs an amount > 0` };
    sum += amount;
    items.push({ name, amount, categoryItemId: r?.categoryItemId ?? null });
  }
  // Round to avoid float noise (2dp currency).
  if (Math.round(sum * 100) > Math.round(entryAmount * 100)) {
    return { items: null, error: 'Item amounts exceed the entry amount' };
  }
  return { items };
}

// Replace all line items on an entry.
export async function replaceEntryItems(entryId: string, items: ItemInput[]): Promise<void> {
  await prisma.entryItem.deleteMany({ where: { entryId } });
  if (items.length > 0) {
    await prisma.entryItem.createMany({
      data: items.map(i => ({
        entryId,
        name: i.name,
        amount: i.amount,
        categoryItemId: i.categoryItemId ?? null,
      })),
    });
  }
}

export async function getEntryItems(entryId: string) {
  const rows = await prisma.entryItem.findMany({ where: { entryId }, orderBy: { createdAt: 'asc' } });
  return rows.map(r => ({ ...r, amount: Number(r.amount) }));
}
