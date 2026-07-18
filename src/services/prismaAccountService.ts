import { Account, AccountWithStats, CreateAccountRequest, UpdateAccountRequest, AccountType } from '@/types/account';
import { createPrismaClient } from '@/lib/prismaClient';

const prisma = createPrismaClient();

export class PrismaAccountService {
  
  private static logDatabaseOperation(operation: string, details?: string) {
    console.log(`🏦 ACCOUNT DATABASE OPERATION: ${operation}`);
    console.log(`📊 MySQL Database: luka_categories@localhost:3306`);
    if (details) console.log(`   Details: ${details}`);
  }

  // Calculate balance for an account in real-time
  private static async calculateBalance(accountId: string): Promise<number> {
    const balanceResult = await prisma.$queryRaw<Array<{
      total_income: number;
      total_expenses: number;
    }>>`
      SELECT 
        COALESCE(SUM(CASE WHEN c.type = 'INCOME' THEN t.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN c.type = 'EXPENSE' THEN t.amount ELSE 0 END), 0) as total_expenses
      FROM entries t
      JOIN categories c ON t.category_id = c.id
      WHERE t.account_id = ${accountId}
    `;
    
    const balance = balanceResult[0] || { total_income: 0, total_expenses: 0 };
    return Number(balance.total_income) - Number(balance.total_expenses);
  }

  // Get all accounts from MySQL database
  static async getAll(): Promise<Account[]> {
    this.logDatabaseOperation('SELECT * FROM accounts WHERE is_active = TRUE ORDER BY created_at DESC');
    
    const result = await prisma.account.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`✅ Database returned ${result.length} active accounts`);
    
    // Calculate balance for each account in real-time
    const accountsWithBalances = await Promise.all(result.map(async (account: any) => {
      const currentBalance = await this.calculateBalance(account.id);
      
      return {
        id: account.id,
        name: account.name,
        description: account.description || undefined,
  userId: account.userId,
        type: account.type as AccountType,
        currency: account.currency,
        currentBalance: currentBalance,
        isActive: account.isActive,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString()
      };
    }));
    
    return accountsWithBalances;
  }

  // Get account by ID from MySQL database
  static async getById(id: string): Promise<Account | null> {
    this.logDatabaseOperation('SELECT * FROM accounts WHERE id = ? AND is_active = TRUE', `id=${id}`);
    
    const account = await prisma.account.findFirst({
      where: { 
        id,
        isActive: true
      }
    });
    
    if (account) {
      console.log(`✅ Database found account: ${account.name} (${account.type})`);
      
      // Calculate current balance in real-time
      const currentBalance = await this.calculateBalance(id);
      
      return {
        id: account.id,
        name: account.name,
        description: account.description || undefined,
  userId: account.userId,
        type: account.type as AccountType,
        currency: account.currency,
        currentBalance: currentBalance,
        isActive: account.isActive,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString()
      };
    } else {
      console.log(`❌ Database: No active account found with id=${id}`);
      return null;
    }
  }

  // Get account with statistics
  static async getWithStats(id: string): Promise<AccountWithStats | null> {
    const account = await this.getById(id);
    if (!account) return null;

    this.logDatabaseOperation('Calculating account statistics', `accountId=${id}`);

    // Get transaction statistics
    const stats = await prisma.$queryRaw<Array<{
      total_income: number;
      total_expenses: number;
      transaction_count: number;
    }>>`
      SELECT 
        COALESCE(SUM(CASE WHEN c.type = 'INCOME' THEN t.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN c.type = 'EXPENSE' THEN t.amount ELSE 0 END), 0) as total_expenses,
        COUNT(t.id) as transaction_count
      FROM entries t
      JOIN categories c ON t.category_id = c.id
      WHERE t.account_id = ${id}
    `;

    // Get category count
    const categoryResult = await prisma.category.count({
      where: { accountId: id }
    });

    const accountStats = stats[0] || { total_income: 0, total_expenses: 0, transaction_count: 0 };

    return {
      ...account,
      totalIncome: Number(accountStats.total_income),
      totalExpenses: Number(accountStats.total_expenses),
      netAmount: Number(accountStats.total_income) - Number(accountStats.total_expenses),
      transactionCount: Number(accountStats.transaction_count),
      categoryCount: categoryResult
    };
  }

  // Create new account in MySQL database
  static async create(data: CreateAccountRequest): Promise<Account> {
    this.logDatabaseOperation('INSERT INTO accounts (name, type, currency) VALUES (?, ?, ?)', 
      `${data.name} (${data.type}) - ${data.currency}`);
    
    // Denormalise the owner's customer onto the account so access scoping and
    // notifications can resolve the tenant without an extra join.
    const owner = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { customerId: true },
    });

    const newAccount = await prisma.account.create({
      data: {
        userId: data.userId,
        customerId: owner?.customerId ?? null,
        name: data.name,
        description: data.description,
        type: data.type,
        currency: data.currency || 'NGN',
        isActive: true
      }
    });
    
    console.log(`✅ Database created account with id=${newAccount.id}`);
    
    return {
      id: newAccount.id,
      name: newAccount.name,
      description: newAccount.description || undefined,
  userId: newAccount.userId,
      type: newAccount.type as AccountType,
      currency: newAccount.currency,
      currentBalance: 0, // New account starts with 0 balance
      isActive: newAccount.isActive,
      createdAt: newAccount.createdAt.toISOString(),
      updatedAt: newAccount.updatedAt.toISOString()
    };
  }

  // Update account in MySQL database
  static async update(id: string, data: UpdateAccountRequest): Promise<Account | null> {
    const updateFields = Object.keys(data).join(', ');
    this.logDatabaseOperation('UPDATE accounts SET updated_at = NOW() WHERE id = ?', `id=${id}, fields=[${updateFields}]`);
    
    try {
      const updatedAccount = await prisma.account.update({
        where: { id },
        data
      });
      
      console.log(`✅ Database updated account: ${updatedAccount.name} (${updatedAccount.type})`);
      
      // Calculate current balance in real-time
      const currentBalance = await this.calculateBalance(id);
      
      return {
        id: updatedAccount.id,
        name: updatedAccount.name,
        description: updatedAccount.description || undefined,
  userId: updatedAccount.userId,
        type: updatedAccount.type as AccountType,
        currency: updatedAccount.currency,
        currentBalance: currentBalance,
        isActive: updatedAccount.isActive,
        createdAt: updatedAccount.createdAt.toISOString(),
        updatedAt: updatedAccount.updatedAt.toISOString()
      };
    } catch (error) {
      console.log(`❌ Database: No account found with id=${id} to update`);
      return null;
    }
  }

  // Soft delete account (set isActive to false)
  static async delete(id: string): Promise<void> {
    this.logDatabaseOperation('UPDATE accounts SET is_active = FALSE WHERE id = ?', `id=${id}`);
    
    try {
      const updatedAccount = await prisma.account.update({
        where: { id },
        data: { isActive: false }
      });
      console.log(`✅ Database deactivated account: ${updatedAccount.name}`);
    } catch (error) {
      console.log(`⚠️  Database: No account found with id=${id} to deactivate`);
    }
  }

  // Get accounts by type
  static async getByType(type: AccountType): Promise<Account[]> {
    this.logDatabaseOperation('SELECT * FROM accounts WHERE type = ? AND is_active = TRUE ORDER BY name ASC', `type=${type}`);
    
    const result = await prisma.account.findMany({
      where: { 
        type,
        isActive: true
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`✅ Database returned ${result.length} ${type} accounts`);
    
    // Calculate balance for each account in real-time
    const accountsWithBalances = await Promise.all(result.map(async (account: any) => {
      const currentBalance = await this.calculateBalance(account.id);
      
      return {
        id: account.id,
        name: account.name,
        description: account.description || undefined,
  userId: account.userId,
        type: account.type as AccountType,
        currency: account.currency,
        currentBalance: currentBalance,
        isActive: account.isActive,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString()
      };
    }));
    
    return accountsWithBalances;
  }
}
