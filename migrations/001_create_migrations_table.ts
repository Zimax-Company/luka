/**
 * Migration: Create migrations tracking table
 * Created: 2026-03-14
 */

export const migration = {
  id: '001_create_migrations_table',
  description: 'Create migrations tracking table',
  
  async up(prisma: any) {
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
  
  async down(prisma: any) {
    console.log('🗑️ Dropping migrations tracking table...');
    await prisma.$executeRaw`DROP TABLE IF EXISTS migrations`;
    console.log('✅ Migrations tracking table dropped');
  }
};
