export interface ReportSummary {
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export interface CategoryBreakdown {
  name: string;
  type: 'INCOME' | 'EXPENSE';
  total: number;
  count: number;
}

export interface MonthlyTrendData {
  month: string;
  income: number;
  expense: number;
  net: number;
  year: number;
  monthNumber: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
  type?: 'INCOME' | 'EXPENSE';
}

export interface DateFilter {
  startDate: string;
  endDate: string;
}

export interface ReportPeriod {
  type: 'month' | 'quarter' | 'year' | 'custom';
  label: string;
  startDate: string;
  endDate: string;
}

export interface FinancialReportData {
  summary: ReportSummary;
  categoryBreakdown: CategoryBreakdown[];
  monthlyTrend: MonthlyTrendData[];
  recentTransactions: Array<{
    id: string;
    amount: number;
    note: string;
    date: string;
    category: {
      name: string;
      type: 'INCOME' | 'EXPENSE';
    };
  }>;
}
