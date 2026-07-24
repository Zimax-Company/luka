import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { canAccessAccount, getCategoryAccountId } from '@/lib/access';

const prisma = createPrismaClient();

// DELETE /api/categories/[id]/items/[itemId] — remove a catalog item.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const { id, itemId } = await params;
    const actor = await getActor(request);
    if (!actor || actor.role === 'VIEWER') {
      return NextResponse.json({ success: false, error: 'Not permitted' }, { status: 403 });
    }
    const accountId = await getCategoryAccountId(id);
    if (!accountId || !(await canAccessAccount(actor, accountId))) {
      return NextResponse.json({ success: false, error: 'No access to this category' }, { status: 403 });
    }
    await prisma.categoryItem.deleteMany({ where: { id: itemId, categoryId: id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category item:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete item' }, { status: 500 });
  }
}
