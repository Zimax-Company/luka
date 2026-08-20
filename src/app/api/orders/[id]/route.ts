import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { canAccessAccount } from '@/lib/access';
import { recordAudit } from '@/lib/audit';
import { UpdateOrderRequest, OrderStatus } from '@/types/business';
import { mapOrder } from '../route';

const prisma = createPrismaClient();
const VALID_STATUS: OrderStatus[] = ['PAID', 'PENDING', 'CANCELLED'];

async function loadAuthorized(request: NextRequest, id: string) {
  const actor = await getActor(request);
  if (!actor) return { error: NextResponse.json({ success: false, error: 'Not identified' }, { status: 401 }) };
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return { error: NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 }) };
  if (!(await canAccessAccount(actor, order.accountId))) {
    return { error: NextResponse.json({ success: false, error: 'No access to this order' }, { status: 403 }) };
  }
  return { actor, order };
}

// GET /api/orders/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error, order } = await loadAuthorized(request, id);
    if (error) return error;
    return NextResponse.json({ success: true, data: mapOrder(order!) });
  } catch (e) {
    console.error('Error in GET /api/orders/[id]:', e);
    return NextResponse.json({ success: false, error: 'Failed to fetch order' }, { status: 500 });
  }
}

// PUT /api/orders/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error, actor, order } = await loadAuthorized(request, id);
    if (error) return error;
    if (actor!.role === 'VIEWER') {
      return NextResponse.json({ success: false, error: 'Not permitted' }, { status: 403 });
    }

    const body: UpdateOrderRequest = await request.json();
    const data: Record<string, unknown> = {};
    if (body.amount !== undefined) data.amount = body.amount;
    if (body.date !== undefined) data.date = new Date(body.date);
    if (body.reference !== undefined) data.reference = body.reference;
    if (body.customerName !== undefined) data.customerName = body.customerName;
    if (body.note !== undefined) data.note = body.note;
    if (body.status !== undefined && VALID_STATUS.includes(body.status)) data.status = body.status;

    const updated = await prisma.order.update({ where: { id: order!.id }, data });
    recordAudit(actor!, 'UPDATE', 'order', updated.id, `Order updated (${updated.status})`);
    return NextResponse.json({ success: true, data: mapOrder(updated) });
  } catch (e) {
    console.error('Error in PUT /api/orders/[id]:', e);
    return NextResponse.json({ success: false, error: 'Failed to update order' }, { status: 500 });
  }
}

// DELETE /api/orders/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error, actor, order } = await loadAuthorized(request, id);
    if (error) return error;
    if (actor!.role === 'VIEWER') {
      return NextResponse.json({ success: false, error: 'Not permitted' }, { status: 403 });
    }
    await prisma.order.delete({ where: { id: order!.id } });
    recordAudit(actor!, 'DELETE', 'order', order!.id, `Order deleted`);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error in DELETE /api/orders/[id]:', e);
    return NextResponse.json({ success: false, error: 'Failed to delete order' }, { status: 500 });
  }
}
