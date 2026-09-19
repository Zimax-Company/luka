import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { getAccessibleAccountIds, canAccessAccount } from '@/lib/access';
import { recordAudit } from '@/lib/audit';
import { CreateCostRequest } from '@/types/business';

const prisma = createPrismaClient();

type CostRow = {
  id: string;
  accountId: string;
  customerId: string | null;
  categoryId: string | null;
  category: string | null;
  note: string | null;
  date: Date;
  amount: unknown;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
  categoryRef?: { name: string } | null;
};

export function mapCost(c: CostRow) {
  return {
    id: c.id,
    accountId: c.accountId,
    customerId: c.customerId,
    categoryId: c.categoryId,
    // Prefer the related category's name; fall back to the legacy free-text label.
    categoryName: c.categoryRef?.name ?? c.category ?? null,
    category: c.category,
    note: c.note,
    date: c.date.toISOString().slice(0, 10),
    amount: Number(c.amount),
    createdById: c.createdById,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

// Resolve a cost's category: prefer an explicit categoryId (validated against the
// account); otherwise find-or-create an EXPENSE Category from a provided name so
// business costs build the same category relationship as personal entries.
export async function resolveCostCategory(
  accountId: string,
  categoryId?: string | null,
  categoryName?: string | null,
): Promise<{ categoryId: string | null; category: string | null }> {
  if (categoryId) {
    const c = await prisma.category.findFirst({
      where: { id: categoryId, accountId },
      select: { id: true, name: true },
    });
    if (c) return { categoryId: c.id, category: c.name };
  }
  const name = (categoryName ?? '').trim();
  if (!name) return { categoryId: null, category: null };
  const cat = await prisma.category.upsert({
    where: { unique_account_name_type: { accountId, name, type: 'EXPENSE' } },
    update: {},
    create: { accountId, name, type: 'EXPENSE' },
    select: { id: true, name: true },
  });
  return { categoryId: cat.id, category: cat.name };
}

// GET /api/costs?accountId=&startDate=&endDate=&search=
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ success: false, error: 'Not identified' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    const accessibleIds = await getAccessibleAccountIds(actor);
    const scopeIds =
      accountId && accessibleIds.includes(accountId) ? [accountId] : accountId ? [] : accessibleIds;

    const where: Record<string, unknown> = { accountId: { in: scopeIds } };
    if (startDate && endDate) where.date = { gte: new Date(startDate), lte: new Date(endDate) };

    let costs = await prisma.cost.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 500,
      include: { categoryRef: { select: { name: true } } },
    });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      costs = costs.filter(
        c =>
          (c.categoryRef?.name ?? c.category ?? '').toLowerCase().includes(q) ||
          (c.note ?? '').toLowerCase().includes(q),
      );
    }

    return NextResponse.json({ success: true, data: costs.map(mapCost), count: costs.length });
  } catch (error) {
    console.error('Error in GET /api/costs:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch costs' }, { status: 500 });
  }
}

// POST /api/costs — create a cost/expenditure. Body: CreateCostRequest
export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor || actor.role === 'VIEWER') {
      return NextResponse.json({ success: false, error: 'Not permitted to create costs' }, { status: 403 });
    }

    const body: CreateCostRequest = await request.json();
    if (!body.accountId || body.amount === undefined || body.amount === null || !body.date) {
      return NextResponse.json(
        { success: false, error: 'accountId, amount and date are required' },
        { status: 400 },
      );
    }
    if (!(await canAccessAccount(actor, body.accountId))) {
      return NextResponse.json({ success: false, error: 'No access to this account' }, { status: 403 });
    }

    const account = await prisma.account.findUnique({
      where: { id: body.accountId },
      select: { customerId: true },
    });

    const { categoryId, category } = await resolveCostCategory(body.accountId, body.categoryId, body.category);

    const cost = await prisma.cost.create({
      data: {
        accountId: body.accountId,
        customerId: account?.customerId ?? actor.customerId ?? null,
        categoryId,
        category,
        note: body.note ?? null,
        date: new Date(body.date),
        amount: body.amount,
        createdById: actor.id,
      },
      include: { categoryRef: { select: { name: true } } },
    });

    recordAudit(actor, 'CREATE', 'cost', cost.id, `Cost ${Number(cost.amount)} ${category ?? ''}`.trim());

    return NextResponse.json({ success: true, data: mapCost(cost) }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/costs:', error);
    return NextResponse.json({ success: false, error: 'Failed to create cost' }, { status: 500 });
  }
}
