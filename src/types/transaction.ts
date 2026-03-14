export interface Transaction {
  id: string;
  date: string; // ISO date string
  note: string; // Short description/note
  categoryId: string; // Reference to category
  amount: number; // Positive for income, negative for expenses (or always positive with category type determining sign)
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionRequest {
  date: string;
  note: string;
  categoryId: string;
  amount: number;
}

export interface UpdateTransactionRequest {
  date?: string;
  note?: string;
  categoryId?: string;
  amount?: number;
}

// Extended transaction with category details for API responses
export interface TransactionWithCategory extends Transaction {
  category: {
    id: string;
    name: string;
    type: 'INCOME' | 'EXPENSE';
  };
}
