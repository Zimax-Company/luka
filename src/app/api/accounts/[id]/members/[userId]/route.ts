import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { recordAudit } from '@/lib/audit';

const prisma = createPrismaClient();

// DELETE /api/accounts/[id]/members/[userId] — revoke a user's access. Admin only.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const { id, userId } = await params;
    const actor = await getActor(request);
    if (!actor || actor.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
    }

    const account = await prisma.account.findUnique({ where: { id }, select: { id: true, name: true, customerId: true } });
    if (!account) return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    if (account.customerId && account.customerId !== actor.customerId) {
      return NextResponse.json({ success: false, error: 'Account not in your customer' }, { status: 403 });
    }

    const result = await prisma.accountAccess.deleteMany({ where: { accountId: id, userId } });
    if (result.count > 0) {
      recordAudit(actor, 'UPDATE', 'account', id, `Revoked user ${userId} access to "${account.name}"`);
    }

    return NextResponse.json({ success: true, message: 'Access revoked' });
  } catch (error) {
    console.error('Error in DELETE /api/accounts/[id]/members/[userId]:', error);
    return NextResponse.json({ success: false, error: 'Failed to revoke access' }, { status: 500 });
  }
}
