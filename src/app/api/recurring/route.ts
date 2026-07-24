import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { getAccessibleAccountIds, canAccessAccount } from '@/lib/access';
import { recordAudit } from '@/lib/audit';
import { Cadence, firstRunOnOrAfter, lagosToday } from '@/lib/schedule';

const prisma = createPrismaClient();
const CADENCES: Cadence[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];

// GET /api/recurring — schedules for accounts the user can access.
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ success: false, error: 'Not identified' }, { status: 401 });
    const accessibleIds = await getAccessibleAccountIds(actor);
    if (accessibleIds.length === 0) return NextResponse.json({ success: true, data: [] });

    const templates = await prisma.recurringTemplate.findMany({
      where: { accountId: { in: accessibleIds } },
      orderBy: [{ active: 'desc' }, { nextRunOn: 'asc' }],
    });
    const accountIds = Array.from(new Set(templates.map(t => t.accountId)));
    const categoryIds = Array.from(new Set(templates.map(t => t.categoryId)));
    const [accounts, categories] = await Promise.all([
      prisma.account.findMany({ where: { id: { in: accountIds } }, select: { id: true, name: true } }),
      prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } }),
    ]);
    const accName = new Map(accounts.map(a => [a.id, a.name]));
    const catName = new Map(categories.map(c => [c.id, c.name]));

    const data = templates.map(t => ({
      ...t,
      amount: t.amount == null ? null : Number(t.amount),
      accountName: accName.get(t.accountId) ?? null,
      categoryName: catName.get(t.categoryId) ?? null,
    }));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /api/recurring:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch schedules' }, { status: 500 });
  }
}

// POST /api/recurring — create a schedule.
// Body: { accountId, categoryId, amount?, note?, cadence, dayOfMonth?, dayOfWeek?, autoPost? }
export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor || actor.role === 'VIEWER') {
      return NextResponse.json({ success: false, error: 'Not permitted' }, { status: 403 });
    }
    const body = await request.json();
    const { accountId, categoryId, amount, note, cadence, dayOfMonth, dayOfWeek, autoPost } = body ?? {};

    if (!accountId || !categoryId || !CADENCES.includes(cadence)) {
      return NextResponse.json(
        { success: false, error: 'accountId, categoryId and a valid cadence are required' },
        { status: 400 },
      );
    }
    if (!(await canAccessAccount(actor, accountId))) {
      return NextResponse.json({ success: false, error: 'No access to this account' }, { status: 403 });
    }
    const category = await prisma.category.findFirst({
      where: { id: categoryId, accountId },
      select: { type: true, name: true },
    });
    if (!category) {
      return NextResponse.json({ success: false, error: 'Category not found on this account' }, { status: 400 });
    }

    const nextRunOn = firstRunOnOrAfter(lagosToday(), cadence, dayOfMonth ?? null, dayOfWeek ?? null);

    const created = await prisma.recurringTemplate.create({
      data: {
        customerId: actor.customerId ?? null,
        accountId,
        categoryId,
        type: category.type,
        amount: amount != null && amount !== '' ? Number(amount) : null,
        note: note?.trim() || null,
        cadence,
        dayOfMonth: cadence === 'MONTHLY' ? dayOfMonth ?? null : null,
        dayOfWeek: cadence === 'WEEKLY' ? dayOfWeek ?? null : null,
        autoPost: !!autoPost,
        active: true,
        nextRunOn,
        createdById: actor.id,
      },
    });

    recordAudit(actor, 'CREATE', 'account', accountId, `Scheduled ${cadence.toLowerCase()} "${category.name}"`);
    return NextResponse.json({ success: true, data: { ...created, amount: created.amount == null ? null : Number(created.amount) } }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/recurring:', error);
    return NextResponse.json({ success: false, error: 'Failed to create schedule' }, { status: 500 });
  }
}
