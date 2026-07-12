'use client';

import { useState } from 'react';
import { UserRole, AuthResponse } from '@/types/user';

interface LoginPageProps {
  onLogin: (authData: AuthResponse) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Attempting login:', email);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Login successful:', data.user.name);
        onLogin(data);
      } else {
        console.error('❌ Login failed:', data.error);
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('💥 Login error:', error);
      setError('Network error - please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-foreground">💰 Luka Finance</h1>
          <p className="text-muted-foreground">Multi-User Financial Management System</p>
        </div>

        <div className="bg-card rounded-xl p-8 border border-border">
          <h2 className="text-2xl font-bold mb-6 text-foreground">Sign In</h2>
          
          {error && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-400 text-sm">❌ {error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-muted-foreground text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-muted-foreground text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-muted text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-foreground border-t-transparent"></div>
                  Signing in...
                </>
              ) : (
                <>
                  🔐 Sign In
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 text-muted-foreground text-sm">
          <p>🏦 Multi-Account • 👥 Role-Based Access • 📊 Real-time Reports</p>
        </div>
      </div>
    </div>
  );
}
