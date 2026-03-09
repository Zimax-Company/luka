import Navigation from '@/components/Navigation'
import CategoriesPage from '@/components/CategoriesPage'

export default function Categories() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      <main className="bg-black">
        <CategoriesPage />
      </main>
    </div>
  )
}
