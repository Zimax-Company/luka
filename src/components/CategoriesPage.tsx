'use client'

import React, { useState, useEffect } from 'react'
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '@/types/category'
import { authFetch } from '@/lib/api'

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
    <div className="border border-border rounded-lg bg-card p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-muted-foreground">
            Category Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter category name"
            required
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="type" className="block text-sm font-medium text-muted-foreground">
            Type
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as 'INCOME' | 'EXPENSE')}
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <option value="INCOME">💰 Income</option>
            <option value="EXPENSE">💳 Expense</option>
          </select>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border hover:border-border rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:opacity-80 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL')
  const [page, setPage] = useState(1)

  const PAGE_SIZE = 20

  const filteredCategories = categories.filter((category: Category) => {
    if (filterType === 'ALL') return true
    return category.type === filterType
  })

  // Client-side pagination (the categories endpoint returns the full list).
  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedCategories = filteredCategories.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  // Reset to the first page when the type filter changes.
  useEffect(() => {
    setPage(1)
  }, [filterType])

  const fetchCategories = async () => {
    try {
      const response = await authFetch('/api/categories')
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
      const response = await authFetch('/api/categories', {
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
      const response = await authFetch(`/api/categories/${id}`, {
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
      const response = await authFetch(`/api/categories/${id}`, { method: 'DELETE' })
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
      <div className="flex items-center justify-center min-h-[400px] bg-background">
        <div className="text-lg text-muted-foreground">Loading categories...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">Categories</h1>
        <p className="text-muted-foreground">Manage your income and expense categories</p>
      </div>

      {!showForm && !editingCategory && (
        <div className="mb-8">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:opacity-80 rounded-lg font-medium transition-colors"
          >
            <span className="text-lg">+</span>
            Add Category
          </button>
        </div>
      )}

      {(showForm || editingCategory) && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
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
          <h2 className="text-xl font-semibold text-foreground">
            Categories ({filteredCategories.length})
          </h2>
        </div>
        
        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === 'ALL' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            All ({categories.length})
          </button>
          <button
            onClick={() => setFilterType('INCOME')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === 'INCOME' 
                ? 'bg-green-600 text-white' 
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            💰 Income ({categories.filter((cat: Category) => cat.type === 'INCOME').length})
          </button>
          <button
            onClick={() => setFilterType('EXPENSE')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === 'EXPENSE' 
                ? 'bg-red-600 text-white' 
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            💳 Expense ({categories.filter((cat: Category) => cat.type === 'EXPENSE').length})
          </button>
        </div>
        
        {filteredCategories.length === 0 ? (
          <div className="text-center py-16 border border-border rounded-lg bg-card">
            {filterType === 'ALL' ? (
              <>
                <p className="text-muted-foreground text-lg">No categories found</p>
                <p className="text-muted-foreground text-sm mt-1">Create your first category to get started</p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground text-lg">No {filterType.toLowerCase()} categories found</p>
                <p className="text-muted-foreground text-sm mt-1">Create your first {filterType.toLowerCase()} category to get started</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {paginatedCategories.map((category: Category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg text-2xl ${
                    category.type === 'INCOME' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                  }`}>
                    {category.type === 'INCOME' ? '💰' : '💳'}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {category.type} • Created {new Date(category.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingCategory(category)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteCategory(category.id)}
                    className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination controls */}
        {filteredCategories.length > PAGE_SIZE && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Showing{' '}
              <span className="font-medium text-foreground">
                {(currentPage - 1) * PAGE_SIZE + 1}
              </span>
              –
              <span className="font-medium text-foreground">
                {(currentPage - 1) * PAGE_SIZE + paginatedCategories.length}
              </span>{' '}
              of <span className="font-medium text-foreground">{filteredCategories.length}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-2 bg-muted hover:bg-accent text-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <span className="text-sm text-muted-foreground px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-2 bg-muted hover:bg-accent text-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
