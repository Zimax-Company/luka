import Navigation from '@/components/Navigation'
import CategoriesPage from '@/components/CategoriesPage'

export default function Categories() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="bg-background">
        <CategoriesPage />
      </main>
    </div>
  )
}
