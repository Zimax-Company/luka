import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { canAccessAccount } from '@/lib/access';
import { recordAudit } from '@/lib/audit';
import { notifyEntryChange } from '@/lib/notify';
import { invalidateCategoryModel } from '@/lib/categorizeStore';
import { PrismaEntryService } from '@/services/prismaEntryService';

const prisma = createPrismaClient();

// POST /api/drafts/[id]/approve — turn a draft into a real entry.
// Body (optional overrides): { categoryId, amount, note }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await getActor(request);
    if (!actor || actor.role === 'VIEWER') {
      return NextResponse.json({ success: false, error: 'Not permitted' }, { status: 403 });
    }

    const draft = await prisma.draftEntry.findUnique({ where: { id } });
    if (!draft) return NextResponse.json({ success: false, error: 'Draft not found' }, { status: 404 });
    if (draft.status !== 'PENDING') {
      return NextResponse.json({ success: false, error: 'Draft already handled' }, { status: 400 });
    }
    if (!(await canAccessAccount(actor, draft.accountId))) {
      return NextResponse.json({ success: false, error: 'No access to this account' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const categoryId: string | undefined = body?.categoryId ?? draft.categoryId ?? undefined;
    const amount = body?.amount != null ? Number(body.amount) : draft.amount != null ? Number(draft.amount) : undefined;
    const note: string | undefined = body?.note ?? draft.note ?? undefined;

    if (!categoryId) {
      return NextResponse.json({ success: false, error: 'A category is required to approve' }, { status: 400 });
    }
    if (amount == null || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'A valid amount is required to approve' }, { status: 400 });
    }

    const entry = await PrismaEntryService.create({
      accountId: draft.accountId,
      categoryId,
      amount,
      date: draft.date.toISOString().slice(0, 10),
      note: note ?? '',
    });

    await prisma.draftEntry.update({ where: { id }, data: { status: 'APPROVED' } });

    recordAudit(actor, 'CREATE', 'entry', entry.id, `Approved draft ${Number(amount)} · ${entry.category?.name ?? ''}`);
    void notifyEntryChange(actor, 'CREATE', entry as never);
    invalidateCategoryModel(draft.accountId);

    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error) {
    console.error('Error approving draft:', error);
    return NextResponse.json({ success: false, error: 'Failed to approve draft' }, { status: 500 });
  }
}
