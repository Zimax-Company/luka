import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { getAccessibleAccountIds, canAccessAccount } from '@/lib/access';
import { resolveHandle } from '@/lib/handle';
import { recordAudit } from '@/lib/audit';
import { notifyTransferCreated } from '@/lib/notify';
import { PrismaEntryService } from '@/services/prismaEntryService';

const prisma = createPrismaClient();

// GET /api/transfers?box=incoming|outgoing&status=PENDING|ACCEPTED|REJECTED|all
// incoming (default) → transfers TO accounts you can access; outgoing → FROM.
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ success: false, error: 'Not identified' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const box = searchParams.get('box') === 'outgoing' ? 'outgoing' : 'incoming';
    const statusParam = searchParams.get('status');

    const accessibleIds = await getAccessibleAccountIds(actor);
    const status = statusParam && statusParam !== 'all' ? statusParam : box === 'incoming' && !statusParam ? 'PENDING' : undefined;

    const where = {
      ...(box === 'outgoing'
        ? { fromAccountId: { in: accessibleIds } }
        : { toAccountId: { in: accessibleIds } }),
      ...(status ? { status } : {}),
    };

    const transfers = await prisma.transfer.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });

    // Enrich with the counterparty account name/handle.
    const ids = Array.from(new Set(transfers.flatMap(t => [t.fromAccountId, t.toAccountId])));
    const accounts = await prisma.account.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, handle: true } });
    const byId = new Map(accounts.map(a => [a.id, a]));

    const data = transfers.map(t => ({
      ...t,
      amount: Number(t.amount),
      fromAccountName: t.fromAccountName ?? byId.get(t.fromAccountId)?.name ?? null,
      fromHandle: byId.get(t.fromAccountId)?.handle ?? null,
      toAccountName: byId.get(t.toAccountId)?.name ?? null,
      toHandle: t.toHandle ?? byId.get(t.toAccountId)?.handle ?? null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /api/transfers:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch transfers' }, { status: 500 });
  }
}

// POST /api/transfers — send a transfer. Records the sender's EXPENSE now and
// queues a PENDING transfer for the recipient to accept.
// Body: { fromAccountId, categoryId, amount, date, note?, toHandle }
export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor || actor.role === 'VIEWER') {
      return NextResponse.json({ success: false, error: 'Not permitted to send transfers' }, { status: 403 });
    }

    const body = await request.json();
    const { fromAccountId, categoryId, amount, date, note, toHandle } = body ?? {};
    if (!fromAccountId || !categoryId || amount === undefined || !date || !toHandle) {
      return NextResponse.json(
        { success: false, error: 'fromAccountId, categoryId, amount, date and toHandle are required' },
        { status: 400 },
      );
    }
    if (!(await canAccessAccount(actor, fromAccountId))) {
      return NextResponse.json({ success: false, error: 'No access to the source account' }, { status: 403 });
    }

    const to = await resolveHandle(String(toHandle));
    if (!to) {
      return NextResponse.json({ success: false, error: `No account found for @${String(toHandle).replace(/^@/, '')}` }, { status: 404 });
    }
    if (to.id === fromAccountId) {
      return NextResponse.json({ success: false, error: 'Cannot transfer to the same account' }, { status: 400 });
    }

    const from = await prisma.account.findUnique({ where: { id: fromAccountId }, select: { name: true } });

    // 1) Record the sender's expense immediately.
    const expenseEntry = await PrismaEntryService.create({
      accountId: fromAccountId,
      categoryId,
      amount,
      date,
      note: note?.trim() || `Transfer to @${to.handle}`,
    });

    // 2) Queue the pending transfer for the recipient.
    const transfer = await prisma.transfer.create({
      data: {
        fromAccountId,
        toAccountId: to.id,
        fromEntryId: expenseEntry.id,
        amount,
        note: note?.trim() || null,
        date: new Date(date),
        status: 'PENDING',
        senderId: actor.id,
        senderName: actor.name,
        fromAccountName: from?.name ?? null,
        toHandle: to.handle,
      },
    });

    recordAudit(actor, 'CREATE', 'transfer', transfer.id, `Posted ${Number(amount)} to @${to.handle}`);
    void notifyTransferCreated(actor, {
      id: transfer.id,
      toAccountId: to.id,
      amount,
      toHandle: to.handle,
      senderName: actor.name,
    });

    return NextResponse.json({ success: true, data: { ...transfer, amount: Number(transfer.amount) } }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/transfers:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to send transfer' },
      { status: 500 },
    );
  }
}
