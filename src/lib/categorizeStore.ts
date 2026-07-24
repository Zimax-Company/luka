import { createPrismaClient } from './prismaClient';
import { buildModel, CategoryModel, TrainEntry } from './categorize';

const prisma = createPrismaClient();

// Per-account model cache. Rebuilt on demand, invalidated when the account's
// entries change so corrections are reflected on the next suggestion.
const CACHE = new Map<string, { model: CategoryModel; builtAt: number }>();
const TTL_MS = 5 * 60 * 1000;
const MAX_TRAIN = 8000;

export async function getCategoryModel(accountId: string): Promise<CategoryModel> {
  const hit = CACHE.get(accountId);
  if (hit && Date.now() - hit.builtAt < TTL_MS) return hit.model;

  const rows = await prisma.entry.findMany({
    where: { accountId },
    select: {
      note: true,
      categoryId: true,
      amount: true,
      category: { select: { name: true, type: true } },
    },
    orderBy: { date: 'desc' },
    take: MAX_TRAIN,
  });

  const train: TrainEntry[] = rows.map(r => ({
    note: r.note,
    categoryId: r.categoryId,
    categoryName: r.category?.name ?? '',
    categoryType: (r.category?.type ?? 'EXPENSE') as 'INCOME' | 'EXPENSE',
    amount: Number(r.amount) || 0,
  }));

  const model = buildModel(train);
  CACHE.set(accountId, { model, builtAt: Date.now() });
  return model;
}

// Called after an account's entries change so the next suggestion retrains.
export function invalidateCategoryModel(accountId: string | null | undefined) {
  if (accountId) CACHE.delete(accountId);
}
