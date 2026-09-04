import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { isBackofficeRequest } from '@/lib/backoffice';

const prisma = createPrismaClient();

// GET /api/backoffice/customers — every customer (tenant) with basic usage:
// users (sign-ups), entries, accounts and their type breakdown.
export async function GET(request: NextRequest) {
  if (!isBackofficeRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [customers, userGroups, acctTypeGroups, accounts, entryGroups] = await Promise.all([
      prisma.customer.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.user.groupBy({ by: ['customerId'], where: { isActive: true }, _count: { _all: true } }),
      prisma.account.groupBy({
        by: ['customerId', 'type'],
        where: { isActive: true },
        _count: { _all: true },
      }),
      prisma.account.findMany({ where: { isActive: true }, select: { id: true, customerId: true } }),
      prisma.entry.groupBy({ by: ['accountId'], _count: { _all: true } }),
    ]);

    // users per customer
    const usersByCustomer = new Map<string, number>();
    for (const g of userGroups) if (g.customerId) usersByCustomer.set(g.customerId, g._count._all);

    // accounts + type breakdown per customer
    const accountsByCustomer = new Map<string, number>();
    const typesByCustomer = new Map<string, Record<string, number>>();
    for (const g of acctTypeGroups) {
      if (!g.customerId) continue;
      accountsByCustomer.set(g.customerId, (accountsByCustomer.get(g.customerId) ?? 0) + g._count._all);
      const t = typesByCustomer.get(g.customerId) ?? {};
      t[g.type] = (t[g.type] ?? 0) + g._count._all;
      typesByCustomer.set(g.customerId, t);
    }

    // entries per customer (entries -> account -> customer)
    const entriesByAccount = new Map<string, number>();
    for (const g of entryGroups) entriesByAccount.set(g.accountId, g._count._all);
    const entriesByCustomer = new Map<string, number>();
    for (const a of accounts) {
      if (!a.customerId) continue;
      entriesByCustomer.set(
        a.customerId,
        (entriesByCustomer.get(a.customerId) ?? 0) + (entriesByAccount.get(a.id) ?? 0),
      );
    }

    const data = customers.map(c => ({
      id: c.id,
      name: c.name,
      rootEmail: c.rootEmail,
      plan: c.plan,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      usage: {
        users: usersByCustomer.get(c.id) ?? 0,
        accounts: accountsByCustomer.get(c.id) ?? 0,
        entries: entriesByCustomer.get(c.id) ?? 0,
        accountsByType: typesByCustomer.get(c.id) ?? {},
      },
    }));

    return NextResponse.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('Error in GET /api/backoffice/customers:', error);
    return NextResponse.json({ success: false, error: 'Failed to load customers' }, { status: 500 });
  }
}
