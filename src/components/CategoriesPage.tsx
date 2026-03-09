'use client'

import React, { useState, useEffect } from 'react'
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '@/types/category'

interface CategoryFormProps {
  category?: Category
  onSubmit: (data: CreateCategoryRequest | UpdateCategoryRequest) => void
  onCancel: () => void
  isLoading: boolean
}

function CategoryForm({ category, onSubmit, onCancel, isLoading }: CategoryFormProps) {
  const [name, setName] = useState(category?.name || '')
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(category?.type || 'EXPENSE')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), type })
  }

  return (
    <div className="border border-gray-800 rounded-lg bg-gray-900/50 p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-300">
            Category Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter category name"
            required
            className="w-full px-3 py-2 bg-black border border-gray-700 rounded-md text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="type" className="block text-sm font-medium text-gray-300">
            Type
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as 'INCOME' | 'EXPENSE')}
            className="w-full px-3 py-2 bg-black border border-gray-700 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <option value="INCOME">💰 Income</option>
            <option value="EXPENSE">💳 Expense</option>
          </select>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className="px-4 py-2 text-sm font-medium text-black bg-white hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Saving...' : category ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      if (data.success) {
        setCategories(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const createCategory = async (categoryData: CreateCategoryRequest) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      })
      const data = await response.json()
      if (data.success) {
        setCategories([...categories, data.data])
        setShowForm(false)
      }
    } catch (error) {
      console.error('Failed to create category:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateCategory = async (id: string, categoryData: UpdateCategoryRequest) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      })
      const data = await response.json()
      if (data.success) {
        setCategories(categories.map(cat => cat.id === id ? data.data : cat))
        setEditingCategory(null)
      }
    } catch (error) {
      console.error('Failed to update category:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return
    
    try {
      const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      const data = await response.json()
      if (data.success) {
        setCategories(categories.filter(cat => cat.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete category:', error)
    }
  }

  const handleFormSubmit = (data: CreateCategoryRequest | UpdateCategoryRequest) => {
    if (editingCategory) {
      updateCategory(editingCategory.id, data)
    } else {
      createCategory(data as CreateCategoryRequest)
    }
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingCategory(null)
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-black">
        <div className="text-lg text-gray-400">Loading categories...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-white">Categories</h1>
        <p className="text-gray-400">Manage your income and expense categories</p>
      </div>

      {!showForm && !editingCategory && (
        <div className="mb-8">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-gray-100 rounded-lg font-medium transition-colors"
          >
            <span className="text-lg">+</span>
            Add Category
          </button>
        </div>
      )}

      {(showForm || editingCategory) && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-white">
            {editingCategory ? 'Edit Category' : 'Create New Category'}
          </h2>
          <CategoryForm
            category={editingCategory || undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleCancelForm}
            isLoading={isSubmitting}
          />
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            Categories ({categories.length})
          </h2>
        </div>
        
        {categories.length === 0 ? (
          <div className="text-center py-16 border border-gray-800 rounded-lg bg-gray-900/30">
            <p className="text-gray-400 text-lg">No categories found</p>
            <p className="text-gray-500 text-sm mt-1">Create your first category to get started</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-4 border border-gray-800 rounded-lg bg-gray-900/30 hover:bg-gray-900/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg text-2xl ${
                    category.type === 'INCOME' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                  }`}>
                    {category.type === 'INCOME' ? '💰' : '💳'}
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{category.name}</h3>
                    <p className="text-sm text-gray-400">
                      {category.type} • Created {new Date(category.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingCategory(category)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteCategory(category.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
