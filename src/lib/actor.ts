import { NextRequest } from 'next/server';
import { createPrismaClient } from './prismaClient';

const prisma = createPrismaClient();

export interface Actor {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  customerId: string | null;
}

// The API has no server-side session, so the acting user is identified by the
// `x-user-id` header the clients attach (falls back to `x-user-email`). Used for
// the audit trail and for root/subscription checks. Returns null if unknown.
export async function getActor(request: NextRequest): Promise<Actor | null> {
  const id = request.headers.get('x-user-id');
  const email = request.headers.get('x-user-email');
  try {
    const user = id
      ? await prisma.user.findUnique({ where: { id } })
      : email
        ? await prisma.user.findUnique({ where: { email } })
        : null;
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Actor['role'],
      customerId: user.customerId ?? null,
    };
  } catch {
    return null;
  }
}
