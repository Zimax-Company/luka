import Navigation from '@/components/Navigation'
import ReportsPage from '@/components/ReportsPage'

export default function Reports() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="bg-background">
        <ReportsPage />
      </main>
    </div>
  )
}
