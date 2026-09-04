import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { isBackofficeRequest } from '@/lib/backoffice';

const prisma = createPrismaClient();

// GET /api/backoffice/customers/[id] — one customer with subscription history,
// its users, its accounts (with types), and usage counts.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isBackofficeRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    const [events, users, accounts] = await Promise.all([
      prisma.subscriptionEvent.findMany({ where: { customerId: id }, orderBy: { createdAt: 'desc' } }),
      prisma.user.findMany({
        where: { customerId: id, isActive: true },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.account.findMany({
        where: { customerId: id, isActive: true },
        select: { id: true, name: true, type: true, mode: true, currency: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const accountIds = accounts.map(a => a.id);
    const entryCount = accountIds.length
      ? await prisma.entry.count({ where: { accountId: { in: accountIds } } })
      : 0;

    const accountsByType: Record<string, number> = {};
    for (const a of accounts) accountsByType[a.type] = (accountsByType[a.type] ?? 0) + 1;

    return NextResponse.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          name: customer.name,
          rootEmail: customer.rootEmail,
          plan: customer.plan,
          status: customer.status,
          createdAt: customer.createdAt.toISOString(),
        },
        usage: {
          users: users.length,
          accounts: accounts.length,
          entries: entryCount,
          accountsByType,
        },
        users: users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt.toISOString(),
        })),
        accounts: accounts.map(a => ({
          id: a.id,
          name: a.name,
          type: a.type,
          mode: a.mode,
          currency: a.currency,
          createdAt: a.createdAt.toISOString(),
        })),
        subscription: {
          plan: customer.plan,
          status: customer.status,
          history: events.map(e => ({
            id: e.id,
            plan: e.plan,
            type: e.type,
            amount: e.amount != null ? Number(e.amount) : null,
            currency: e.currency,
            note: e.note,
            createdAt: e.createdAt.toISOString(),
          })),
        },
      },
    });
  } catch (error) {
    console.error('Error in GET /api/backoffice/customers/[id]:', error);
    return NextResponse.json({ success: false, error: 'Failed to load customer' }, { status: 500 });
  }
}
