/**
 * Migration: Create categories table
 * Created: 2026-03-14
 */

export const migration = {
  id: '002_create_categories_table',
  description: 'Create categories table for income and expense categorization',
  
  async up(prisma: any) {
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
  
  async down(prisma: any) {
    console.log('🗑️ Dropping categories table...');
    await prisma.$executeRaw`DROP TABLE IF EXISTS categories`;
    console.log('✅ Categories table dropped');
  }
};
