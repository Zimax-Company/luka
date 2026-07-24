import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { canAccessAccount } from '@/lib/access';
import { Cadence, firstRunOnOrAfter, lagosToday } from '@/lib/schedule';

const prisma = createPrismaClient();
const CADENCES: Cadence[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];

// PUT /api/recurring/[id] — update a schedule (amount/note/cadence/day/autoPost/active).
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await getActor(request);
    if (!actor || actor.role === 'VIEWER') {
      return NextResponse.json({ success: false, error: 'Not permitted' }, { status: 403 });
    }
    const existing = await prisma.recurringTemplate.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    if (!(await canAccessAccount(actor, existing.accountId))) {
      return NextResponse.json({ success: false, error: 'No access' }, { status: 403 });
    }

    const body = await request.json();
    const data: Prisma.RecurringTemplateUncheckedUpdateInput = {};
    if (body.amount !== undefined) data.amount = body.amount === null || body.amount === '' ? null : Number(body.amount);
    if (body.note !== undefined) data.note = body.note?.trim() || null;
    if (body.autoPost !== undefined) data.autoPost = !!body.autoPost;
    if (body.active !== undefined) data.active = !!body.active;

    // Changing cadence/day recomputes the next run date.
    const cadence: Cadence = CADENCES.includes(body.cadence) ? body.cadence : (existing.cadence as Cadence);
    const cadenceChanged = body.cadence !== undefined || body.dayOfMonth !== undefined || body.dayOfWeek !== undefined;
    if (body.cadence !== undefined && CADENCES.includes(body.cadence)) data.cadence = body.cadence;
    if (body.dayOfMonth !== undefined) data.dayOfMonth = cadence === 'MONTHLY' ? body.dayOfMonth ?? null : null;
    if (body.dayOfWeek !== undefined) data.dayOfWeek = cadence === 'WEEKLY' ? body.dayOfWeek ?? null : null;
    if (cadenceChanged) {
      data.nextRunOn = firstRunOnOrAfter(
        lagosToday(),
        cadence,
        (body.dayOfMonth ?? existing.dayOfMonth) ?? null,
        (body.dayOfWeek ?? existing.dayOfWeek) ?? null,
      );
    }

    const updated = await prisma.recurringTemplate.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: { ...updated, amount: updated.amount == null ? null : Number(updated.amount) } });
  } catch (error) {
    console.error('Error in PUT /api/recurring/[id]:', error);
    return NextResponse.json({ success: false, error: 'Failed to update schedule' }, { status: 500 });
  }
}

// DELETE /api/recurring/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await getActor(request);
    if (!actor || actor.role === 'VIEWER') {
      return NextResponse.json({ success: false, error: 'Not permitted' }, { status: 403 });
    }
    const existing = await prisma.recurringTemplate.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    if (!(await canAccessAccount(actor, existing.accountId))) {
      return NextResponse.json({ success: false, error: 'No access' }, { status: 403 });
    }
    await prisma.recurringTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/recurring/[id]:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete schedule' }, { status: 500 });
  }
}
