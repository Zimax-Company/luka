import { createHash } from 'crypto';
import { createPrismaClient } from './prismaClient';

const prisma = createPrismaClient();

// Stable fingerprint for dedup across sources (recurring/SMS/OCR/manual).
export function draftFingerprint(parts: {
  accountId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  note?: string | null;
}): string {
  const note = (parts.note ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
  return createHash('sha1')
    .update(`${parts.accountId}|${parts.date}|${Math.round(parts.amount)}|${note}`)
    .digest('hex');
}

// True if a pending/approved draft with this fingerprint already exists (stops a
// re-run from drafting the same scheduled entry twice before it's reviewed).
export async function draftExists(accountId: string, fingerprint: string): Promise<boolean> {
  const hit = await prisma.draftEntry.findFirst({
    where: { accountId, fingerprint, status: { in: ['PENDING', 'APPROVED'] } },
    select: { id: true },
  });
  return !!hit;
}
