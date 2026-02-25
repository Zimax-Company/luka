import { Category } from '@/types/category';

// In-memory store for categories (replace with database in production)
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
  static getAll(): Category[] {
    return categories;
  }

  static getById(id: string): Category | undefined {
    return categories.find(category => category.id === id);
  }

  static create(data: { name: string; type: 'INCOME' | 'EXPENSE' }): Category {
    const category: Category = {
      id: Date.now().toString(),
      name: data.name,
      type: data.type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    categories.push(category);
    return category;
  }

  static update(id: string, data: { name?: string; type?: 'INCOME' | 'EXPENSE' }): Category | null {
    const index = categories.findIndex(category => category.id === id);
    if (index === -1) return null;

    categories[index] = {
      ...categories[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    return categories[index];
  }

  static delete(id: string): boolean {
    const index = categories.findIndex(category => category.id === id);
    if (index === -1) return false;
    categories.splice(index, 1);
    return true;
  }
}
