import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { canAccessAccount } from '@/lib/access';
import { recordAudit } from '@/lib/audit';
import { notifyTransferDecided } from '@/lib/notify';
import { PrismaEntryService } from '@/services/prismaEntryService';

const prisma = createPrismaClient();

// POST /api/transfers/[id]/accept — recipient accepts; records the INCOME entry.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await getActor(request);
    if (!actor || actor.role === 'VIEWER') {
      return NextResponse.json({ success: false, error: 'Not permitted' }, { status: 403 });
    }

    const transfer = await prisma.transfer.findUnique({ where: { id } });
    if (!transfer) return NextResponse.json({ success: false, error: 'Transfer not found' }, { status: 404 });
    if (transfer.status !== 'PENDING') {
      return NextResponse.json({ success: false, error: 'Transfer already decided' }, { status: 400 });
    }
    if (!(await canAccessAccount(actor, transfer.toAccountId))) {
      return NextResponse.json({ success: false, error: 'No access to the receiving account' }, { status: 403 });
    }

    // Find or create a "Transfers" income category on the receiving account.
    let category = await prisma.category.findFirst({
      where: { accountId: transfer.toAccountId, type: 'INCOME', name: 'Transfers' },
      select: { id: true },
    });
    if (!category) {
      category = await prisma.category.create({
        data: { accountId: transfer.toAccountId, name: 'Transfers', type: 'INCOME' },
        select: { id: true },
      });
    }

    const incomeEntry = await PrismaEntryService.create({
      accountId: transfer.toAccountId,
      categoryId: category.id,
      amount: Number(transfer.amount),
      date: transfer.date.toISOString().slice(0, 10),
      note: `Transfer from ${transfer.fromAccountName ?? 'another account'}${transfer.note ? ` — ${transfer.note}` : ''}`,
    });

    const updated = await prisma.transfer.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        toEntryId: incomeEntry.id,
        decidedById: actor.id,
        decidedByName: actor.name,
        decidedAt: new Date(),
      },
    });

    recordAudit(actor, 'UPDATE', 'transfer', id, `Accepted ${Number(transfer.amount)} posting`);
    void notifyTransferDecided(
      actor,
      {
        id,
        senderId: transfer.senderId,
        fromAccountId: transfer.fromAccountId,
        amount: Number(transfer.amount),
        toAccountName: (await prisma.account.findUnique({ where: { id: transfer.toAccountId }, select: { name: true } }))?.name ?? null,
      },
      true,
    );

    return NextResponse.json({ success: true, data: { ...updated, amount: Number(updated.amount) } });
  } catch (error) {
    console.error('Error accepting transfer:', error);
    return NextResponse.json({ success: false, error: 'Failed to accept transfer' }, { status: 500 });
  }
}
