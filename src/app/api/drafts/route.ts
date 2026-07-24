import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { getAccessibleAccountIds } from '@/lib/access';

const prisma = createPrismaClient();

// GET /api/drafts — pending review-inbox drafts for accounts the user can access.
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ success: false, error: 'Not identified' }, { status: 401 });

    const accessibleIds = await getAccessibleAccountIds(actor);
    if (accessibleIds.length === 0) return NextResponse.json({ success: true, data: [] });

    const drafts = await prisma.draftEntry.findMany({
      where: { accountId: { in: accessibleIds }, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const accountIds = Array.from(new Set(drafts.map(d => d.accountId)));
    const categoryIds = Array.from(new Set(drafts.map(d => d.categoryId).filter(Boolean) as string[]));
    const [accounts, categories] = await Promise.all([
      prisma.account.findMany({ where: { id: { in: accountIds } }, select: { id: true, name: true } }),
      prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } }),
    ]);
    const accName = new Map(accounts.map(a => [a.id, a.name]));
    const catName = new Map(categories.map(c => [c.id, c.name]));

    const data = drafts.map(d => ({
      ...d,
      amount: d.amount == null ? null : Number(d.amount),
      accountName: accName.get(d.accountId) ?? null,
      categoryName: d.categoryId ? catName.get(d.categoryId) ?? null : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /api/drafts:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch drafts' }, { status: 500 });
  }
}
