import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { getAccessibleAccountIds, canAccessAccount } from '@/lib/access';
import { recordAudit } from '@/lib/audit';
import { CreateOrderRequest, OrderStatus } from '@/types/business';

const prisma = createPrismaClient();

const VALID_STATUS: OrderStatus[] = ['PAID', 'PENDING', 'CANCELLED'];

// Serialize a Prisma order row for the API (Decimal → number, Date → ISO date).
export function mapOrder(o: {
  id: string;
  accountId: string;
  customerId: string | null;
  reference: string | null;
  customerName: string | null;
  date: Date;
  amount: unknown;
  status: string;
  note: string | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: o.id,
    accountId: o.accountId,
    customerId: o.customerId,
    reference: o.reference,
    customerName: o.customerName,
    date: o.date.toISOString().slice(0, 10),
    amount: Number(o.amount),
    status: o.status as OrderStatus,
    note: o.note,
    createdById: o.createdById,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

// GET /api/orders?accountId=&startDate=&endDate=&status=&search=
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ success: false, error: 'Not identified' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const accessibleIds = await getAccessibleAccountIds(actor);
    // Scope: a specific (accessible) account, or all accessible accounts.
    const scopeIds =
      accountId && accessibleIds.includes(accountId) ? [accountId] : accountId ? [] : accessibleIds;

    const where: Record<string, unknown> = { accountId: { in: scopeIds } };
    if (status && VALID_STATUS.includes(status as OrderStatus)) where.status = status;
    if (startDate && endDate) {
      where.date = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    let orders = await prisma.order.findMany({ where, orderBy: { date: 'desc' }, take: 500 });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      orders = orders.filter(
        o =>
          (o.reference ?? '').toLowerCase().includes(q) ||
          (o.customerName ?? '').toLowerCase().includes(q) ||
          (o.note ?? '').toLowerCase().includes(q),
      );
    }

    return NextResponse.json({ success: true, data: orders.map(mapOrder), count: orders.length });
  } catch (error) {
    console.error('Error in GET /api/orders:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}

// POST /api/orders — create an order (revenue). Body: CreateOrderRequest
export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor || actor.role === 'VIEWER') {
      return NextResponse.json({ success: false, error: 'Not permitted to create orders' }, { status: 403 });
    }

    const body: CreateOrderRequest = await request.json();
    if (!body.accountId || body.amount === undefined || body.amount === null || !body.date) {
      return NextResponse.json(
        { success: false, error: 'accountId, amount and date are required' },
        { status: 400 },
      );
    }
    if (!(await canAccessAccount(actor, body.accountId))) {
      return NextResponse.json({ success: false, error: 'No access to this account' }, { status: 403 });
    }

    const status: OrderStatus = VALID_STATUS.includes(body.status as OrderStatus)
      ? (body.status as OrderStatus)
      : 'PAID';

    // Stamp the account's customer for tenant scoping.
    const account = await prisma.account.findUnique({
      where: { id: body.accountId },
      select: { customerId: true },
    });

    const order = await prisma.order.create({
      data: {
        accountId: body.accountId,
        customerId: account?.customerId ?? actor.customerId ?? null,
        reference: body.reference ?? null,
        customerName: body.customerName ?? null,
        date: new Date(body.date),
        amount: body.amount,
        status,
        note: body.note ?? null,
        createdById: actor.id,
      },
    });

    recordAudit(actor, 'CREATE', 'order', order.id, `Order ${Number(order.amount)} (${status})`);

    return NextResponse.json({ success: true, data: mapOrder(order) }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/orders:', error);
    return NextResponse.json({ success: false, error: 'Failed to create order' }, { status: 500 });
  }
}
