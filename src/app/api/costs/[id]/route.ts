import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { canAccessAccount } from '@/lib/access';
import { recordAudit } from '@/lib/audit';
import { UpdateCostRequest } from '@/types/business';
import { mapCost } from '../route';

const prisma = createPrismaClient();

async function loadAuthorized(request: NextRequest, id: string) {
  const actor = await getActor(request);
  if (!actor) return { error: NextResponse.json({ success: false, error: 'Not identified' }, { status: 401 }) };
  const cost = await prisma.cost.findUnique({ where: { id } });
  if (!cost) return { error: NextResponse.json({ success: false, error: 'Cost not found' }, { status: 404 }) };
  if (!(await canAccessAccount(actor, cost.accountId))) {
    return { error: NextResponse.json({ success: false, error: 'No access to this cost' }, { status: 403 }) };
  }
  return { actor, cost };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error, cost } = await loadAuthorized(request, id);
    if (error) return error;
    return NextResponse.json({ success: true, data: mapCost(cost!) });
  } catch (e) {
    console.error('Error in GET /api/costs/[id]:', e);
    return NextResponse.json({ success: false, error: 'Failed to fetch cost' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error, actor, cost } = await loadAuthorized(request, id);
    if (error) return error;
    if (actor!.role === 'VIEWER') {
      return NextResponse.json({ success: false, error: 'Not permitted' }, { status: 403 });
    }

    const body: UpdateCostRequest = await request.json();
    const data: Record<string, unknown> = {};
    if (body.amount !== undefined) data.amount = body.amount;
    if (body.date !== undefined) data.date = new Date(body.date);
    if (body.category !== undefined) data.category = body.category;
    if (body.note !== undefined) data.note = body.note;

    const updated = await prisma.cost.update({ where: { id: cost!.id }, data });
    recordAudit(actor!, 'UPDATE', 'cost', updated.id, `Cost updated`);
    return NextResponse.json({ success: true, data: mapCost(updated) });
  } catch (e) {
    console.error('Error in PUT /api/costs/[id]:', e);
    return NextResponse.json({ success: false, error: 'Failed to update cost' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error, actor, cost } = await loadAuthorized(request, id);
    if (error) return error;
    if (actor!.role === 'VIEWER') {
      return NextResponse.json({ success: false, error: 'Not permitted' }, { status: 403 });
    }
    await prisma.cost.delete({ where: { id: cost!.id } });
    recordAudit(actor!, 'DELETE', 'cost', cost!.id, `Cost deleted`);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error in DELETE /api/costs/[id]:', e);
    return NextResponse.json({ success: false, error: 'Failed to delete cost' }, { status: 500 });
  }
}
