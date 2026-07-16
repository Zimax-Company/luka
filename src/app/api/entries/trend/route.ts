import { NextRequest, NextResponse } from 'next/server';
import { PrismaEntryService } from '@/services/prismaEntryService';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// GET /api/entries/trend?categoryId=<id>&year=<YYYY>
// Monthly totals for one category across a calendar year — powers the
// per-category "over time" trend chart. Defaults to the current year.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const yearParam = searchParams.get('year');
    if (!categoryId) {
      return NextResponse.json({ success: false, error: 'categoryId is required' }, { status: 400 });
    }
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    const all = await PrismaEntryService.getByCategory(categoryId);
    const inYear = all.filter(e => new Date(e.date).getFullYear() === year);

    const points = MONTHS.map((label, i) => ({ month: i + 1, label, total: 0, count: 0 }));
    for (const e of inYear) {
      const m = new Date(e.date).getMonth(); // 0-11
      points[m].total += Number(e.amount) || 0;
      points[m].count += 1;
    }

    const categoryName = all[0]?.category?.name ?? null;
    const categoryType = all[0]?.category?.type ?? null;

    return NextResponse.json({
      success: true,
      data: { categoryId, categoryName, categoryType, year, points },
    });
  } catch (error) {
    console.error('Error in GET /api/entries/trend:', error);
    return NextResponse.json({ success: false, error: 'Failed to build trend' }, { status: 500 });
  }
}
