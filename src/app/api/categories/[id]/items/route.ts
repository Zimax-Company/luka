import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { canAccessAccount, getCategoryAccountId } from '@/lib/access';
import { recordAudit } from '@/lib/audit';

const prisma = createPrismaClient();

// GET /api/categories/[id]/items — the item catalog for a category.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await getActor(request);
    const accountId = await getCategoryAccountId(id);
    if (!accountId || !(await canAccessAccount(actor, accountId))) {
      return NextResponse.json({ success: false, error: 'No access to this category' }, { status: 403 });
    }
    const items = await prisma.categoryItem.findMany({ where: { categoryId: id }, orderBy: { name: 'asc' } });
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('Error in GET category items:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch items' }, { status: 500 });
  }
}

// POST /api/categories/[id]/items — add an item to the catalog. Body: { name }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await getActor(request);
    if (!actor || actor.role === 'VIEWER') {
      return NextResponse.json({ success: false, error: 'Not permitted' }, { status: 403 });
    }
    const accountId = await getCategoryAccountId(id);
    if (!accountId || !(await canAccessAccount(actor, accountId))) {
      return NextResponse.json({ success: false, error: 'No access to this category' }, { status: 403 });
    }
    const body = await request.json().catch(() => ({}));
    const name = (body?.name ?? '').trim();
    if (!name) return NextResponse.json({ success: false, error: 'Item name is required' }, { status: 400 });

    const existing = await prisma.categoryItem.findFirst({ where: { categoryId: id, name } });
    if (existing) return NextResponse.json({ success: true, data: existing });

    const item = await prisma.categoryItem.create({ data: { categoryId: id, name } });
    recordAudit(actor, 'CREATE', 'category', id, `Added item "${name}"`);
    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    console.error('Error in POST category items:', error);
    return NextResponse.json({ success: false, error: 'Failed to add item' }, { status: 500 });
  }
}
