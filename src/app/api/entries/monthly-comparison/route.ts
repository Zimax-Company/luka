import { NextRequest, NextResponse } from 'next/server';
import { PrismaEntryService } from '@/services/prismaEntryService';

// GET /api/entries/monthly-comparison?type=INCOME|EXPENSE
// Top 5 categories by current-month total, each with its previous-month total
// and % change — powers the dashboard "top categories, % vs last month" stat.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type'); // optional INCOME|EXPENSE

    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth(); // 0-11
    const prev = new Date(curY, curM - 1, 1);
    const prevY = prev.getFullYear();
    const prevM = prev.getMonth();

    const all = await PrismaEntryService.getAll();

    // Aggregate per category name for current and previous month.
    const agg = new Map<string, { name: string; type: string; current: number; previous: number }>();
    for (const e of all) {
      if (typeFilter && e.category?.type !== typeFilter) continue;
      const d = new Date(e.date);
      const y = d.getFullYear();
      const m = d.getMonth();
      const isCur = y === curY && m === curM;
      const isPrev = y === prevY && m === prevM;
      if (!isCur && !isPrev) continue;
      const name = e.category?.name ?? 'Uncategorised';
      const rec = agg.get(name) ?? { name, type: e.category?.type ?? 'EXPENSE', current: 0, previous: 0 };
      if (isCur) rec.current += Number(e.amount) || 0;
      if (isPrev) rec.previous += Number(e.amount) || 0;
      agg.set(name, rec);
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
        categories,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/entries/monthly-comparison:', error);
    return NextResponse.json({ success: false, error: 'Failed to build comparison' }, { status: 500 });
  }
}
