import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { canAccessAccount } from '@/lib/access';
import { ProfitAndLoss } from '@/types/business';

const prisma = createPrismaClient();

// GET /api/pnl?accountId=&startDate=&endDate=
// Lean profit & loss: revenue (non-cancelled orders) − costs.
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ success: false, error: 'Not identified' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!accountId) {
      return NextResponse.json({ success: false, error: 'accountId is required' }, { status: 400 });
    }
    if (!(await canAccessAccount(actor, accountId))) {
      return NextResponse.json({ success: false, error: 'No access to this account' }, { status: 403 });
    }

    const dateFilter =
      startDate && endDate ? { date: { gte: new Date(startDate), lte: new Date(endDate) } } : {};

    const [orders, costRows] = await Promise.all([
      prisma.order.findMany({
        where: { accountId, ...dateFilter },
        select: { amount: true, status: true },
      }),
      prisma.cost.findMany({
        where: { accountId, ...dateFilter },
        select: { amount: true },
      }),
    ]);

    let paidRevenue = 0;
    let pendingRevenue = 0;
    for (const o of orders) {
      if (o.status === 'PAID') paidRevenue += Number(o.amount);
      else if (o.status === 'PENDING') pendingRevenue += Number(o.amount);
    }
    const revenue = paidRevenue + pendingRevenue;
    const costs = costRows.reduce((sum, c) => sum + Number(c.amount), 0);

    const pnl: ProfitAndLoss = {
      accountId,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      revenue,
      paidRevenue,
      pendingRevenue,
      costs,
      profit: revenue - costs,
      orderCount: orders.length,
      costCount: costRows.length,
    };

    return NextResponse.json({ success: true, data: pnl });
  } catch (error) {
    console.error('Error in GET /api/pnl:', error);
    return NextResponse.json({ success: false, error: 'Failed to compute P&L' }, { status: 500 });
  }
}
