import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { canAccessAccount } from '@/lib/access';

const prisma = createPrismaClient();

// POST /api/drafts/[id]/dismiss — drop a draft without recording an entry.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await getActor(request);
    if (!actor || actor.role === 'VIEWER') {
      return NextResponse.json({ success: false, error: 'Not permitted' }, { status: 403 });
    }
    const draft = await prisma.draftEntry.findUnique({ where: { id } });
    if (!draft) return NextResponse.json({ success: false, error: 'Draft not found' }, { status: 404 });
    if (!(await canAccessAccount(actor, draft.accountId))) {
      return NextResponse.json({ success: false, error: 'No access to this account' }, { status: 403 });
    }
    await prisma.draftEntry.update({ where: { id }, data: { status: 'DISMISSED' } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error dismissing draft:', error);
    return NextResponse.json({ success: false, error: 'Failed to dismiss draft' }, { status: 500 });
  }
}
