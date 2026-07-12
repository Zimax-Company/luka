import { PrismaClient } from '@prisma/client';

export interface Migration {
  id: string;
  description: string;
  up: (prisma: PrismaClient) => Promise<void>;
  down: (prisma: PrismaClient) => Promise<void>;
}

// Built-in migrations (since we can't dynamically import in serverless)
export const MIGRATIONS: Migration[] = [
  {
    id: '001_create_migrations_table',
    description: 'Create migrations tracking table',
    async up(prisma: PrismaClient) {
      console.log('📊 Creating migrations tracking table...');
      
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS migrations (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          batch INT NOT NULL,
          executed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        )
      `;
      
      console.log('✅ Migrations tracking table created');
    },
    async down(prisma: PrismaClient) {
      console.log('🗑️ Dropping migrations tracking table...');
      await prisma.$executeRaw`DROP TABLE IF EXISTS migrations`;
      console.log('✅ Migrations tracking table dropped');
    }
  },
  {
    id: '002_create_categories_table',
    description: 'Create categories table for income and expense categorization',
    async up(prisma: PrismaClient) {
      console.log('📊 Creating categories table...');
      
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS categories (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type ENUM('INCOME', 'EXPENSE') NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          UNIQUE KEY unique_name_type (name, type),
          INDEX idx_type (type),
          INDEX idx_name (name),
          INDEX idx_created_at (created_at)
        )
      `;
      
      console.log('✅ Categories table created');
    },
    async down(prisma: PrismaClient) {
      console.log('🗑️ Dropping categories table...');
      await prisma.$executeRaw`DROP TABLE IF EXISTS categories`;
      console.log('✅ Categories table dropped');
    }
  },
  {
    id: '003_create_transactions_table',
    description: 'Create transactions table with foreign key to categories',
    async up(prisma: PrismaClient) {
      console.log('💰 Creating transactions table...');
      
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS transactions (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          date DATE NOT NULL,
          note TEXT NOT NULL,
          category_id VARCHAR(191) NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          INDEX idx_date (date),
          INDEX idx_category (category_id),
          INDEX idx_amount (amount),
          INDEX idx_created_at (created_at),
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        )
      `;
      
      console.log('✅ Transactions table created');
    },
    async down(prisma: PrismaClient) {
      console.log('🗑️ Dropping transactions table...');
      await prisma.$executeRaw`DROP TABLE IF EXISTS transactions`;
      console.log('✅ Transactions table dropped');
    }
  },
  {
    id: '004_create_accounts_table',
    description: 'Create accounts table for multi-account financial management',
    async up(prisma: PrismaClient) {
      console.log('📊 Creating accounts table...');
      
      try {
        // Check if table already exists
        const tables = await prisma.$queryRaw`
          SELECT TABLE_NAME FROM information_schema.TABLES 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts'
        `;
        
        if ((tables as any[]).length === 0) {
          // Table doesn't exist, create it
          await prisma.$executeRaw`
            CREATE TABLE accounts (
              id VARCHAR(191) NOT NULL PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              description TEXT,
              type ENUM('PERSONAL', 'BUSINESS', 'SAVINGS', 'CHECKING', 'CREDIT', 'INVESTMENT') NOT NULL DEFAULT 'PERSONAL',
              currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
              is_active BOOLEAN NOT NULL DEFAULT TRUE,
              created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
              updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
              INDEX idx_accounts_type (type),
              INDEX idx_accounts_active (is_active),
              INDEX idx_accounts_created_at (created_at)
            )
          `;
          console.log('✅ Accounts table created');
        } else {
          console.log('✅ Accounts table already exists');
        }
      } catch (error) {
        console.error('Error creating accounts table:', error);
        throw error;
      }
      
      // Insert default account
      console.log('📊 Creating default account...');
      
      try {
        await prisma.$executeRaw`
          INSERT IGNORE INTO accounts (id, name, description, type, currency, is_active)
          VALUES (
            'acc_default_001',
            'Personal Account',
            'Default personal finance account',
            'PERSONAL',
            'NGN',
            TRUE
          )
        `;
        console.log('✅ Default account created');
      } catch (error) {
        console.error('Error creating default account:', error);
        throw error;
      }
    },
    async down(prisma: PrismaClient) {
      console.log('🗑️ Dropping accounts table...');
      await prisma.$executeRaw`DROP TABLE IF EXISTS accounts`;
      console.log('✅ Accounts table dropped');
    }
  },
  {
    id: '005_add_account_relations',
    description: 'Add account_id foreign key to categories and transactions tables',
    async up(prisma: PrismaClient) {
      console.log('📊 Adding account_id to categories table...');
      
      try {
        // Check if column already exists
        const categoryColumns = await prisma.$queryRaw`
          SELECT COLUMN_NAME FROM information_schema.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'account_id'
        `;
        
        if ((categoryColumns as any[]).length === 0) {
          // Add account_id column to categories table
          await prisma.$executeRaw`
            ALTER TABLE categories 
            ADD COLUMN account_id VARCHAR(191) NOT NULL DEFAULT 'acc_default_001' AFTER id
          `;
          
          // Add foreign key constraint for categories
          await prisma.$executeRaw`
            ALTER TABLE categories 
            ADD CONSTRAINT fk_categories_account_id 
            FOREIGN KEY (account_id) REFERENCES accounts(id) 
            ON DELETE CASCADE ON UPDATE CASCADE
          `;
          
          // Add index for categories account_id
          await prisma.$executeRaw`
            CREATE INDEX idx_categories_account_id ON categories(account_id)
          `;
          console.log('✅ Categories table updated with account_id');
        } else {
          console.log('✅ Categories table already has account_id column');
        }
      } catch (error) {
        console.error('Error updating categories:', error);
        throw error;
      }
      
      console.log('📊 Adding account_id to transactions table...');
      
      try {
        // Check if column already exists
        const transactionColumns = await prisma.$queryRaw`
          SELECT COLUMN_NAME FROM information_schema.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'account_id'
        `;
        
        if ((transactionColumns as any[]).length === 0) {
          // Add account_id column to transactions table
          await prisma.$executeRaw`
            ALTER TABLE transactions 
            ADD COLUMN account_id VARCHAR(191) NOT NULL DEFAULT 'acc_default_001' AFTER id
          `;
          
          // Add foreign key constraint for transactions
          await prisma.$executeRaw`
            ALTER TABLE transactions 
            ADD CONSTRAINT fk_transactions_account_id 
            FOREIGN KEY (account_id) REFERENCES accounts(id) 
            ON DELETE CASCADE ON UPDATE CASCADE
          `;
          
          // Add index for transactions account_id
          await prisma.$executeRaw`
            CREATE INDEX idx_transactions_account_id ON transactions(account_id)
          `;
          console.log('✅ Transactions table updated with account_id');
        } else {
          console.log('✅ Transactions table already has account_id column');
        }
      } catch (error) {
        console.error('Error updating transactions:', error);
        throw error;
      }
      
      // Update unique constraint on categories to include account_id
      console.log('📊 Updating categories unique constraint...');
      
      try {
        // Drop old unique constraint if it exists (using different syntax for MySQL)
        try {
          await prisma.$executeRaw`
            ALTER TABLE categories DROP INDEX categories_name_type_key
          `;
        } catch (e) {
          // Constraint might not exist, continue
          console.log('ℹ️  categories_name_type_key constraint not found or already dropped');
        }
        
        // Add new unique constraint if it doesn't exist
        const constraints = await prisma.$queryRaw`
          SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND CONSTRAINT_NAME = 'unique_account_name_type'
        `;
        
        if ((constraints as any[]).length === 0) {
          await prisma.$executeRaw`
            ALTER TABLE categories 
            ADD CONSTRAINT unique_account_name_type 
            UNIQUE KEY (account_id, name, type)
          `;
          console.log('✅ Categories unique constraint updated');
        } else {
          console.log('✅ Categories unique constraint already exists');
        }
      } catch (error) {
        console.error('Error updating constraint:', error);
        throw error;
      }
    },
    async down(prisma: PrismaClient) {
      console.log('🗑️ Removing account relations...');
      
      // Remove foreign key constraints (using try-catch for each since they might not exist)
      try {
        await prisma.$executeRaw`
          ALTER TABLE categories DROP FOREIGN KEY fk_categories_account_id
        `;
      } catch (e) {
        console.log('ℹ️  fk_categories_account_id constraint not found');
      }
      
      try {
        await prisma.$executeRaw`
          ALTER TABLE transactions DROP FOREIGN KEY fk_transactions_account_id
        `;
      } catch (e) {
        console.log('ℹ️  fk_transactions_account_id constraint not found');
      }
      
      // Remove indexes
      try {
        await prisma.$executeRaw`
          DROP INDEX idx_categories_account_id ON categories
        `;
      } catch (e) {
        console.log('ℹ️  idx_categories_account_id index not found');
      }
      
      try {
        await prisma.$executeRaw`
          DROP INDEX idx_transactions_account_id ON transactions
        `;
      } catch (e) {
        console.log('ℹ️  idx_transactions_account_id index not found');
      }
      
      // Remove columns
      const categoryColumns = await prisma.$queryRaw`
        SELECT COLUMN_NAME FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'account_id'
      `;
      
      if ((categoryColumns as any[]).length > 0) {
        try {
          await prisma.$executeRaw`
            ALTER TABLE categories DROP COLUMN account_id
          `;
        } catch (e) {
          console.log('ℹ️  Could not drop account_id from categories');
        }
      }
      
      const transactionColumns = await prisma.$queryRaw`
        SELECT COLUMN_NAME FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'account_id'
      `;
      
      if ((transactionColumns as any[]).length > 0) {
        try {
          await prisma.$executeRaw`
            ALTER TABLE transactions DROP COLUMN account_id
          `;
        } catch (e) {
          console.log('ℹ️  Could not drop account_id from transactions');
        }
      }
      
      // Restore original unique constraint
      try {
        await prisma.$executeRaw`
          ALTER TABLE categories DROP INDEX unique_account_name_type
        `;
      } catch (e) {
        console.log('ℹ️  unique_account_name_type constraint not found');
      }
      
      const constraints = await prisma.$queryRaw`
        SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND CONSTRAINT_NAME = 'categories_name_type_key'
      `;
      
      if ((constraints as any[]).length === 0) {
        try {
          await prisma.$executeRaw`
            ALTER TABLE categories 
            ADD CONSTRAINT categories_name_type_key 
            UNIQUE KEY (name, type)
          `;
        } catch (e) {
          console.log('ℹ️  Could not add categories_name_type_key constraint');
        }
      }
      
      console.log('✅ Account relations removed');
    }
  },
  {
    id: '006_remove_account_balances',
    description: 'Remove balance columns from accounts table - calculate real-time from transactions',
    async up(prisma: PrismaClient) {
      console.log('🗑️ Removing balance columns from accounts table...');
      
      try {
        // Check if columns exist before dropping
        const columns = await prisma.$queryRaw`
          SELECT COLUMN_NAME FROM information_schema.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' 
          AND COLUMN_NAME IN ('initial_balance', 'current_balance')
        `;
        
        if ((columns as any[]).length > 0) {
          // Remove initial_balance and current_balance columns
          try {
            await prisma.$executeRaw`
              ALTER TABLE accounts 
              DROP COLUMN initial_balance
            `;
          } catch (e) {
            console.log('ℹ️  initial_balance column not found');
          }
          
          try {
            await prisma.$executeRaw`
              ALTER TABLE accounts 
              DROP COLUMN current_balance
            `;
          } catch (e) {
            console.log('ℹ️  current_balance column not found');
          }
          console.log('✅ Balance columns removed');
        } else {
          console.log('✅ Balance columns already removed or do not exist');
        }
        
        console.log('✅ Balance columns removed - balances will be calculated real-time from transactions');
      } catch (error) {
        console.error('Error removing balance columns:', error);
        throw error;
      }
    },
    async down(prisma: PrismaClient) {
      console.log('📊 Adding back balance columns to accounts table...');
      
      try {
        // Check if columns already exist
        const columns = await prisma.$queryRaw`
          SELECT COLUMN_NAME FROM information_schema.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' 
          AND COLUMN_NAME IN ('initial_balance', 'current_balance')
        `;
        
        if ((columns as any[]).length === 0) {
          // Add back balance columns
          await prisma.$executeRaw`
            ALTER TABLE accounts 
            ADD COLUMN initial_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
            ADD COLUMN current_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00
          `;
          
          console.log('✅ Balance columns restored');
        } else {
          console.log('✅ Balance columns already exist');
        }
      } catch (error) {
        console.error('Error restoring balance columns:', error);
        throw error;
      }
    }
  },
  {
    id: '007_create_users_table',
    description: 'Create users table with admin/editor/viewer roles and member relationships',
    async up(prisma: PrismaClient) {
      console.log('👥 Creating users table...');
      
      try {
        // Check if table already exists
        const tables = await prisma.$queryRaw`
          SELECT TABLE_NAME FROM information_schema.TABLES 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
        `;
        
        if ((tables as any[]).length === 0) {
          await prisma.$executeRaw`
            CREATE TABLE users (
              id VARCHAR(191) NOT NULL PRIMARY KEY,
              email VARCHAR(255) NOT NULL UNIQUE,
              name VARCHAR(255) NOT NULL,
              password VARCHAR(255) NOT NULL,
              role ENUM('ADMIN', 'EDITOR', 'VIEWER') NOT NULL DEFAULT 'ADMIN',
              is_active BOOLEAN NOT NULL DEFAULT TRUE,
              admin_id VARCHAR(191) NULL,
              created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
              updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
              
              INDEX idx_users_email (email),
              INDEX idx_users_role (role),
              INDEX idx_users_admin_id (admin_id),
              INDEX idx_users_active (is_active),
              
              CONSTRAINT fk_users_admin_id 
              FOREIGN KEY (admin_id) REFERENCES users(id) 
              ON DELETE CASCADE ON UPDATE CASCADE
            )
          `;
          console.log('✅ Users table created');
        } else {
          console.log('✅ Users table already exists');
        }
        
        // Create default admin user
        console.log('👤 Creating default admin user...');
        
        const hashedPassword = 'admin123';
        
        await prisma.$executeRaw`
          INSERT IGNORE INTO users (id, email, name, password, role, is_active)
          VALUES (
            'user_admin_001',
            'admin@example.com',
            'System Administrator',
            ${hashedPassword},
            'ADMIN',
            TRUE
          )
        `;
        
        console.log('✅ Default admin user created');
        console.log('📧 Login: admin@example.com');
        console.log('🔒 Password: admin123');
      } catch (error) {
        console.error('Error creating users table:', error);
        throw error;
      }
    },
    async down(prisma: PrismaClient) {
      console.log('🗑️ Dropping users table...');
      await prisma.$executeRaw`DROP TABLE IF EXISTS users`;
      console.log('✅ Users table dropped');
    }
  },
  {
    id: '008_add_user_to_accounts',
    description: 'Add user_id foreign key to accounts table for ownership',
    async up(prisma: PrismaClient) {
      console.log('👥 Adding user_id to accounts table...');
      
      try {
        // Check if column already exists
        const columns = await prisma.$queryRaw`
          SELECT COLUMN_NAME FROM information_schema.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'user_id'
        `;
        
        if ((columns as any[]).length === 0) {
          // Add user_id column to accounts table
          await prisma.$executeRaw`
            ALTER TABLE accounts 
            ADD COLUMN user_id VARCHAR(191) NOT NULL DEFAULT 'user_admin_001' AFTER id
          `;
          
          // Add foreign key constraint
          await prisma.$executeRaw`
            ALTER TABLE accounts 
            ADD CONSTRAINT fk_accounts_user_id 
            FOREIGN KEY (user_id) REFERENCES users(id) 
            ON DELETE CASCADE ON UPDATE CASCADE
          `;
          
          // Add index for user_id
          await prisma.$executeRaw`
            CREATE INDEX idx_accounts_user_id ON accounts(user_id)
          `;
          
          console.log('✅ User relationship added to accounts table');
        } else {
          console.log('✅ Accounts table already has user_id column');
        }
        
        // Update existing accounts to belong to default admin
        console.log('📊 Updating existing accounts to belong to admin...');
        
        await prisma.$executeRaw`
          UPDATE accounts 
          SET user_id = 'user_admin_001'
          WHERE user_id IS NULL OR user_id = 'user_admin_001'
        `;
        
        console.log('✅ Updated accounts to belong to admin user');
      } catch (error) {
        console.error('Error adding user relationship:', error);
        throw error;
      }
    },
    async down(prisma: PrismaClient) {
      console.log('🗑️ Removing user relationship from accounts...');
      
      try {
        // Remove foreign key constraint
        try {
          await prisma.$executeRaw`
            ALTER TABLE accounts DROP FOREIGN KEY fk_accounts_user_id
          `;
        } catch (e) {
          console.log('ℹ️  fk_accounts_user_id constraint not found');
        }
        
        // Remove index
        try {
          await prisma.$executeRaw`
            DROP INDEX idx_accounts_user_id ON accounts
          `;
        } catch (e) {
          console.log('ℹ️  idx_accounts_user_id index not found');
        }
        
        // Remove user_id column
        const columns = await prisma.$queryRaw`
          SELECT COLUMN_NAME FROM information_schema.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'user_id'
        `;
        
        if ((columns as any[]).length > 0) {
          try {
            await prisma.$executeRaw`
              ALTER TABLE accounts DROP COLUMN user_id
            `;
          } catch (e) {
            console.log('ℹ️  Could not drop user_id from accounts');
          }
        }
        
        console.log('✅ User relationship removed from accounts');
      } catch (error) {
        console.error('Error removing user relationship:', error);
        throw error;
      }
    }
  }
];

export class MigrationRunner {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get all available migrations
   */
  getAllMigrations(): Migration[] {
    return MIGRATIONS;
  }

  /**
   * Get migrations that have already been run
   */
  async getExecutedMigrations(): Promise<string[]> {
    try {
      // Check if migrations table exists
      await this.ensureMigrationsTable();
      
      const executed = await this.prisma.$queryRaw<Array<{id: string}>>`
        SELECT id FROM migrations ORDER BY batch ASC, id ASC
      `;
      
      return executed.map((row: {id: string}) => row.id);
    } catch (error) {
      console.log('Migrations table does not exist yet, will be created');
      return [];
    }
  }

  /**
   * Ensure migrations tracking table exists
   */
  async ensureMigrationsTable(): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS migrations (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          batch INT NOT NULL,
          executed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        )
      `;
    } catch (error) {
      // Table might already exist, ignore error
    }
  }

  /**
   * Get pending migrations (not yet executed)
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const allMigrations = this.getAllMigrations();
    const executedMigrations = await this.getExecutedMigrations();
    
    return allMigrations.filter(migration => 
      !executedMigrations.includes(migration.id)
    );
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<{
    executed: string[],
    skipped: string[],
    errors: Array<{id: string, error: string}>
  }> {
    const pendingMigrations = await this.getPendingMigrations();
    const executed: string[] = [];
    const skipped: string[] = [];
    const errors: Array<{id: string, error: string}> = [];

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations to run');
      return { executed, skipped, errors };
    }

    // Get next batch number
    const lastBatch = await this.getLastBatchNumber();
    const nextBatch = lastBatch + 1;

    console.log(`🔄 Running ${pendingMigrations.length} pending migrations...`);

    for (const migration of pendingMigrations) {
      try {
        console.log(`📊 Executing migration: ${migration.id}`);
        console.log(`   Description: ${migration.description}`);
        
        // Run the migration
        await migration.up(this.prisma);
        
        // Record the migration as executed
        await this.prisma.$executeRaw`
          INSERT INTO migrations (id, batch) VALUES (${migration.id}, ${nextBatch})
        `;
        
        executed.push(migration.id);
        console.log(`✅ Migration completed: ${migration.id}`);
        
      } catch (error) {
        console.error(`❌ Migration failed: ${migration.id}`, error);
        errors.push({
          id: migration.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Stop on first error to maintain data integrity
        break;
      }
    }

    return { executed, skipped, errors };
  }

  /**
   * Rollback the last batch of migrations
   */
  async rollbackLastBatch(): Promise<{
    rolledBack: string[],
    errors: Array<{id: string, error: string}>
  }> {
    const lastBatch = await this.getLastBatchNumber();
    
    if (lastBatch === 0) {
      console.log('✅ No migrations to rollback');
      return { rolledBack: [], errors: [] };
    }

    const migrationsToRollback = await this.prisma.$queryRaw<Array<{id: string}>>`
      SELECT id FROM migrations WHERE batch = ${lastBatch} ORDER BY id DESC
    `;

    const rolledBack: string[] = [];
    const errors: Array<{id: string, error: string}> = [];
    const allMigrations = this.getAllMigrations();

    console.log(`🔄 Rolling back ${migrationsToRollback.length} migrations from batch ${lastBatch}...`);

    for (const { id } of migrationsToRollback) {
      try {
        const migration = allMigrations.find(m => m.id === id);
        
        if (!migration) {
          throw new Error(`Migration file not found: ${id}`);
        }

        console.log(`📊 Rolling back migration: ${id}`);
        
        // Run the rollback
        await migration.down(this.prisma);
        
        // Remove from migrations table
        await this.prisma.$executeRaw`
          DELETE FROM migrations WHERE id = ${id}
        `;
        
        rolledBack.push(id);
        console.log(`✅ Migration rolled back: ${id}`);
        
      } catch (error) {
        console.error(`❌ Rollback failed: ${id}`, error);
        errors.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { rolledBack, errors };
  }

  /**
   * Get the last batch number
   */
  async getLastBatchNumber(): Promise<number> {
    try {
      const result = await this.prisma.$queryRaw<Array<{max_batch: number | null}>>`
        SELECT MAX(batch) as max_batch FROM migrations
      `;
      
      return result[0]?.max_batch || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    total: number,
    executed: number,
    pending: number,
    lastBatch: number
  }> {
    const allMigrations = this.getAllMigrations();
    const executedMigrations = await this.getExecutedMigrations();
    const lastBatch = await this.getLastBatchNumber();

    return {
      total: allMigrations.length,
      executed: executedMigrations.length,
      pending: allMigrations.length - executedMigrations.length,
      lastBatch
    };
  }
}
