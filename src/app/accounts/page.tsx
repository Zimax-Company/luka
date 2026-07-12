import Navigation from '@/components/Navigation'
import AccountsPage from '@/components/AccountsPage'

export default function Accounts() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="bg-background">
        <AccountsPage />
      </main>
    </div>
  )
}
