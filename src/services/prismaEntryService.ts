import { Entry, EntryWithCategory, CreateEntryRequest } from '@/types/entry';
import { Category } from '@/types/category';
import { createPrismaClient } from '@/lib/prismaClient';

const prisma = createPrismaClient();

export class PrismaEntryService {

  private static logDatabaseOperation(operation: string, details?: string) {
    console.log(`🗄️  DATABASE OPERATION: ${operation}`);
    console.log(`📊 MySQL Database: luka_categories@localhost:3306`);
    console.log(`🔗 Connection: luka_user@mysql:3306/luka_categories`);
    if (details) console.log(`📋 Details: ${details}`);
    console.log('────────────────────────────────────────');
  }

  // Get all entries with category details from MySQL database
  static async getAll(): Promise<EntryWithCategory[]> {
    this.logDatabaseOperation('SELECT t.*, c.name as category_name, c.type as category_type FROM entries t JOIN categories c ON t.category_id = c.id ORDER BY t.date DESC');

    const result = await prisma.entry.findMany({
      include: {
        category: true
      },
      orderBy: {
        date: 'desc'
      }
    });

    console.log(`✅ Database returned ${result.length} entries with category details`);

    return result.map((entry: any) => ({
      id: entry.id,
      accountId: entry.accountId,
      amount: Number(entry.amount),
      note: entry.note,
      date: entry.date.toISOString().split('T')[0],
      categoryId: entry.categoryId,
      category: {
        id: entry.category.id,
        name: entry.category.name,
        type: entry.category.type
      },
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString()
    }));
  }

  // Get entry by ID from MySQL database
  static async getById(id: string): Promise<EntryWithCategory | null> {
    this.logDatabaseOperation('SELECT t.*, c.name as category_name, c.type as category_type FROM entries t JOIN categories c ON t.category_id = c.id WHERE t.id = ?', `id=${id}`);

    const entry = await prisma.entry.findUnique({
      where: { id },
      include: {
        category: true
      }
    });

    if (entry) {
      console.log(`✅ Database found entry: ₦${entry.amount} - ${entry.note} (${entry.category.name})`);
      return {
        id: entry.id,
        accountId: entry.accountId,
        amount: Number(entry.amount),
        note: entry.note,
        date: entry.date.toISOString().split('T')[0],
        categoryId: entry.categoryId,
        category: {
          id: entry.category.id,
          name: entry.category.name,
          type: entry.category.type
        },
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString()
      };
    } else {
      console.log(`❌ Database: No entry found with id=${id}`);
      return null;
    }
  }

  // Create new entry in MySQL database
  static async create(data: CreateEntryRequest): Promise<EntryWithCategory> {
    this.logDatabaseOperation('INSERT INTO entries (amount, note, date, category_id, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())', `₦${data.amount} - ${data.note} (category_id=${data.categoryId})`);

    // Verify category exists first
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId }
    });

    if (!category) {
      console.log(`❌ Database error: Category not found with id=${data.categoryId}`);
      throw new Error(`Category with id ${data.categoryId} not found`);
    }

    const newEntry = await prisma.entry.create({
      data: {
        accountId: data.accountId,
        amount: data.amount,
        note: data.note ?? '',
        date: new Date(data.date),
        categoryId: data.categoryId
      },
      include: {
        category: true
      }
    });

    console.log(`✅ Database created entry with id=${newEntry.id}: ₦${newEntry.amount} - ${newEntry.note}`);

    return {
      id: newEntry.id,
      accountId: newEntry.accountId,
      amount: Number(newEntry.amount),
      note: newEntry.note,
      date: newEntry.date.toISOString().split('T')[0],
      categoryId: newEntry.categoryId,
      category: {
        id: newEntry.category.id,
        name: newEntry.category.name,
        type: newEntry.category.type
      },
      createdAt: newEntry.createdAt.toISOString(),
      updatedAt: newEntry.updatedAt.toISOString()
    };
  }

  // Update entry
  static async update(id: string, data: Partial<{ amount: number; note: string; date: string; categoryId: string }>): Promise<EntryWithCategory | null> {
    this.logDatabaseOperation('UPDATE entries SET updated_at = NOW() WHERE id = ?', `id=${id}`);

    try {
      const updateData: any = {};
      if (data.amount !== undefined) updateData.amount = data.amount;
      if (data.note !== undefined) updateData.note = data.note;
      if (data.date !== undefined) updateData.date = new Date(data.date);
      if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;

      const updatedEntry = await prisma.entry.update({
        where: { id },
        data: updateData,
        include: {
          category: true
        }
      });

      console.log(`✅ Database updated entry: ₦${updatedEntry.amount} - ${updatedEntry.note}`);

      return {
        id: updatedEntry.id,
        accountId: updatedEntry.accountId,
        amount: Number(updatedEntry.amount),
        note: updatedEntry.note,
        date: updatedEntry.date.toISOString().split('T')[0],
        categoryId: updatedEntry.categoryId,
        category: {
          id: updatedEntry.category.id,
          name: updatedEntry.category.name,
          type: updatedEntry.category.type
        },
        createdAt: updatedEntry.createdAt.toISOString(),
        updatedAt: updatedEntry.updatedAt.toISOString()
      };
    } catch (error) {
      console.log(`❌ Database: No entry found with id=${id}`);
      return null;
    }
  }

  // Delete entry
  static async delete(id: string): Promise<void> {
    this.logDatabaseOperation('DELETE FROM entries WHERE id = ?', `id=${id}`);

    try {
      await prisma.entry.delete({
        where: { id }
      });
      console.log(`✅ Database deleted entry with id=${id}`);
    } catch (error) {
      console.log(`⚠️  Database: No entry found with id=${id} to delete`);
    }
  }

  // Get entries by category
  static async getByCategory(categoryId: string): Promise<EntryWithCategory[]> {
    this.logDatabaseOperation('SELECT t.*, c.name as category_name, c.type as category_type FROM entries t JOIN categories c ON t.category_id = c.id WHERE t.category_id = ?', `categoryId=${categoryId}`);

    const result = await prisma.entry.findMany({
      where: { categoryId },
      include: {
        category: true
      },
      orderBy: {
        date: 'desc'
      }
    });

    console.log(`✅ Database returned ${result.length} entries for category ${categoryId}`);

    return result.map((entry: any) => ({
      id: entry.id,
      accountId: entry.accountId,
      amount: Number(entry.amount),
      note: entry.note,
      date: entry.date.toISOString().split('T')[0],
      categoryId: entry.categoryId,
      category: {
        id: entry.category.id,
        name: entry.category.name,
        type: entry.category.type
      },
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString()
    }));
  }

  // Get entries by date range
  static async getByDateRange(startDate: string, endDate: string): Promise<EntryWithCategory[]> {
    this.logDatabaseOperation('SELECT t.*, c.name as category_name, c.type as category_type FROM entries t JOIN categories c ON t.category_id = c.id WHERE t.date BETWEEN ? AND ?', `startDate=${startDate}, endDate=${endDate}`);

    const result = await prisma.entry.findMany({
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

    console.log(`✅ Database returned ${result.length} entries from ${startDate} to ${endDate}`);

    return result.map((entry: any) => ({
      id: entry.id,
      accountId: entry.accountId,
      amount: Number(entry.amount),
      note: entry.note,
      date: entry.date.toISOString().split('T')[0],
      categoryId: entry.categoryId,
      category: {
        id: entry.category.id,
        name: entry.category.name,
        type: entry.category.type
      },
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString()
    }));
  }

  // Get financial summary
  static async getSummary(): Promise<any> {
    this.logDatabaseOperation('SELECT t.*, c.type FROM entries t JOIN categories c ON t.category_id = c.id');

    const entries = await prisma.entry.findMany({
      include: {
        category: true
      }
    });

    const income = entries
      .filter((t: any) => t.category.type === 'INCOME')
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    const expenses = entries
      .filter((t: any) => t.category.type === 'EXPENSE')
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    const categoryTotals = entries.reduce((acc: any, t: any) => {
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
      totalTransactions: entries.length,
      categoryBreakdown: categoryTotals,
      avgTransactionAmount: entries.length > 0 ? totalAmount / entries.length : 0
    };
  }
}
