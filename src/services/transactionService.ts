import { Transaction, CreateTransactionRequest, UpdateTransactionRequest, TransactionWithCategory } from '@/types/transaction';
import { PrismaCategoryService } from '@/services/prismaCategoryService';

// In-memory store for transactions (will be replaced with Prisma when DATABASE_URL is available)
let transactions: Transaction[] = [
  {
    id: '1',
    date: new Date().toISOString().split('T')[0], // Today's date
    note: 'Monthly salary payment',
    categoryId: '1', // Salary category
    amount: 350000.00,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
    note: 'Lunch at restaurant',
    categoryId: '2', // Food category
    amount: 2500.00,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], // 2 days ago
    note: 'Gas station fill-up',
    categoryId: '2', // Food category (we'll create more categories later)
    amount: 15000.00,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let nextId = 4;

export class TransactionService {
  static async getAll(): Promise<TransactionWithCategory[]> {
    // Get all categories for lookup
    const categories = await PrismaCategoryService.getAll();
    const categoryMap = new Map(categories.map(cat => [cat.id, cat]));

    // Map transactions with category details
    const transactionsWithCategories = transactions.map(transaction => {
      const category = categoryMap.get(transaction.categoryId);
      return {
        ...transaction,
        category: category ? {
          id: category.id,
          name: category.name,
          type: category.type
        } : {
          id: 'unknown',
          name: 'Unknown Category',
          type: 'EXPENSE' as const
        }
      };
    });

    return Promise.resolve(transactionsWithCategories);
  }

  static async getById(id: string): Promise<TransactionWithCategory | null> {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) {
      return Promise.resolve(null);
    }

    // Get category details
    const category = await PrismaCategoryService.getById(transaction.categoryId);
    
    return Promise.resolve({
      ...transaction,
      category: category ? {
        id: category.id,
        name: category.name,
        type: category.type
      } : {
        id: 'unknown',
        name: 'Unknown Category',
        type: 'EXPENSE' as const
      }
    });
  }

  static async create(data: CreateTransactionRequest): Promise<Transaction> {
    // Validate that category exists
    const category = await PrismaCategoryService.getById(data.categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    // Validate amount
    if (typeof data.amount !== 'number' || data.amount <= 0) {
      throw new Error('Amount must be a positive number');
    }

    // Validate date
    if (!data.date || isNaN(Date.parse(data.date))) {
      throw new Error('Invalid date format');
    }

    // Create new transaction
    const newTransaction: Transaction = {
      id: nextId.toString(),
      date: data.date,
      note: data.note.trim(),
      categoryId: data.categoryId,
      amount: data.amount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    transactions.push(newTransaction);
    nextId++;

    return Promise.resolve(newTransaction);
  }

  static async update(id: string, data: UpdateTransactionRequest): Promise<Transaction | null> {
    const transactionIndex = transactions.findIndex(t => t.id === id);
    
    if (transactionIndex === -1) {
      return Promise.resolve(null);
    }

    // Validate category if provided
    if (data.categoryId) {
      const category = await PrismaCategoryService.getById(data.categoryId);
      if (!category) {
        throw new Error('Category not found');
      }
    }

    // Validate amount if provided
    if (data.amount !== undefined && (typeof data.amount !== 'number' || data.amount <= 0)) {
      throw new Error('Amount must be a positive number');
    }

    // Validate date if provided
    if (data.date && isNaN(Date.parse(data.date))) {
      throw new Error('Invalid date format');
    }

    const existingTransaction = transactions[transactionIndex];
    
    // Update transaction
    const updatedTransaction: Transaction = {
      ...existingTransaction,
      ...(data.date && { date: data.date }),
      ...(data.note !== undefined && { note: data.note.trim() }),
      ...(data.categoryId && { categoryId: data.categoryId }),
      ...(data.amount !== undefined && { amount: data.amount }),
      updatedAt: new Date().toISOString()
    };

    transactions[transactionIndex] = updatedTransaction;

    return Promise.resolve(updatedTransaction);
  }

  static async delete(id: string): Promise<boolean> {
    const transactionIndex = transactions.findIndex(t => t.id === id);
    
    if (transactionIndex === -1) {
      return Promise.resolve(false);
    }

    transactions.splice(transactionIndex, 1);
    return Promise.resolve(true);
  }

  // Additional utility methods
  static async getByCategory(categoryId: string): Promise<TransactionWithCategory[]> {
    const allTransactions = await this.getAll();
    return allTransactions.filter(t => t.categoryId === categoryId);
  }

  static async getByDateRange(startDate: string, endDate: string): Promise<TransactionWithCategory[]> {
    const allTransactions = await this.getAll();
    return allTransactions.filter(t => 
      t.date >= startDate && t.date <= endDate
    );
  }

  static async getTotalByType(): Promise<{ income: number; expenses: number; net: number }> {
    const allTransactions = await this.getAll();
    
    let income = 0;
    let expenses = 0;

    allTransactions.forEach(transaction => {
      if (transaction.category.type === 'INCOME') {
        income += transaction.amount;
      } else {
        expenses += transaction.amount;
      }
    });

    return {
      income,
      expenses,
      net: income - expenses
    };
  }
}
