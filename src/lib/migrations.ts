import { PrismaClient } from '@prisma/client';

export interface Migration {
  id: string;
  description: string;
  up: (prisma: PrismaClient) => Promise<void>;
  down: (prisma: PrismaClient) => Promise<void>;
}

// ---- Schema-introspection helpers (MySQL lacks ADD COLUMN/INDEX IF NOT EXISTS) ----
async function tableExists(prisma: PrismaClient, table: string): Promise<boolean> {
  const r = await prisma.$queryRawUnsafe<Array<{ c: bigint | number }>>(
    `SELECT COUNT(*) c FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}'`,
  );
  return Number(r[0]?.c ?? 0) > 0;
}
async function columnExists(prisma: PrismaClient, table: string, col: string): Promise<boolean> {
  const r = await prisma.$queryRawUnsafe<Array<{ c: bigint | number }>>(
    `SELECT COUNT(*) c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}' AND COLUMN_NAME = '${col}'`,
  );
  return Number(r[0]?.c ?? 0) > 0;
}
async function indexExists(prisma: PrismaClient, table: string, index: string): Promise<boolean> {
  const r = await prisma.$queryRawUnsafe<Array<{ c: bigint | number }>>(
    `SELECT COUNT(*) c FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}' AND INDEX_NAME = '${index}'`,
  );
  return Number(r[0]?.c ?? 0) > 0;
}
async function addColumn(prisma: PrismaClient, table: string, col: string, ddl: string): Promise<void> {
  if (!(await columnExists(prisma, table, col))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}
async function addIndex(prisma: PrismaClient, table: string, index: string, ddl: string): Promise<void> {
  if (!(await indexExists(prisma, table, index))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD ${ddl}`);
  }
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
  },
  {
    id: '009_rename_transactions_to_entries',
    description: 'Rename transactions table to entries',
    async up(prisma) {
      if ((await tableExists(prisma, 'transactions')) && !(await tableExists(prisma, 'entries'))) {
        await prisma.$executeRawUnsafe(`RENAME TABLE transactions TO entries`);
      }
    },
    async down(prisma) {
      if ((await tableExists(prisma, 'entries')) && !(await tableExists(prisma, 'transactions'))) {
        await prisma.$executeRawUnsafe(`RENAME TABLE entries TO transactions`);
      }
    },
  },
  {
    id: '010_create_customers_billing',
    description: 'Customers (billable accounts), subscription events, audit logs, users.customer_id',
    async up(prisma) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS customers (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          root_email VARCHAR(255) NOT NULL,
          plan VARCHAR(50) NOT NULL DEFAULT 'FREE',
          status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          INDEX idx_customers_root_email (root_email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS subscription_events (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          customer_id VARCHAR(191) NOT NULL,
          plan VARCHAR(50) NOT NULL,
          type VARCHAR(50) NOT NULL,
          amount DECIMAL(10,2) NULL,
          currency VARCHAR(3) NULL,
          note TEXT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          INDEX idx_subevents_customer (customer_id),
          INDEX idx_subevents_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          customer_id VARCHAR(191) NULL,
          actor_id VARCHAR(191) NULL,
          actor_email VARCHAR(255) NOT NULL,
          action VARCHAR(20) NOT NULL,
          resource VARCHAR(50) NOT NULL,
          resource_id VARCHAR(191) NULL,
          summary TEXT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          INDEX idx_audit_customer (customer_id),
          INDEX idx_audit_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
      await addColumn(prisma, 'users', 'customer_id', `customer_id VARCHAR(191) NULL`);
      await addIndex(prisma, 'users', 'idx_users_customer_id', `INDEX idx_users_customer_id (customer_id)`);
      // Seed a default customer for the default admin and link unassigned users.
      await prisma.$executeRawUnsafe(`
        INSERT IGNORE INTO customers (id, name, root_email, plan, status)
        VALUES ('cust_default_001', 'Default', 'admin@example.com', 'FREE', 'ACTIVE')`);
      await prisma.$executeRawUnsafe(`UPDATE users SET customer_id = 'cust_default_001' WHERE customer_id IS NULL`);
      await prisma.$executeRawUnsafe(`
        INSERT IGNORE INTO subscription_events (id, customer_id, plan, type)
        VALUES ('subevt_default_001', 'cust_default_001', 'FREE', 'ACTIVATED')`);
    },
    async down(prisma) {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS subscription_events`);
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS audit_logs`);
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS customers`);
      if (await columnExists(prisma, 'users', 'customer_id')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE users DROP COLUMN customer_id`);
      }
    },
  },
  {
    id: '011_account_access_and_notifications',
    description: 'Per-account access grants, in-app notifications, accounts.customer_id + backfill',
    async up(prisma) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS account_access (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          user_id VARCHAR(191) NOT NULL,
          account_id VARCHAR(191) NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          UNIQUE KEY unique_user_account (user_id, account_id),
          KEY idx_access_user (user_id),
          KEY idx_access_account (account_id),
          CONSTRAINT fk_access_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_access_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS notifications (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          customer_id VARCHAR(191) NULL,
          recipient_id VARCHAR(191) NOT NULL,
          actor_id VARCHAR(191) NULL,
          actor_name VARCHAR(255) NOT NULL,
          action VARCHAR(20) NOT NULL,
          resource VARCHAR(50) NOT NULL,
          resource_id VARCHAR(191) NULL,
          account_id VARCHAR(191) NULL,
          account_name VARCHAR(255) NULL,
          summary TEXT NULL,
          read_at DATETIME(3) NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          KEY idx_notif_recipient (recipient_id, read_at),
          KEY idx_notif_customer (customer_id),
          KEY idx_notif_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
      await addColumn(prisma, 'accounts', 'customer_id', `customer_id VARCHAR(191) NULL`);
      await addIndex(prisma, 'accounts', 'idx_accounts_customer_id', `INDEX idx_accounts_customer_id (customer_id)`);
      await prisma.$executeRawUnsafe(`
        UPDATE accounts a JOIN users u ON a.user_id = u.id
        SET a.customer_id = u.customer_id WHERE a.customer_id IS NULL`);
      await prisma.$executeRawUnsafe(`
        INSERT IGNORE INTO account_access (id, user_id, account_id, created_at)
        SELECT CONCAT('acc_', SUBSTRING(MD5(CONCAT(u.id, ':', a.id)), 1, 24)), u.id, a.id, NOW(3)
        FROM users u JOIN accounts a ON a.customer_id = u.customer_id
        WHERE u.role <> 'ADMIN' AND u.is_active = TRUE`);
    },
    async down(prisma) {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS account_access`);
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS notifications`);
      if (await columnExists(prisma, 'accounts', 'customer_id')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE accounts DROP COLUMN customer_id`);
      }
    },
  },
  {
    id: '012_account_handles_and_transfers',
    description: 'Globally-unique account @handles + handle-addressed transfers',
    async up(prisma) {
      await addColumn(prisma, 'accounts', 'handle', `handle VARCHAR(64) NULL`);
      await prisma.$executeRawUnsafe(`
        UPDATE accounts a
        JOIN (
          SELECT id, CASE WHEN rn = 1 THEN slug ELSE CONCAT(slug, '_', SUBSTRING(id, -4)) END AS h
          FROM (
            SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) AS rn
            FROM (
              SELECT id, created_at,
                NULLIF(TRIM(BOTH '_' FROM LOWER(REGEXP_REPLACE(TRIM(name), '[^a-zA-Z0-9]+', '_'))), '') AS slug
              FROM accounts
            ) base
          ) ranked
        ) gen ON gen.id = a.id
        SET a.handle = COALESCE(gen.h, CONCAT('acct_', SUBSTRING(a.id, -6)))
        WHERE a.handle IS NULL`);
      await addIndex(prisma, 'accounts', 'accounts_handle_key', `UNIQUE INDEX accounts_handle_key (handle)`);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS transfers (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          from_account_id VARCHAR(191) NOT NULL,
          to_account_id VARCHAR(191) NOT NULL,
          from_entry_id VARCHAR(191) NULL,
          to_entry_id VARCHAR(191) NULL,
          amount DECIMAL(10,2) NOT NULL,
          note TEXT NULL,
          date DATE NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
          sender_id VARCHAR(191) NULL,
          sender_name VARCHAR(255) NOT NULL,
          from_account_name VARCHAR(255) NULL,
          to_handle VARCHAR(64) NULL,
          decided_by_id VARCHAR(191) NULL,
          decided_by_name VARCHAR(255) NULL,
          decided_at DATETIME(3) NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          KEY idx_transfer_to_status (to_account_id, status),
          KEY idx_transfer_from (from_account_id),
          KEY idx_transfer_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    },
    async down(prisma) {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS transfers`);
      if (await indexExists(prisma, 'accounts', 'accounts_handle_key')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE accounts DROP INDEX accounts_handle_key`);
      }
      if (await columnExists(prisma, 'accounts', 'handle')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE accounts DROP COLUMN handle`);
      }
    },
  },
  {
    id: '013_recurring_templates_and_drafts',
    description: 'Phase 1: recurring schedules + review-inbox draft entries',
    async up(prisma) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS recurring_templates (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          customer_id VARCHAR(191) NULL,
          account_id VARCHAR(191) NOT NULL,
          category_id VARCHAR(191) NOT NULL,
          type ENUM('INCOME','EXPENSE') NOT NULL,
          amount DECIMAL(10,2) NULL,
          note TEXT NULL,
          cadence VARCHAR(20) NOT NULL,
          day_of_month INT NULL,
          day_of_week INT NULL,
          auto_post TINYINT(1) NOT NULL DEFAULT 0,
          active TINYINT(1) NOT NULL DEFAULT 1,
          next_run_on DATE NOT NULL,
          last_run_on DATE NULL,
          created_by_id VARCHAR(191) NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          KEY idx_recurring_due (active, next_run_on),
          KEY idx_recurring_account (account_id),
          KEY idx_recurring_customer (customer_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS draft_entries (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          customer_id VARCHAR(191) NULL,
          account_id VARCHAR(191) NOT NULL,
          category_id VARCHAR(191) NULL,
          suggested_conf DOUBLE NULL,
          type ENUM('INCOME','EXPENSE') NOT NULL,
          amount DECIMAL(10,2) NULL,
          note TEXT NULL,
          date DATE NOT NULL,
          source VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
          fingerprint VARCHAR(64) NOT NULL,
          template_id VARCHAR(191) NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          KEY idx_draft_customer_status (customer_id, status),
          KEY idx_draft_account_status (account_id, status),
          KEY idx_draft_fingerprint (fingerprint)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    },
    async down(prisma) {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS draft_entries`);
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS recurring_templates`);
    },
  },
  {
    id: '014_category_and_entry_items',
    description: 'Category item catalog + optional per-entry line items',
    async up(prisma) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS category_items (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          category_id VARCHAR(191) NOT NULL,
          name VARCHAR(255) NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          UNIQUE KEY unique_category_item (category_id, name),
          KEY idx_catitem_category (category_id),
          CONSTRAINT fk_catitem_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS entry_items (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          entry_id VARCHAR(191) NOT NULL,
          category_item_id VARCHAR(191) NULL,
          name VARCHAR(255) NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          KEY idx_entryitem_entry (entry_id),
          CONSTRAINT fk_entryitem_entry FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    },
    async down(prisma) {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS entry_items`);
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS category_items`);
    },
  },
  {
    id: '015_customer_onboarding',
    description: 'Track onboarding dismissal on customers',
    async up(prisma) {
      await addColumn(prisma, 'customers', 'onboarding_dismissed', `onboarding_dismissed TINYINT(1) NOT NULL DEFAULT 0`);
    },
    async down(prisma) {
      if (await columnExists(prisma, 'customers', 'onboarding_dismissed')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE customers DROP COLUMN onboarding_dismissed`);
      }
    },
  },
  {
    id: '016_device_tokens',
    description: 'FCM device registration tokens for push notifications',
    async up(prisma) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS device_tokens (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          user_id VARCHAR(191) NOT NULL,
          token VARCHAR(512) NOT NULL,
          platform VARCHAR(20) NOT NULL DEFAULT 'android',
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          UNIQUE KEY uniq_device_token (token),
          KEY idx_devicetoken_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    },
    async down(prisma) {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS device_tokens`);
    },
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
        
        // Record the migration as executed (INSERT IGNORE so overlapping runs
        // during a deploy can't fail on a duplicate id).
        await this.prisma.$executeRaw`
          INSERT IGNORE INTO migrations (id, batch) VALUES (${migration.id}, ${nextBatch})
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
