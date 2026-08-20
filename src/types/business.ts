// Business-mode entities powering the lean P&L (orders = revenue, costs = expenditure).

export type OrderStatus = 'PAID' | 'PENDING' | 'CANCELLED';

export interface Order {
  id: string;
  accountId: string;
  customerId: string | null;
  reference: string | null;
  customerName: string | null;
  date: string; // ISO date (yyyy-mm-dd)
  amount: number;
  status: OrderStatus;
  note: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderRequest {
  accountId: string;
  amount: number;
  date: string;
  reference?: string | null;
  customerName?: string | null;
  status?: OrderStatus;
  note?: string | null;
}

export interface UpdateOrderRequest {
  amount?: number;
  date?: string;
  reference?: string | null;
  customerName?: string | null;
  status?: OrderStatus;
  note?: string | null;
}

export interface Cost {
  id: string;
  accountId: string;
  customerId: string | null;
  category: string | null;
  note: string | null;
  date: string;
  amount: number;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCostRequest {
  accountId: string;
  amount: number;
  date: string;
  category?: string | null;
  note?: string | null;
}

export interface UpdateCostRequest {
  amount?: number;
  date?: string;
  category?: string | null;
  note?: string | null;
}

// Lean P&L summary for an account over a period.
export interface ProfitAndLoss {
  accountId: string;
  startDate: string | null;
  endDate: string | null;
  revenue: number; // paid + pending orders (non-cancelled)
  paidRevenue: number;
  pendingRevenue: number;
  costs: number;
  profit: number; // revenue - costs
  orderCount: number;
  costCount: number;
}
