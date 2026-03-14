#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { MigrationRunner } from './src/lib/migrations';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const migrationRunner = new MigrationRunner(prisma);

async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'status':
      await getStatus();
      break;
    case 'migrate':
      await runMigrations();
      break;
    case 'rollback':
      await rollback();
      break;
    case 'make':
      await createMigration(process.argv[3]);
      break;
    default:
      console.log(`
Laravel-style Migration Commands:

  npm run migrate:status   - Check migration status
  npm run migrate:run      - Run pending migrations
  npm run migrate:rollback - Rollback last batch
  npm run migrate:make <name> - Create new migration file

Examples:
  npm run migrate:make create_users_table
  npm run migrate:status
  npm run migrate:run
      `);
  }
  
  await prisma.$disconnect();
}

async function getStatus() {
  try {
    await prisma.$connect();
    const status = await migrationRunner.getStatus();
    const pendingMigrations = await migrationRunner.getPendingMigrations();
    const executedMigrations = await migrationRunner.getExecutedMigrations();
    
    console.log('\n📊 Migration Status:');
    console.log(`   Total migrations: ${status.total}`);
    console.log(`   Executed: ${status.executed}`);
    console.log(`   Pending: ${status.pending}`);
    console.log(`   Last batch: ${status.lastBatch}`);
    
    if (executedMigrations.length > 0) {
      console.log('\n✅ Executed migrations:');
      executedMigrations.forEach(id => console.log(`   - ${id}`));
    }
    
    if (pendingMigrations.length > 0) {
      console.log('\n⏳ Pending migrations:');
      pendingMigrations.forEach(migration => {
        console.log(`   - ${migration.id}: ${migration.description}`);
      });
    } else {
      console.log('\n✅ All migrations are up to date');
    }
  } catch (error) {
    console.error('❌ Error getting migration status:', error);
  }
}

async function runMigrations() {
  try {
    await prisma.$connect();
    const result = await migrationRunner.runMigrations();
    
    if (result.executed.length > 0) {
      console.log(`✅ Successfully executed ${result.executed.length} migrations:`);
      result.executed.forEach(id => console.log(`   - ${id}`));
    } else {
      console.log('✅ No pending migrations to run');
    }
    
    if (result.errors.length > 0) {
      console.log('\n❌ Migration errors:');
      result.errors.forEach(error => {
        console.log(`   - ${error.id}: ${error.error}`);
      });
    }
  } catch (error) {
    console.error('❌ Error running migrations:', error);
  }
}

async function rollback() {
  try {
    await prisma.$connect();
    const result = await migrationRunner.rollbackLastBatch();
    
    if (result.rolledBack.length > 0) {
      console.log(`✅ Successfully rolled back ${result.rolledBack.length} migrations:`);
      result.rolledBack.forEach(id => console.log(`   - ${id}`));
    } else {
      console.log('✅ No migrations to rollback');
    }
    
    if (result.errors.length > 0) {
      console.log('\n❌ Rollback errors:');
      result.errors.forEach(error => {
        console.log(`   - ${error.id}: ${error.error}`);
      });
    }
  } catch (error) {
    console.error('❌ Error rolling back migrations:', error);
  }
}

async function createMigration(name: string) {
  if (!name) {
    console.error('❌ Migration name is required');
    console.log('Usage: npm run migrate:make <migration_name>');
    return;
  }
  
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
  const migrationId = `${timestamp}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  const fileName = `${migrationId}.ts`;
  const filePath = path.join(process.cwd(), 'migrations', fileName);
  
  const template = `/**
 * Migration: ${name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
 * Created: ${new Date().toISOString().split('T')[0]}
 */

export const migration = {
  id: '${migrationId}',
  description: '${name.replace(/_/g, ' ').toLowerCase()}',
  
  async up(prisma: any) {
    console.log('📊 Executing migration: ${migrationId}');
    
    // Add your migration logic here
    // Example:
    // await prisma.$executeRaw\`
    //   CREATE TABLE example (
    //     id VARCHAR(191) NOT NULL PRIMARY KEY,
    //     name VARCHAR(255) NOT NULL,
    //     created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    //   )
    // \`;
    
    console.log('✅ Migration completed: ${migrationId}');
  },
  
  async down(prisma: any) {
    console.log('🗑️ Rolling back migration: ${migrationId}');
    
    // Add your rollback logic here
    // Example:
    // await prisma.$executeRaw\`DROP TABLE IF EXISTS example\`;
    
    console.log('✅ Migration rolled back: ${migrationId}');
  }
};`;

  try {
    // Ensure migrations directory exists
    const migrationsDir = path.join(process.cwd(), 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, template);
    console.log(`✅ Migration created: ${fileName}`);
    console.log(`📁 Location: ${filePath}`);
    console.log(`\n📝 Edit the migration file to add your table changes`);
    console.log(`🚀 Run 'npm run migrate:run' to execute pending migrations`);
  } catch (error) {
    console.error('❌ Error creating migration file:', error);
  }
}

main().catch((e) => {
  console.error('❌ Migration command failed:', e);
  process.exit(1);
});
