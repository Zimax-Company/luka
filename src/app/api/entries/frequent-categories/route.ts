import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { canAccessAccount } from '@/lib/access';

const prisma = createPrismaClient();

// GET /api/entries/frequent-categories?accountId=&type=INCOME|EXPENSE&limit=
// Categories for an account ranked by how often they've been used (entry count),
// so the quick-pick chips reflect real usage rather than DB/creation order.
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const type = searchParams.get('type'); // optional INCOME|EXPENSE
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '8', 10) || 8, 1), 20);

    if (!accountId) {
      return NextResponse.json({ success: false, error: 'accountId is required' }, { status: 400 });
    }
    if (!(await canAccessAccount(actor, accountId))) {
      return NextResponse.json({ success: false, error: 'No access to this account' }, { status: 403 });
    }

    // Count entries per category for this account.
    const grouped = await prisma.entry.groupBy({
      by: ['categoryId'],
      where: { accountId },
      _count: { _all: true },
    });
    const countById = new Map(grouped.map(g => [g.categoryId, g._count._all]));

    const categories = await prisma.category.findMany({
      where: { accountId, ...(type === 'INCOME' || type === 'EXPENSE' ? { type } : {}) },
      select: { id: true, name: true, type: true },
    });

    const ranked = categories
      .map(c => ({ ...c, count: countById.get(c.id) ?? 0 }))
      // Most-used first; unused categories fall to the end alphabetically.
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, limit);

    return NextResponse.json({ success: true, data: ranked });
  } catch (error) {
    console.error('Error in GET /api/entries/frequent-categories:', error);
    return NextResponse.json({ success: false, error: 'Failed to load frequent categories' }, { status: 500 });
  }
}
