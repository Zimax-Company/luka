import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { getAccessibleAccountIds, canAccessAccount } from '@/lib/access';
import { recordAudit } from '@/lib/audit';
import { CreateCostRequest } from '@/types/business';

const prisma = createPrismaClient();

export function mapCost(c: {
  id: string;
  accountId: string;
  customerId: string | null;
  category: string | null;
  note: string | null;
  date: Date;
  amount: unknown;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: c.id,
    accountId: c.accountId,
    customerId: c.customerId,
    category: c.category,
    note: c.note,
    date: c.date.toISOString().slice(0, 10),
    amount: Number(c.amount),
    createdById: c.createdById,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
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

    let costs = await prisma.cost.findMany({ where, orderBy: { date: 'desc' }, take: 500 });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      costs = costs.filter(
        c => (c.category ?? '').toLowerCase().includes(q) || (c.note ?? '').toLowerCase().includes(q),
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

    const cost = await prisma.cost.create({
      data: {
        accountId: body.accountId,
        customerId: account?.customerId ?? actor.customerId ?? null,
        category: body.category ?? null,
        note: body.note ?? null,
        date: new Date(body.date),
        amount: body.amount,
        createdById: actor.id,
      },
    });

    recordAudit(actor, 'CREATE', 'cost', cost.id, `Cost ${Number(cost.amount)} ${cost.category ?? ''}`.trim());

    return NextResponse.json({ success: true, data: mapCost(cost) }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/costs:', error);
    return NextResponse.json({ success: false, error: 'Failed to create cost' }, { status: 500 });
  }
}
