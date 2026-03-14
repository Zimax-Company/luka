import Navigation from '@/components/Navigation'
import ReportsPage from '@/components/ReportsPage'

export default function Reports() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      <main className="bg-black">
        <ReportsPage />
      </main>
    </div>
  )
}
