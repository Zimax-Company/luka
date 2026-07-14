import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';

const prisma = createPrismaClient();

// GET /api/audit — audit trail for the caller's billable account. ADMIN only.
// Paginated via ?page=&pageSize=.
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (actor.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only admins can view the audit trail' },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '25', 10) || 25));

    // Scope to the caller's billable account.
    const where = { customerId: actor.customerId ?? undefined };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    return NextResponse.json({
      success: true,
      data: logs.map(l => ({
        id: l.id,
        actorEmail: l.actorEmail,
        action: l.action,
        resource: l.resource,
        resourceId: l.resourceId,
        summary: l.summary,
        createdAt: l.createdAt.toISOString(),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/audit:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch audit trail' }, { status: 500 });
  }
}
