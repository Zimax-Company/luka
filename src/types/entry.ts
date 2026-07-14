export interface Entry {
  id: string;
  accountId: string;
  date: string; // ISO date string
  note: string; // Short description/note
  categoryId: string; // Reference to category
  amount: number; // Positive for income, negative for expenses (or always positive with category type determining sign)
  createdAt: string;
  updatedAt: string;
}

export interface CreateEntryRequest {
  accountId: string;
  date: string;
  note?: string;
  categoryId: string;
  amount: number;
}

export interface UpdateEntryRequest {
  date?: string;
  note?: string;
  categoryId?: string;
  amount?: number;
}

// Extended entry with category details for API responses
export interface EntryWithCategory extends Entry {
  category: {
    id: string;
    name: string;
    type: 'INCOME' | 'EXPENSE';
  };
}
