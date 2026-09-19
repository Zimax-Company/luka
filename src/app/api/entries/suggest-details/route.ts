import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { canAccessAccount } from '@/lib/access';

const prisma = createPrismaClient();

// Rank values by frequency, then recency (input assumed newest-first).
function topByFrequency<T>(values: T[], key: (v: T) => string, limit: number): T[] {
  const counts = new Map<string, number>();
  const firstSeen = new Map<string, T>();
  values.forEach((v, i) => {
    const k = key(v);
    counts.set(k, (counts.get(k) ?? 0) + 1);
    if (!firstSeen.has(k)) firstSeen.set(k, v); // newest occurrence (list is desc)
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => firstSeen.get(k)!) as T[];
}

// GET /api/entries/suggest-details?accountId=&categoryId=
// After a category is picked, suggest the 3 most-used amounts and 3 most-used
// notes for that account+category (from history) for one-tap fill.
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const categoryId = searchParams.get('categoryId');

    if (!accountId || !categoryId) {
      return NextResponse.json(
        { success: false, error: 'accountId and categoryId are required' },
        { status: 400 },
      );
    }
    if (!(await canAccessAccount(actor, accountId))) {
      return NextResponse.json({ success: false, error: 'No access to this account' }, { status: 403 });
    }

    const rows = await prisma.entry.findMany({
      where: { accountId, categoryId },
      orderBy: { date: 'desc' },
      take: 100,
      select: { amount: true, note: true },
    });

    const amounts = topByFrequency(
      rows.map(r => Number(r.amount)).filter(n => n > 0),
      n => String(n),
      3,
    );
    const notes = topByFrequency(
      rows.map(r => (r.note ?? '').trim()).filter(n => n.length > 0),
      n => n.toLowerCase(),
      3,
    );

    return NextResponse.json({ success: true, data: { amounts, notes } });
  } catch (error) {
    console.error('Error in GET /api/entries/suggest-details:', error);
    return NextResponse.json({ success: false, error: 'Failed to suggest details' }, { status: 500 });
  }
}
