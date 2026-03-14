/**
 * Migration: Create transactions table
 * Created: 2026-03-14
 */

export const migration = {
  id: '003_create_transactions_table',
  description: 'Create transactions table with foreign key to categories',
  
  async up(prisma: any) {
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
  
  async down(prisma: any) {
    console.log('🗑️ Dropping transactions table...');
    await prisma.$executeRaw`DROP TABLE IF EXISTS transactions`;
    console.log('✅ Transactions table dropped');
  }
};
