import { Category } from '@/types/category';

// In-memory store for categories (will be replaced with Prisma when DATABASE_URL is available)
let categories: Category[] = [
  {
    id: '1',
    name: 'Salary',
    type: 'INCOME',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Food',
    type: 'EXPENSE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export class CategoryService {
  static async getAll(): Promise<Category[]> {
    // Simulate async operation
    return Promise.resolve([...categories]);
  }

  static async getById(id: string): Promise<Category | null> {
    const category = categories.find(category => category.id === id);
    return Promise.resolve(category || null);
  }

  static async create(data: { name: string; type: 'INCOME' | 'EXPENSE' }): Promise<Category> {
    const category: Category = {
      id: Date.now().toString(),
      name: data.name,
      type: data.type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    categories.push(category);
    return Promise.resolve(category);
  }

  static async update(id: string, data: { name?: string; type?: 'INCOME' | 'EXPENSE' }): Promise<Category | null> {
    const index = categories.findIndex(category => category.id === id);
    if (index === -1) return Promise.resolve(null);

    categories[index] = {
      ...categories[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    return Promise.resolve(categories[index]);
  }

  static async delete(id: string): Promise<boolean> {
    const index = categories.findIndex(category => category.id === id);
    if (index === -1) return Promise.resolve(false);
    categories.splice(index, 1);
    return Promise.resolve(true);
  }
}
