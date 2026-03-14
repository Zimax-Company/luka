import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// GET /api/migrate - Run database migrations and setup
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Starting database migration...');
    
    const prisma = new PrismaClient();
    
    // Check if we need to create the database schema
    console.log('📊 Checking database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Check if tables exist by trying to count records
    try {
      const categoryCount = await prisma.category.count();
      const transactionCount = await prisma.transaction.count();
      
      console.log(`📈 Current database state:`);
      console.log(`   Categories: ${categoryCount}`);
      console.log(`   Transactions: ${transactionCount}`);
      
      if (categoryCount === 0) {
        console.log('🌱 Database is empty, running seed data...');
        
        // Create sample categories if none exist
        const categories = await Promise.all([
          prisma.category.create({ data: { name: 'Salary', type: 'INCOME' } }),
          prisma.category.create({ data: { name: 'Food', type: 'EXPENSE' } }),
          prisma.category.create({ data: { name: 'Transportation', type: 'EXPENSE' } }),
          prisma.category.create({ data: { name: 'Freelance', type: 'INCOME' } }),
          prisma.category.create({ data: { name: 'Entertainment', type: 'EXPENSE' } }),
          prisma.category.create({ data: { name: 'Health', type: 'EXPENSE' } }),
          prisma.category.create({ data: { name: 'Utilities', type: 'EXPENSE' } }),
          prisma.category.create({ data: { name: 'Investment', type: 'INCOME' } })
        ]);
        
        console.log(`✅ Created ${categories.length} categories`);
        
        // Create sample transactions
        const salaryCategory = categories.find(c => c.name === 'Salary');
        const foodCategory = categories.find(c => c.name === 'Food');
        const transportCategory = categories.find(c => c.name === 'Transportation');
        
        if (salaryCategory && foodCategory && transportCategory) {
          const transactions = await Promise.all([
            prisma.transaction.create({
              data: {
                amount: 3500.00,
                note: 'Monthly salary payment',
                date: new Date('2026-03-01'),
                categoryId: salaryCategory.id
              }
            }),
            prisma.transaction.create({
              data: {
                amount: 25.00,
                note: 'Lunch at restaurant',
                date: new Date('2026-03-02'),
                categoryId: foodCategory.id
              }
            }),
            prisma.transaction.create({
              data: {
                amount: 45.00,
                note: 'Gas station fill-up',
                date: new Date('2026-03-03'),
                categoryId: transportCategory.id
              }
            })
          ]);
          
          console.log(`✅ Created ${transactions.length} sample transactions`);
        }
      }
      
      // Final count
      const finalCategoryCount = await prisma.category.count();
      const finalTransactionCount = await prisma.transaction.count();
      
      await prisma.$disconnect();
      
      return NextResponse.json({
        success: true,
        message: 'Database migration completed successfully',
        data: {
          categoriesCount: finalCategoryCount,
          transactionsCount: finalTransactionCount,
          status: categoryCount === 0 ? 'seeded' : 'existing'
        }
      });
      
    } catch (tableError) {
      console.log('⚠️  Tables might not exist, this could be a fresh database');
      console.log('🔄 Attempting to push schema...');
      
      // If we can't query tables, they might not exist
      // In a real production environment, you'd want to run prisma migrate deploy
      // For now, we'll return a helpful message
      await prisma.$disconnect();
      
      return NextResponse.json({
        success: false,
        error: 'Database schema not found',
        message: 'You need to run "prisma migrate deploy" or "prisma db push" to create the database schema first',
        suggestion: 'Run this endpoint after setting up the database schema'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Migration failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/migrate - Force reset and reseed database
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting database reset and reseed...');
    
    const prisma = new PrismaClient();
    await prisma.$connect();
    
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await prisma.transaction.deleteMany();
    await prisma.category.deleteMany();
    
    // Create fresh categories
    console.log('🌱 Creating fresh categories...');
    const categories = await Promise.all([
      prisma.category.create({ data: { name: 'Salary', type: 'INCOME' } }),
      prisma.category.create({ data: { name: 'Food', type: 'EXPENSE' } }),
      prisma.category.create({ data: { name: 'Transportation', type: 'EXPENSE' } }),
      prisma.category.create({ data: { name: 'Freelance', type: 'INCOME' } }),
      prisma.category.create({ data: { name: 'Entertainment', type: 'EXPENSE' } }),
      prisma.category.create({ data: { name: 'Health', type: 'EXPENSE' } }),
      prisma.category.create({ data: { name: 'Utilities', type: 'EXPENSE' } }),
      prisma.category.create({ data: { name: 'Investment', type: 'INCOME' } })
    ]);
    
    // Create sample transactions
    console.log('💰 Creating sample transactions...');
    const salaryCategory = categories.find(c => c.name === 'Salary');
    const foodCategory = categories.find(c => c.name === 'Food');
    const transportCategory = categories.find(c => c.name === 'Transportation');
    const freelanceCategory = categories.find(c => c.name === 'Freelance');
    
    if (salaryCategory && foodCategory && transportCategory && freelanceCategory) {
      await Promise.all([
        prisma.transaction.create({
          data: { amount: 3500.00, note: 'Monthly salary payment', date: new Date('2026-03-01'), categoryId: salaryCategory.id }
        }),
        prisma.transaction.create({
          data: { amount: 25.00, note: 'Lunch at restaurant', date: new Date('2026-03-02'), categoryId: foodCategory.id }
        }),
        prisma.transaction.create({
          data: { amount: 45.00, note: 'Gas station fill-up', date: new Date('2026-03-03'), categoryId: transportCategory.id }
        }),
        prisma.transaction.create({
          data: { amount: 800.00, note: 'Freelance project payment', date: new Date('2026-03-04'), categoryId: freelanceCategory.id }
        }),
        prisma.transaction.create({
          data: { amount: 65.00, note: 'Grocery shopping', date: new Date('2026-03-05'), categoryId: foodCategory.id }
        })
      ]);
    }
    
    const finalCategoryCount = await prisma.category.count();
    const finalTransactionCount = await prisma.transaction.count();
    
    await prisma.$disconnect();
    
    console.log('✅ Database reset and reseed completed');
    
    return NextResponse.json({
      success: true,
      message: 'Database reset and reseeded successfully',
      data: {
        categoriesCount: finalCategoryCount,
        transactionsCount: finalTransactionCount,
        status: 'reset_and_seeded'
      }
    });
    
  } catch (error) {
    console.error('❌ Reset and reseed failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Reset and reseed failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
