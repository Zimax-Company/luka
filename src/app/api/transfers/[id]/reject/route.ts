import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { canAccessAccount } from '@/lib/access';
import { recordAudit } from '@/lib/audit';
import { notifyTransferDecided } from '@/lib/notify';
import { PrismaEntryService } from '@/services/prismaEntryService';

const prisma = createPrismaClient();

// POST /api/transfers/[id]/reject — recipient rejects; reverses the sender's expense.
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

    // Reverse the sender's expense so both sets of books stay balanced.
    if (transfer.fromEntryId) {
      await PrismaEntryService.delete(transfer.fromEntryId);
    }

    const updated = await prisma.transfer.update({
      where: { id },
      data: {
        status: 'REJECTED',
        decidedById: actor.id,
        decidedByName: actor.name,
        decidedAt: new Date(),
      },
    });

    recordAudit(actor, 'UPDATE', 'transfer', id, `Rejected ${Number(transfer.amount)} posting (expense reversed)`);
    void notifyTransferDecided(
      actor,
      {
        id,
        senderId: transfer.senderId,
        fromAccountId: transfer.fromAccountId,
        amount: Number(transfer.amount),
        toAccountName: (await prisma.account.findUnique({ where: { id: transfer.toAccountId }, select: { name: true } }))?.name ?? null,
      },
      false,
    );

    return NextResponse.json({ success: true, data: { ...updated, amount: Number(updated.amount) } });
  } catch (error) {
    console.error('Error rejecting transfer:', error);
    return NextResponse.json({ success: false, error: 'Failed to reject transfer' }, { status: 500 });
  }
}
