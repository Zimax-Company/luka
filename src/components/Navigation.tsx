'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { User, UserPermissions } from '@/types/user'
import { useAuth } from '@/contexts/AuthContext'

interface NavigationProps {
  currentUser?: User;
  permissions?: UserPermissions;
}

export default function Navigation({ currentUser, permissions }: NavigationProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { logout } = useAuth()

  // Base navigation items
  const baseNavigation = [
    { name: 'Dashboard', href: '/', icon: '🏠', permission: null },
    { name: 'Accounts', href: '/accounts', icon: '🏦', permission: 'canEditAccounts' },
    { name: 'Categories', href: '/categories', icon: '📁', permission: null },
    { name: 'Entries', href: '/entries', icon: '💰', permission: 'canCreateTransactions' },
    { name: 'Reports', href: '/reports', icon: '📊', permission: 'canViewReports' },
  ];

  // Add user management for admins
  const navigation = [
    ...baseNavigation,
    ...(permissions?.canManageUsers ? [{ name: 'Users', href: '/users', icon: '👥', permission: 'canManageUsers' }] : []),
    { name: 'Settings', href: '/settings', icon: '⚙️', permission: null },
  ];

  // Filter navigation based on permissions
  const filteredNavigation = navigation.filter(item => {
    if (!item.permission || !permissions) return true;
    return permissions[item.permission as keyof UserPermissions];
  });

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <nav className="bg-card border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="text-foreground font-bold text-xl">
                💰 Luka Finance
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {filteredNavigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === item.href
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* User info and logout */}
          {currentUser && (
            <div className="hidden md:block">
              <div className="ml-4 flex items-center md:ml-6">
                <div className="text-muted-foreground mr-4">
                  <div className="text-sm">👋 {currentUser.name}</div>
                  <div className="text-xs text-muted-foreground">{currentUser.role}</div>
                </div>
                <button
                  onClick={logout}
                  className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm transition-colors"
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          )}

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="text-muted-foreground hover:text-foreground p-2"
              aria-label="Toggle mobile menu"
            >
              <span className="text-lg">{mobileMenuOpen ? '✕' : '☰'}</span>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 pt-4 border-t border-border">
            {/* User Info in Mobile Menu */}
            {currentUser && (
              <div className="px-3 py-3 border-b border-border mb-4">
                <div className="text-sm font-medium text-foreground">👋 {currentUser.name}</div>
                <div className="text-xs text-muted-foreground">{currentUser.role}</div>
              </div>
            )}

            <div className="space-y-1 px-2 pt-2 pb-3">
              {filteredNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Logout in Mobile Menu */}
            {currentUser && (
              <div className="border-t border-border px-2 pt-4 pb-3">
                <button
                  onClick={() => {
                    logout()
                    closeMobileMenu()
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
