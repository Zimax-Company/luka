import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { hashPassword, isBackofficeRequest } from '@/lib/backoffice';

const prisma = createPrismaClient();

// GET /api/backoffice/users — list back-office admin accounts.
export async function GET(request: NextRequest) {
  if (!isBackofficeRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const users = await prisma.backofficeUser.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({
    success: true,
    data: users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })),
  });
}

// POST /api/backoffice/users — create a back-office admin. { name, email, password }
export async function POST(request: NextRequest) {
  if (!isBackofficeRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let name: string | undefined;
  let email: string | undefined;
  let password: string | undefined;
  try {
    const body = await request.json();
    name = body?.name?.trim();
    email = body?.email?.trim()?.toLowerCase();
    password = body?.password;
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  if (!name || !email || !password) {
    return NextResponse.json(
      { success: false, error: 'name, email and password are required' },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { success: false, error: 'Password must be at least 8 characters' },
      { status: 400 },
    );
  }

  const existing = await prisma.backofficeUser.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ success: false, error: 'Email already in use' }, { status: 409 });
  }

  const user = await prisma.backofficeUser.create({
    data: { name, email, password: hashPassword(password) },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return NextResponse.json(
    { success: true, data: { ...user, createdAt: user.createdAt.toISOString() } },
    { status: 201 },
  );
}
