import Navigation from '@/components/Navigation'

export default function Transactions() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      <main className="bg-black">
        <div className="container mx-auto px-6 py-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 text-white">Transactions</h1>
            <p className="text-gray-400">Track your income and expenses</p>
          </div>
          
          <div className="border border-gray-800 rounded-lg bg-gray-900/30 p-8 text-center">
            <span className="text-6xl mb-4 block">💰</span>
            <h2 className="text-xl font-semibold text-white mb-2">Transactions Coming Soon</h2>
            <p className="text-gray-400">This feature is under development</p>
          </div>
        </div>
      </main>
    </div>
  )
}
