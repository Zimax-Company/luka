import { Transaction, TransactionWithCategory } from '@/types/transaction';
import { Category } from '@/types/category';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class PrismaTransactionService {
  
  private static logDatabaseOperation(operation: string, details?: string) {
    console.log(`🗄️  DATABASE OPERATION: ${operation}`);
    console.log(`📊 MySQL Database: luka_categories@localhost:3306`);
    console.log(`🔗 Connection: luka_user@mysql:3306/luka_categories`);
    if (details) console.log(`📋 Details: ${details}`);
    console.log('────────────────────────────────────────');
  }
  
  // Get all transactions with category details from MySQL database
  static async getAll(): Promise<TransactionWithCategory[]> {
    this.logDatabaseOperation('SELECT t.*, c.name as category_name, c.type as category_type FROM transactions t JOIN categories c ON t.category_id = c.id ORDER BY t.date DESC');
    
    const result = await prisma.transaction.findMany({
      include: {
        category: true
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    console.log(`✅ Database returned ${result.length} transactions with category details`);
    
    return result.map(transaction => ({
      id: transaction.id,
      amount: Number(transaction.amount),
      note: transaction.note,
      date: transaction.date.toISOString().split('T')[0],
      categoryId: transaction.categoryId,
      category: {
        id: transaction.category.id,
        name: transaction.category.name,
        type: transaction.category.type
      },
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString()
    }));
  }

  // Get transaction by ID from MySQL database
  static async getById(id: string): Promise<TransactionWithCategory | null> {
    this.logDatabaseOperation('SELECT t.*, c.name as category_name, c.type as category_type FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.id = ?', `id=${id}`);
    
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        category: true
      }
    });
    
    if (transaction) {
      console.log(`✅ Database found transaction: $${transaction.amount} - ${transaction.note} (${transaction.category.name})`);
      return {
        id: transaction.id,
        amount: Number(transaction.amount),
        note: transaction.note,
        date: transaction.date.toISOString().split('T')[0],
        categoryId: transaction.categoryId,
        category: {
          id: transaction.category.id,
          name: transaction.category.name,
          type: transaction.category.type
        },
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString()
      };
    } else {
      console.log(`❌ Database: No transaction found with id=${id}`);
      return null;
    }
  }

  // Create new transaction in MySQL database
  static async create(data: { amount: number; note: string; date: string; categoryId: string }): Promise<TransactionWithCategory> {
    this.logDatabaseOperation('INSERT INTO transactions (amount, note, date, category_id, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())', `$${data.amount} - ${data.note} (category_id=${data.categoryId})`);
    
    // Verify category exists first
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId }
    });
    
    if (!category) {
      console.log(`❌ Database error: Category not found with id=${data.categoryId}`);
      throw new Error(`Category with id ${data.categoryId} not found`);
    }

    const newTransaction = await prisma.transaction.create({
      data: {
        amount: data.amount,
        note: data.note,
        date: new Date(data.date),
        categoryId: data.categoryId
      },
      include: {
        category: true
      }
    });
    
    console.log(`✅ Database created transaction with id=${newTransaction.id}: $${newTransaction.amount} - ${newTransaction.note}`);
    
    return {
      id: newTransaction.id,
      amount: Number(newTransaction.amount),
      note: newTransaction.note,
      date: newTransaction.date.toISOString().split('T')[0],
      categoryId: newTransaction.categoryId,
      category: {
        id: newTransaction.category.id,
        name: newTransaction.category.name,
        type: newTransaction.category.type
      },
      createdAt: newTransaction.createdAt.toISOString(),
      updatedAt: newTransaction.updatedAt.toISOString()
    };
  }

  // Update transaction
  static async update(id: string, data: Partial<{ amount: number; note: string; date: string; categoryId: string }>): Promise<TransactionWithCategory | null> {
    this.logDatabaseOperation('UPDATE transactions SET updated_at = NOW() WHERE id = ?', `id=${id}`);
    
    try {
      const updateData: any = {};
      if (data.amount !== undefined) updateData.amount = data.amount;
      if (data.note !== undefined) updateData.note = data.note;
      if (data.date !== undefined) updateData.date = new Date(data.date);
      if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;

      const updatedTransaction = await prisma.transaction.update({
        where: { id },
        data: updateData,
        include: {
          category: true
        }
      });
      
      console.log(`✅ Database updated transaction: $${updatedTransaction.amount} - ${updatedTransaction.note}`);
      
      return {
        id: updatedTransaction.id,
        amount: Number(updatedTransaction.amount),
        note: updatedTransaction.note,
        date: updatedTransaction.date.toISOString().split('T')[0],
        categoryId: updatedTransaction.categoryId,
        category: {
          id: updatedTransaction.category.id,
          name: updatedTransaction.category.name,
          type: updatedTransaction.category.type
        },
        createdAt: updatedTransaction.createdAt.toISOString(),
        updatedAt: updatedTransaction.updatedAt.toISOString()
      };
    } catch (error) {
      console.log(`❌ Database: No transaction found with id=${id}`);
      return null;
    }
  }

  // Delete transaction
  static async delete(id: string): Promise<void> {
    this.logDatabaseOperation('DELETE FROM transactions WHERE id = ?', `id=${id}`);
    
    try {
      await prisma.transaction.delete({
        where: { id }
      });
      console.log(`✅ Database deleted transaction with id=${id}`);
    } catch (error) {
      console.log(`⚠️  Database: No transaction found with id=${id} to delete`);
    }
  }

  // Get transactions by category
  static async getByCategory(categoryId: string): Promise<TransactionWithCategory[]> {
    this.logDatabaseOperation('SELECT t.*, c.name as category_name, c.type as category_type FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.category_id = ?', `categoryId=${categoryId}`);
    
    const result = await prisma.transaction.findMany({
      where: { categoryId },
      include: {
        category: true
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    console.log(`✅ Database returned ${result.length} transactions for category ${categoryId}`);
    
    return result.map(transaction => ({
      id: transaction.id,
      amount: Number(transaction.amount),
      note: transaction.note,
      date: transaction.date.toISOString().split('T')[0],
      categoryId: transaction.categoryId,
      category: {
        id: transaction.category.id,
        name: transaction.category.name,
        type: transaction.category.type
      },
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString()
    }));
  }

  // Get transactions by date range
  static async getByDateRange(startDate: string, endDate: string): Promise<TransactionWithCategory[]> {
    this.logDatabaseOperation('SELECT t.*, c.name as category_name, c.type as category_type FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.date BETWEEN ? AND ?', `startDate=${startDate}, endDate=${endDate}`);
    
    const result = await prisma.transaction.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: {
        category: true
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    console.log(`✅ Database returned ${result.length} transactions from ${startDate} to ${endDate}`);
    
    return result.map(transaction => ({
      id: transaction.id,
      amount: Number(transaction.amount),
      note: transaction.note,
      date: transaction.date.toISOString().split('T')[0],
      categoryId: transaction.categoryId,
      category: {
        id: transaction.category.id,
        name: transaction.category.name,
        type: transaction.category.type
      },
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString()
    }));
  }

  // Get financial summary
  static async getSummary(): Promise<any> {
    this.logDatabaseOperation('SELECT t.*, c.type FROM transactions t JOIN categories c ON t.category_id = c.id');
    
    const transactions = await prisma.transaction.findMany({
      include: {
        category: true
      }
    });
    
    const income = transactions
      .filter(t => t.category.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);
      
    const expenses = transactions
      .filter(t => t.category.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const categoryTotals = transactions.reduce((acc, t) => {
      const key = t.category.name;
      if (!acc[key]) {
        acc[key] = { total: 0, count: 0, type: t.category.type };
      }
      acc[key].total += Number(t.amount);
      acc[key].count++;
      return acc;
    }, {} as Record<string, { total: number; count: number; type: string }>);

    const totalAmount = income + expenses;
    console.log(`✅ Database calculated financial summary: Income=$${income}, Expenses=$${expenses}`);

    return {
      totalIncome: income,
      totalExpenses: expenses,
      netIncome: income - expenses,
      totalTransactions: transactions.length,
      categoryBreakdown: categoryTotals,
      avgTransactionAmount: transactions.length > 0 ? totalAmount / transactions.length : 0
    };
  }
}
