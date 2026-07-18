export type AccountType = 'PERSONAL' | 'BUSINESS' | 'SAVINGS' | 'CHECKING' | 'CREDIT' | 'INVESTMENT';

export interface Account {
  id: string;
  userId: string; // Owner of the account
  handle?: string | null; // Globally-unique @handle for transfers
  name: string;
  description?: string;
  type: AccountType;
  currency: string;
  currentBalance: number; // Calculated in real-time from transactions
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountRequest {
  userId: string;
  name: string;
  handle?: string;
  description?: string;
  type: AccountType;
  currency?: string;
}

export interface UpdateAccountRequest {
  name?: string;
  handle?: string;
  description?: string;
  type?: AccountType;
  isActive?: boolean;
}

export interface AccountWithStats extends Account {
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  transactionCount: number;
  categoryCount: number;
}
