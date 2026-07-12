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
    { name: 'Transactions', href: '/transactions', icon: '💰', permission: 'canCreateTransactions' },
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
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none"
              aria-controls="mobile-menu"
              aria-expanded="false"
              onClick={toggleMobileMenu}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <span className="block h-6 w-6">✕</span>
              ) : (
                <span className="block h-6 w-6">☰</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-muted">
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
            
            {/* Mobile user info */}
            {currentUser && (
              <div className="border-t border-border pt-3 mt-3">
                <div className="px-3 py-2 text-muted-foreground">
                  <div className="text-sm">👋 {currentUser.name}</div>
                  <div className="text-xs text-muted-foreground">{currentUser.role}</div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    closeMobileMenu();
                  }}
                  className="block w-full text-left px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
