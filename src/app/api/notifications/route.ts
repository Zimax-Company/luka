import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';

const prisma = createPrismaClient();

// GET /api/notifications?page=&pageSize=&unreadOnly= — the actor's notifications.
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) {
      return NextResponse.json({ success: false, error: 'Not identified' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10) || 20));
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const where = { recipientId: actor.id, ...(unreadOnly ? { readAt: null } : {}) };

    const [rows, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { recipientId: actor.id, readAt: null } }),
    ]);

    return NextResponse.json({
      success: true,
      data: rows,
      unreadCount,
      pagination: { page, pageSize, total, hasNextPage: page * pageSize < total },
    });
  } catch (error) {
    console.error('Error in GET /api/notifications:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST /api/notifications — mark notifications read for the actor.
// Body: { ids?: string[] } (omit ids → mark all read).
export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) {
      return NextResponse.json({ success: false, error: 'Not identified' }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const ids: string[] | undefined = Array.isArray(body?.ids) ? body.ids : undefined;

    await prisma.notification.updateMany({
      where: { recipientId: actor.id, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
      data: { readAt: new Date() },
    });

    const unreadCount = await prisma.notification.count({
      where: { recipientId: actor.id, readAt: null },
    });
    return NextResponse.json({ success: true, unreadCount });
  } catch (error) {
    console.error('Error in POST /api/notifications:', error);
    return NextResponse.json({ success: false, error: 'Failed to update notifications' }, { status: 500 });
  }
}
