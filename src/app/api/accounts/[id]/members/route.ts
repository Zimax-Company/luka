import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { recordAudit } from '@/lib/audit';

const prisma = createPrismaClient();

const userSelect = { id: true, name: true, email: true, role: true, isActive: true } as const;

// GET /api/accounts/[id]/members — who can access this account.
// Returns members (explicit grants), admins (implicit all-access), and — for
// admins only — the candidate users that could still be added.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ success: false, error: 'Not identified' }, { status: 401 });

    const account = await prisma.account.findUnique({
      where: { id },
      select: { id: true, name: true, customerId: true },
    });
    if (!account) return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });

    const isAdmin = actor.role === 'ADMIN' && (!account.customerId || account.customerId === actor.customerId);
    const isMember = !!(await prisma.accountAccess.findFirst({ where: { accountId: id, userId: actor.id } }));
    if (!isAdmin && !isMember) {
      return NextResponse.json({ success: false, error: 'No access to this account' }, { status: 403 });
    }

    const grants = await prisma.accountAccess.findMany({ where: { accountId: id }, select: { userId: true } });
    const grantedIds = grants.map(g => g.userId);

    const [members, admins] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: grantedIds } }, select: userSelect }),
      prisma.user.findMany({
        where: { customerId: account.customerId ?? undefined, role: 'ADMIN', isActive: true },
        select: userSelect,
      }),
    ]);

    let candidates: unknown[] = [];
    if (isAdmin) {
      candidates = await prisma.user.findMany({
        where: {
          customerId: account.customerId ?? undefined,
          role: { not: 'ADMIN' },
          isActive: true,
          id: { notIn: grantedIds.length ? grantedIds : ['__none__'] },
        },
        select: userSelect,
      });
    }

    return NextResponse.json({
      success: true,
      data: { account: { id: account.id, name: account.name }, members, admins, candidates, isAdmin },
    });
  } catch (error) {
    console.error('Error in GET /api/accounts/[id]/members:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch members' }, { status: 500 });
  }
}

// POST /api/accounts/[id]/members — grant a user access. Admin only.
// Body: { userId }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await getActor(request);
    if (!actor || actor.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
    }
    const body = await request.json().catch(() => ({}));
    const userId: string | undefined = body?.userId;
    if (!userId) return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });

    const account = await prisma.account.findUnique({ where: { id }, select: { id: true, name: true, customerId: true } });
    if (!account) return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    if (account.customerId && account.customerId !== actor.customerId) {
      return NextResponse.json({ success: false, error: 'Account not in your customer' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true, customerId: true } });
    if (!user || user.customerId !== account.customerId) {
      return NextResponse.json({ success: false, error: 'User not in this customer' }, { status: 400 });
    }
    if (user.role === 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admins already have access to all accounts' }, { status: 400 });
    }

    const existing = await prisma.accountAccess.findFirst({ where: { accountId: id, userId } });
    if (!existing) {
      await prisma.accountAccess.create({ data: { accountId: id, userId } });
      recordAudit(actor, 'UPDATE', 'account', id, `Granted ${user.name} access to "${account.name}"`);
    }

    return NextResponse.json({ success: true, message: 'Access granted' }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/accounts/[id]/members:', error);
    return NextResponse.json({ success: false, error: 'Failed to grant access' }, { status: 500 });
  }
}
