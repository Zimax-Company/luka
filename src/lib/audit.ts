import { createPrismaClient } from './prismaClient';
import { Actor } from './actor';

const prisma = createPrismaClient();

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type AuditResource = 'entry' | 'account' | 'category' | 'user' | 'transfer' | 'order' | 'cost';

// Who created a resource, from the audit trail (earliest CREATE record).
// Returns the actor's display name (falls back to their email) or null.
export async function getResourceCreator(
  resource: AuditResource,
  resourceId: string,
): Promise<{ name: string; email: string; at: string } | null> {
  try {
    const log = await prisma.auditLog.findFirst({
      where: { resource, resourceId, action: 'CREATE' },
      orderBy: { createdAt: 'asc' },
      select: { actorId: true, actorEmail: true, createdAt: true },
    });
    if (!log) return null;
    let name: string | null = null;
    if (log.actorId) {
      const u = await prisma.user.findUnique({ where: { id: log.actorId }, select: { name: true } });
      name = u?.name ?? null;
    }
    return { name: name ?? log.actorEmail, email: log.actorEmail, at: log.createdAt.toISOString() };
  } catch {
    return null;
  }
}

// Fire-and-forget audit write. Never throws — auditing must not break the
// primary request. Actor may be null (unknown caller) → logged as 'system'.
export function recordAudit(
  actor: Actor | null,
  action: AuditAction,
  resource: AuditResource,
  resourceId: string | null,
  summary: string,
): void {
  prisma.auditLog
    .create({
      data: {
        customerId: actor?.customerId ?? null,
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? 'system',
        action,
        resource,
        resourceId,
        summary,
      },
    })
    .catch(err => console.error('audit write failed:', err?.message ?? err));
}
