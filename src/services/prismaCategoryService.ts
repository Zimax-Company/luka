import { Category } from '@/types/category';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class PrismaCategoryService {
  
  private static logDatabaseOperation(operation: string, details?: string) {
    console.log(`🗄️  DATABASE OPERATION: ${operation}`);
    console.log(`📊 MySQL Database: luka_categories@localhost:3306`);
    console.log(`🔗 Connection: luka_user@mysql:3306/luka_categories`);
    if (details) console.log(`📋 Details: ${details}`);
    console.log('────────────────────────────────────────');
  }

  // Get all categories from MySQL database
  static async getAll(): Promise<Category[]> {
    this.logDatabaseOperation('SELECT * FROM categories ORDER BY type ASC, name ASC');
    
    const result = await prisma.category.findMany({
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    });
    
    console.log(`✅ Database returned ${result.length} categories`);
    return result.map(cat => ({
      id: cat.id,
      name: cat.name,
      type: cat.type,
      createdAt: cat.createdAt.toISOString(),
      updatedAt: cat.updatedAt.toISOString()
    }));
  }

  // Get category by ID from MySQL database
  static async getById(id: string): Promise<Category | null> {
    this.logDatabaseOperation('SELECT * FROM categories WHERE id = ?', `id=${id}`);
    
    const category = await prisma.category.findUnique({
      where: { id }
    });
    
    if (category) {
      console.log(`✅ Database found category: ${category.name} (${category.type})`);
      return {
        id: category.id,
        name: category.name,
        type: category.type,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString()
      };
    } else {
      console.log(`❌ Database: No category found with id=${id}`);
      return null;
    }
  }

  // Create new category in MySQL database
  static async create(data: { name: string; type: 'INCOME' | 'EXPENSE' }): Promise<Category> {
    this.logDatabaseOperation('INSERT INTO categories (name, type, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', `${data.name} (${data.type})`);
    
    const newCategory = await prisma.category.create({
      data: {
        name: data.name,
        type: data.type
      }
    });
    
    console.log(`✅ Database created category with id=${newCategory.id}`);
    
    return {
      id: newCategory.id,
      name: newCategory.name,
      type: newCategory.type,
      createdAt: newCategory.createdAt.toISOString(),
      updatedAt: newCategory.updatedAt.toISOString()
    };
  }

  // Update category in MySQL database
  static async update(id: string, data: Partial<{ name: string; type: 'INCOME' | 'EXPENSE' }>): Promise<Category | null> {
    const updateFields = Object.keys(data).join(', ');
    this.logDatabaseOperation('UPDATE categories SET updated_at = NOW() WHERE id = ?', `id=${id}, fields=[${updateFields}]`);
    
    try {
      const updatedCategory = await prisma.category.update({
        where: { id },
        data
      });
      
      console.log(`✅ Database updated category: ${updatedCategory.name} (${updatedCategory.type})`);
      
      return {
        id: updatedCategory.id,
        name: updatedCategory.name,
        type: updatedCategory.type,
        createdAt: updatedCategory.createdAt.toISOString(),
        updatedAt: updatedCategory.updatedAt.toISOString()
      };
    } catch (error) {
      console.log(`❌ Database: No category found with id=${id} to update`);
      return null;
    }
  }

  // Delete category from MySQL database
  static async delete(id: string): Promise<void> {
    this.logDatabaseOperation('DELETE FROM categories WHERE id = ?', `id=${id}`);
    
    try {
      const deletedCategory = await prisma.category.delete({
        where: { id }
      });
      console.log(`✅ Database deleted category: ${deletedCategory.name}`);
    } catch (error) {
      console.log(`⚠️  Database: No category found with id=${id} to delete`);
    }
  }

  // Get categories by type from MySQL database
  static async getByType(type: 'INCOME' | 'EXPENSE'): Promise<Category[]> {
    this.logDatabaseOperation('SELECT * FROM categories WHERE type = ? ORDER BY name ASC', `type=${type}`);
    
    const result = await prisma.category.findMany({
      where: { type },
      orderBy: { name: 'asc' }
    });
    
    console.log(`✅ Database returned ${result.length} ${type} categories`);
    
    return result.map(cat => ({
      id: cat.id,
      name: cat.name,
      type: cat.type,
      createdAt: cat.createdAt.toISOString(),
      updatedAt: cat.updatedAt.toISOString()
    }));
  }
}
