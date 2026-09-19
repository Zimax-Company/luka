import { NextRequest, NextResponse } from 'next/server';
import { PrismaEntryService } from '@/services/prismaEntryService';
import { getActor } from '@/lib/actor';
import { getAccessibleAccountIds, scopeByAccount } from '@/lib/access';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// GET /api/entries/category-yearly?categoryId=<id>&years=2024,2025,2026
// Compare one category across multiple years — yearly totals plus a 12-month
// series per year (for a multi-line "e.g. Bag 2026 vs 2025 vs 2024" chart).
// Defaults to the last 3 years when `years` is omitted.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    if (!categoryId) {
      return NextResponse.json({ success: false, error: 'categoryId is required' }, { status: 400 });
    }

    const nowYear = new Date().getFullYear();
    const years = (searchParams.get('years') ?? `${nowYear - 2},${nowYear - 1},${nowYear}`)
      .split(',')
      .map(y => parseInt(y.trim(), 10))
      .filter(y => Number.isFinite(y))
      .sort((a, b) => a - b);

    const accessibleIds = await getAccessibleAccountIds(await getActor(request));
    const all = scopeByAccount(await PrismaEntryService.getByCategory(categoryId), accessibleIds);

    const categoryName = all[0]?.category?.name ?? null;
    const categoryType = all[0]?.category?.type ?? null;

    const byYear = years.map(year => {
      const points = MONTHS.map((label, i) => ({ month: i + 1, label, total: 0 }));
      let total = 0;
      for (const e of all) {
        const d = new Date(e.date);
        if (d.getFullYear() !== year) continue;
        const amt = Number(e.amount) || 0;
        points[d.getMonth()].total += amt;
        total += amt;
      }
      return { year, total, points };
    });

    // A month-indexed series merging all years, handy for a grouped/line chart:
    // [{ label:'Jan', '2024':x, '2025':y, '2026':z }, ...]
    const monthlySeries = MONTHS.map((label, i) => {
      const row: Record<string, number | string> = { label };
      for (const y of byYear) row[String(y.year)] = y.points[i].total;
      return row;
    });

    return NextResponse.json({
      success: true,
      data: { categoryId, categoryName, categoryType, years, byYear, monthlySeries },
    });
  } catch (error) {
    console.error('Error in GET /api/entries/category-yearly:', error);
    return NextResponse.json({ success: false, error: 'Failed to build yearly comparison' }, { status: 500 });
  }
}
