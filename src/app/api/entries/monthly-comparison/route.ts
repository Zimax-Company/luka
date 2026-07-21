import { NextRequest, NextResponse } from 'next/server';
import { PrismaEntryService } from '@/services/prismaEntryService';
import { getActor } from '@/lib/actor';
import { getAccessibleAccountIds, scopeByAccount } from '@/lib/access';

// GET /api/entries/monthly-comparison?type=INCOME|EXPENSE&accountId=<id>
// Top 5 categories by current-month total, each with its previous-month total
// and % change — powers the dashboard "top categories, % vs last month" stat.
// Account-scoped: pass accountId to get one account's categories (the caller
// must have access to it); categories never merge across accounts.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type'); // optional INCOME|EXPENSE
    const accountId = searchParams.get('accountId'); // optional single account

    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth(); // 0-11
    const prev = new Date(curY, curM - 1, 1);
    const prevY = prev.getFullYear();
    const prevM = prev.getMonth();

    const accessibleIds = await getAccessibleAccountIds(await getActor(request));
    // Only aggregate over accounts the user can access; if a specific account is
    // requested, it must be one of them (otherwise nothing is returned).
    const scopeIds =
      accountId != null
        ? accessibleIds.filter(id => id === accountId)
        : accessibleIds;
    const all = scopeByAccount(await PrismaEntryService.getAll(), scopeIds);

    // Aggregate per CATEGORY (by id) for current and previous month — categories
    // are per-account, so this never blends categories from different accounts.
    const agg = new Map<
      string,
      { categoryId: string; name: string; type: string; current: number; previous: number }
    >();
    for (const e of all) {
      if (typeFilter && e.category?.type !== typeFilter) continue;
      const d = new Date(e.date);
      const y = d.getFullYear();
      const m = d.getMonth();
      const isCur = y === curY && m === curM;
      const isPrev = y === prevY && m === prevM;
      if (!isCur && !isPrev) continue;
      const key = e.categoryId ?? e.category?.name ?? 'uncategorised';
      const rec = agg.get(key) ?? {
        categoryId: e.categoryId ?? '',
        name: e.category?.name ?? 'Uncategorised',
        type: e.category?.type ?? 'EXPENSE',
        current: 0,
        previous: 0,
      };
      if (isCur) rec.current += Number(e.amount) || 0;
      if (isPrev) rec.previous += Number(e.amount) || 0;
      agg.set(key, rec);
    }

    const categories = Array.from(agg.values())
      .map(r => {
        const changePct =
          r.previous === 0 ? (r.current > 0 ? null : 0) : ((r.current - r.previous) / r.previous) * 100;
        return { ...r, changePct }; // changePct null => "new" (no prior month)
      })
      .sort((a, b) => b.current - a.current)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        month: `${curY}-${String(curM + 1).padStart(2, '0')}`,
        previousMonth: `${prevY}-${String(prevM + 1).padStart(2, '0')}`,
        accountId: accountId ?? null,
        categories,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/entries/monthly-comparison:', error);
    return NextResponse.json({ success: false, error: 'Failed to build comparison' }, { status: 500 });
  }
}
