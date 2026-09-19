import Navigation from '@/components/Navigation'
import ThemeToggle from '@/components/ThemeToggle'
import ChangePasswordForm from '@/components/ChangePasswordForm'

export default function Settings() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="bg-background">
        <div className="container mx-auto px-6 py-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 text-foreground">Settings</h1>
            <p className="text-muted-foreground">Configure your application preferences</p>
          </div>

          <div className="border border-border rounded-lg bg-card p-8 mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-1">Appearance</h2>
            <p className="text-muted-foreground mb-4">Choose how Luka looks to you.</p>
            <ThemeToggle />
          </div>

          <div className="border border-border rounded-lg bg-card p-8 mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-1">Security</h2>
            <p className="text-muted-foreground mb-4">Change your password.</p>
            <ChangePasswordForm />
          </div>
        </div>
      </main>
    </div>
  )
}
