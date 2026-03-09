import Navigation from "@/components/Navigation";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      <main className="bg-black">
        <div className="container mx-auto px-6 py-8 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 text-white">Dashboard</h1>
            <p className="text-gray-400">Welcome to your financial management dashboard</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="border border-gray-800 rounded-lg bg-gray-900/30 p-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">💰</span>
                <h3 className="text-lg font-semibold text-white">Total Income</h3>
              </div>
              <p className="text-3xl font-bold text-green-400">$5,250</p>
              <p className="text-sm text-gray-400">+12% from last month</p>
            </div>

            <div className="border border-gray-800 rounded-lg bg-gray-900/30 p-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">💳</span>
                <h3 className="text-lg font-semibold text-white">Total Expenses</h3>
              </div>
              <p className="text-3xl font-bold text-red-400">$3,180</p>
              <p className="text-sm text-gray-400">-8% from last month</p>
            </div>

            <div className="border border-gray-800 rounded-lg bg-gray-900/30 p-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📈</span>
                <h3 className="text-lg font-semibold text-white">Net Savings</h3>
              </div>
              <p className="text-3xl font-bold text-blue-400">$2,070</p>
              <p className="text-sm text-gray-400">+28% from last month</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-800 rounded-lg bg-gray-900/30 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <a 
                  href="/categories" 
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors text-gray-300 hover:text-white"
                >
                  <span className="text-xl">📁</span>
                  <span>Manage Categories</span>
                  <span className="ml-auto text-gray-500">→</span>
                </a>
                <a 
                  href="/transactions" 
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors text-gray-300 hover:text-white"
                >
                  <span className="text-xl">💰</span>
                  <span>Add Transaction</span>
                  <span className="ml-auto text-gray-500">→</span>
                </a>
                <a 
                  href="/reports" 
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors text-gray-300 hover:text-white"
                >
                  <span className="text-xl">📊</span>
                  <span>View Reports</span>
                  <span className="ml-auto text-gray-500">→</span>
                </a>
              </div>
            </div>

            <div className="border border-gray-800 rounded-lg bg-gray-900/30 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30">
                  <span className="text-lg">🍔</span>
                  <div className="flex-1">
                    <p className="text-white text-sm">Lunch at Restaurant</p>
                    <p className="text-gray-400 text-xs">Food • 2 hours ago</p>
                  </div>
                  <span className="text-red-400 font-medium">-$25.00</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30">
                  <span className="text-lg">💼</span>
                  <div className="flex-1">
                    <p className="text-white text-sm">Salary Payment</p>
                    <p className="text-gray-400 text-xs">Salary • Yesterday</p>
                  </div>
                  <span className="text-green-400 font-medium">+$3,500.00</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30">
                  <span className="text-lg">⛽</span>
                  <div className="flex-1">
                    <p className="text-white text-sm">Gas Station</p>
                    <p className="text-gray-400 text-xs">Transportation • 2 days ago</p>
                  </div>
                  <span className="text-red-400 font-medium">-$45.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
