import { NextRequest, NextResponse } from 'next/server';
import { PrismaEntryService } from '@/services/prismaEntryService';
import { getActor } from '@/lib/actor';
import { getAccessibleAccountIds, scopeByAccount } from '@/lib/access';

// GET /api/entries/summary - Get entry summary/statistics.
// Supports ?year=YYYY to scope the summary to a single calendar year, or
// ?year=all for every year. Also returns the list of years that have data so
// clients can render a year filter (dashboards default to the current year).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');

    const accessibleIds = await getAccessibleAccountIds(await getActor(request));
    const all = scopeByAccount(await PrismaEntryService.getAll(), accessibleIds);

    // Distinct years present in the data, newest first.
    const availableYears = Array.from(
      new Set(all.map(t => new Date(t.date).getFullYear())),
    ).sort((a, b) => b - a);

    // Resolve the requested year. Absent → all-time (clients pass the year they want).
    let year: number | 'all' = 'all';
    let transactions = all;
    if (yearParam && yearParam !== 'all') {
      const y = parseInt(yearParam, 10);
      if (!isNaN(y)) {
        year = y;
        transactions = all.filter(t => new Date(t.date).getFullYear() === y);
      }
    }

    let income = 0;
    let expenses = 0;
    let incomeTransactions = 0;
    let expenseTransactions = 0;
    let lastTransactionDate: string | null = null;
    const categoryBreakdown: Record<
      string,
      { name: string; type: 'INCOME' | 'EXPENSE'; total: number; count: number }
    > = {};

    for (const t of transactions) {
      const amount = Number(t.amount) || 0;
      const type = t.category.type;
      if (type === 'INCOME') {
        income += amount;
        incomeTransactions++;
      } else {
        expenses += amount;
        expenseTransactions++;
      }

      const key = t.category.name;
      if (!categoryBreakdown[key]) {
        categoryBreakdown[key] = { name: key, type, total: 0, count: 0 };
      }
      categoryBreakdown[key].total += amount;
      categoryBreakdown[key].count++;

      if (!lastTransactionDate || t.date > lastTransactionDate) {
        lastTransactionDate = t.date;
      }
    }

    const totalTransactions = transactions.length;
    const avgTransactionAmount =
      totalTransactions > 0 ? (income + expenses) / totalTransactions : 0;

    return NextResponse.json({
      success: true,
      data: {
        year,
        availableYears,
        totals: {
          income,
          expenses,
          net: income - expenses,
        },
        statistics: {
          totalTransactions,
          incomeTransactions,
          expenseTransactions,
          avgTransactionAmount,
          lastTransactionDate: lastTransactionDate ?? new Date().toISOString(),
          categoryBreakdown,
        },
      },
      source: 'database',
    });
  } catch (error) {
    console.error('Error fetching transaction summary:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch transaction summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
