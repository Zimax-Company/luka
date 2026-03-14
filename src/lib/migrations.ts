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
