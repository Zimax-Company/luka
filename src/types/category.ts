export interface Category {
  id: string;
  accountId: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  accountId: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
}

export interface UpdateCategoryRequest {
  name?: string;
  type?: 'INCOME' | 'EXPENSE';
}
