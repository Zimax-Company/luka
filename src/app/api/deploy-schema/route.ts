import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// GET /api/deploy-schema - Deploy database schema using Prisma Client directly
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Starting database schema check and deployment...');
    
    const prisma = new PrismaClient();
    
    try {
      // First, try to connect to the database
      console.log('📊 Testing database connection...');
      await prisma.$connect();
      console.log('✅ Database connection successful');
      
      // Try to query existing tables to see if schema exists
      try {
        console.log('🔍 Checking if database schema exists...');
        const categoryCount = await prisma.category.count();
        const transactionCount = await prisma.transaction.count();
        
        console.log('✅ Database schema exists and is accessible');
        console.log(`📈 Current data: ${categoryCount} categories, ${transactionCount} transactions`);
        
        await prisma.$disconnect();
        
        return NextResponse.json({
          success: true,
          message: 'Database schema already exists and is working',
          data: {
            schemaExists: true,
            categoriesCount: categoryCount,
            transactionsCount: transactionCount,
            status: 'ready',
            nextStep: transactionCount === 0 ? 'Use /api/migrate to seed initial data' : 'Database is ready to use'
          }
        });
        
      } catch (schemaError) {
        console.log('⚠️  Database schema might not exist, attempting to create...');
        
        // If we can't query the tables, they might not exist
        // We'll try to create them using raw SQL commands
        try {
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
          
          console.log('✅ Database schema created successfully using raw SQL');
          
          // Test the newly created schema
          const newCategoryCount = await prisma.category.count();
          const newTransactionCount = await prisma.transaction.count();
          
          await prisma.$disconnect();
          
          return NextResponse.json({
            success: true,
            message: 'Database schema created successfully',
            data: {
              schemaCreated: true,
              categoriesCount: newCategoryCount,
              transactionsCount: newTransactionCount,
              status: 'created',
              nextStep: 'Use /api/migrate to seed initial data'
            }
          });
          
        } catch (createError) {
          console.error('❌ Failed to create schema with raw SQL:', createError);
          await prisma.$disconnect();
          
          return NextResponse.json({
            success: false,
            error: 'Failed to create database schema',
            message: createError instanceof Error ? createError.message : 'Unknown schema creation error',
            suggestions: [
              'Check database permissions - user needs CREATE TABLE privileges',
              'Verify database connection and credentials',
              'Ensure database name exists on server',
              'Check if database user has schema creation permissions'
            ]
          }, { status: 500 });
        }
      }
      
    } catch (connectionError) {
      console.error('❌ Database connection failed:', connectionError);
      
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        message: connectionError instanceof Error ? connectionError.message : 'Unknown connection error',
        suggestions: [
          'Verify DATABASE_URL is correct',
          'Check database server is running and accessible',
          'Confirm database credentials are valid',
          'Ensure database allows connections from your Vercel deployment'
        ]
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Schema deployment failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to deploy database schema',
      message: error instanceof Error ? error.message : 'Unknown error',
      suggestions: [
        'Check that DATABASE_URL is correctly set',
        'Ensure database server is running',
        'Verify database credentials and permissions',
        'Make sure database exists (create it if needed)'
      ]
    }, { status: 500 });
  }
}

// POST /api/deploy-schema - Force schema reset and deploy
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting forced schema reset and deployment...');
    
    const prisma = new PrismaClient();
    
    try {
      await prisma.$connect();
      console.log('✅ Database connection successful');
      
      // Drop existing tables if they exist (force reset)
      console.log('🗑️  Dropping existing tables...');
      await prisma.$executeRaw`DROP TABLE IF EXISTS transactions`;
      await prisma.$executeRaw`DROP TABLE IF EXISTS categories`;
      
      // Recreate tables
      console.log('📊 Creating categories table...');
      await prisma.$executeRaw`
        CREATE TABLE categories (
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
      
      console.log('💰 Creating transactions table...');
      await prisma.$executeRaw`
        CREATE TABLE transactions (
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
      
      console.log('✅ Force schema reset successful');
      
      // Verify the new schema
      const categoryCount = await prisma.category.count();
      const transactionCount = await prisma.transaction.count();
      
      await prisma.$disconnect();
      
      return NextResponse.json({
        success: true,
        message: 'Database schema forcefully reset and deployed',
        data: {
          schemaReset: true,
          categoriesCount: categoryCount,
          transactionsCount: transactionCount,
          warning: 'All existing data was deleted',
          nextStep: 'Run /api/migrate to seed fresh data'
        }
      });
      
    } catch (error) {
      console.error('❌ Force schema reset failed:', error);
      await prisma.$disconnect();
      
      return NextResponse.json({
        success: false,
        error: 'Force schema reset failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        suggestions: [
          'Check database permissions for DROP/CREATE operations',
          'Verify database connection and credentials',
          'Ensure database user has full schema modification rights'
        ]
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Force schema reset failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to reset and deploy schema',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
