import { createPrismaClient } from './prismaClient';
import { Actor } from './actor';

const prisma = createPrismaClient();

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type AuditResource = 'entry' | 'account' | 'category' | 'user' | 'transfer' | 'order' | 'cost';

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
