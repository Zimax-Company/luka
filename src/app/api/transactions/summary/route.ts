import { NextRequest, NextResponse } from 'next/server';
import { TransactionService } from '@/services/transactionService';

// GET /api/transactions/summary - Get transaction summary/statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get totals by type
    const totals = await TransactionService.getTotalByType();
    
    // Get all transactions for additional stats
    let transactions;
    if (startDate && endDate) {
      transactions = await TransactionService.getByDateRange(startDate, endDate);
    } else {
      transactions = await TransactionService.getAll();
    }

    // Calculate additional statistics
    const stats = {
      totalTransactions: transactions.length,
      incomeTransactions: transactions.filter(t => t.category.type === 'INCOME').length,
      expenseTransactions: transactions.filter(t => t.category.type === 'EXPENSE').length,
      avgTransactionAmount: transactions.length > 0 
        ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length 
        : 0,
      lastTransactionDate: transactions.length > 0 
        ? Math.max(...transactions.map(t => new Date(t.date).getTime()))
        : null,
      categoryBreakdown: transactions.reduce((breakdown, t) => {
        const categoryName = t.category.name;
        if (!breakdown[categoryName]) {
          breakdown[categoryName] = {
            count: 0,
            total: 0,
            type: t.category.type
          };
        }
        breakdown[categoryName].count++;
        breakdown[categoryName].total += t.amount;
        return breakdown;
      }, {} as Record<string, { count: number; total: number; type: string }>)
    };

    return NextResponse.json({
      success: true,
      data: {
        totals,
        statistics: {
          ...stats,
          lastTransactionDate: stats.lastTransactionDate 
            ? new Date(stats.lastTransactionDate).toISOString().split('T')[0]
            : null
        },
        dateRange: {
          startDate: startDate || 'all time',
          endDate: endDate || 'all time'
        }
      }
    });

  } catch (error) {
    console.error('Error fetching transaction summary:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch transaction summary',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
