'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { User, UserPermissions } from '@/types/user'
import { useAuth } from '@/contexts/AuthContext'
import NotificationBell from '@/components/NotificationBell'
import { authFetch } from '@/lib/api'

interface NavigationProps {
  currentUser?: User;
  permissions?: UserPermissions;
}

interface NavItem {
  name: string;
  href: string;
  icon: string;
  permission: keyof UserPermissions | null;
  adminOnly?: boolean;
  ownerOnly?: boolean;
}

export default function Navigation({ currentUser: currentUserProp, permissions: permissionsProp }: NavigationProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [incomingCount, setIncomingCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [isRoot, setIsRoot] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const { logout, currentUser: authUser, permissions: authPermissions } = useAuth()

  // Prefer explicitly-passed props but fall back to the auth context so every
  // page renders an identical, permission-aware nav (the dashboard is the reference).
  const currentUser = currentUserProp ?? authUser ?? undefined
  const permissions = permissionsProp ?? authPermissions ?? undefined
  const role = currentUser?.role

  // Primary items stay lean; everything else collapses into the "More" menu,
  // mirroring the mobile app's More menu.
  const primaryNavigation: NavItem[] = [
    { name: 'Dashboard', href: '/', icon: '🏠', permission: null },
    { name: 'Entries', href: '/entries', icon: '💰', permission: 'canCreateTransactions' },
    { name: 'Inbox', href: '/inbox', icon: '📥', permission: null },
    { name: 'Categories', href: '/categories', icon: '📁', permission: null },
  ];

  const moreNavigation: NavItem[] = [
    { name: 'Accounts', href: '/accounts', icon: '🏦', permission: 'canEditAccounts' },
    { name: 'Postings', href: '/transfers', icon: '🔄', permission: null },
    { name: 'Schedules', href: '/schedules', icon: '🔁', permission: null },
    { name: 'Subscription', href: '/subscription', icon: '💳', permission: null, ownerOnly: true },
    { name: 'Reports', href: '/reports', icon: '📊', permission: 'canViewReports' },
    { name: 'Users', href: '/users', icon: '👥', permission: 'canManageUsers' },
    { name: 'Settings', href: '/settings', icon: '⚙️', permission: null },
    { name: 'Audit', href: '/audit', icon: '📋', permission: null, adminOnly: true },
  ];

  // Filter navigation based on permissions / role.
  const canShow = (item: NavItem) => {
    if (item.adminOnly && role !== 'ADMIN') return false;
    if (item.ownerOnly && !isRoot) return false;
    if (!item.permission) return true;
    if (!permissions) return true;
    return !!permissions[item.permission];
  };

  const primaryItems = primaryNavigation.filter(canShow);
  const moreItems = moreNavigation.filter(canShow);
  const isMoreActive = moreItems.some((item) => pathname === item.href);

  const toggleMobileMenu = () => setMobileMenuOpen((prev) => !prev)
  const closeMobileMenu = () => setMobileMenuOpen(false)

  // Close menus on route change.
  useEffect(() => {
    setMobileMenuOpen(false)
    setMoreMenuOpen(false)
  }, [pathname])

  // Surface a pending-incoming transfer count on the Transfers nav link.
  useEffect(() => {
    if (!currentUser) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await authFetch('/api/transfers?box=incoming')
        const json = await res.json()
        if (!cancelled && json?.success && Array.isArray(json.data)) {
          setIncomingCount(json.data.length)
        }
      } catch {
        // Non-critical; leave the badge hidden on failure.
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // Refresh when navigating (e.g. after accepting/rejecting on the Postings page).
  }, [currentUser, pathname])

  // Surface the pending review-inbox count on the Inbox nav link (polled, like
  // the notification badge).
  useEffect(() => {
    if (!currentUser) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await authFetch('/api/drafts/count')
        const json = await res.json()
        if (!cancelled && json?.success && typeof json.count === 'number') {
          setPendingCount(json.count)
        }
      } catch {
        // Non-critical; leave the badge hidden on failure.
      }
    }
    load()
    const interval = setInterval(load, 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [currentUser, pathname])

  // Only the customer owner (root user) may see the Subscription link/page.
  useEffect(() => {
    if (!currentUser) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await authFetch('/api/subscription')
        const json = await res.json()
        if (!cancelled) setIsRoot(!!(json?.data?.isRoot ?? json?.isRoot))
      } catch {
        if (!cancelled) setIsRoot(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [currentUser])

  // Close the "More" dropdown when clicking outside it.
  useEffect(() => {
    if (!moreMenuOpen) return
    const handleClick = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [moreMenuOpen])

  const linkClass = (active: boolean) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
    }`

  // Red pending-count badge shared by the Inbox and Postings nav links.
  const badgeFor = (href: string, className = 'ml-2') => {
    const count = href === '/inbox' ? pendingCount : href === '/transfers' ? incomingCount : 0
    if (count <= 0) return null
    return (
      <span
        className={`${className} inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-600 text-white text-xs font-semibold`}
      >
        {count}
      </span>
    )
  }

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-40">
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
                {primaryItems.map((item) => (
                  <Link key={item.name} href={item.href} className={linkClass(pathname === item.href)}>
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                    {badgeFor(item.href)}
                  </Link>
                ))}

                {/* More dropdown */}
                {moreItems.length > 0 && (
                  <div className="relative" ref={moreMenuRef}>
                    <button
                      type="button"
                      onClick={() => setMoreMenuOpen((prev) => !prev)}
                      aria-haspopup="true"
                      aria-expanded={moreMenuOpen}
                      className={linkClass(isMoreActive)}
                    >
                      <span className="mr-2">☰</span>
                      More
                      <span className="ml-1 text-xs">▾</span>
                    </button>

                    {moreMenuOpen && (
                      <div className="absolute right-0 mt-2 w-52 rounded-md border border-border bg-card shadow-lg z-50 py-1">
                        {moreItems.map((item) => (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center px-4 py-2 text-sm transition-colors ${
                              pathname === item.href
                                ? 'bg-muted text-foreground'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                            }`}
                          >
                            <span className="mr-2">{item.icon}</span>
                            {item.name}
                            {badgeFor(item.href, 'ml-auto')}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User info and logout */}
          {currentUser && (
            <div className="hidden md:block">
              <div className="ml-4 flex items-center md:ml-6">
                <div className="mr-4">
                  <NotificationBell />
                </div>
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
          <div className="md:hidden flex items-center gap-1">
            {currentUser && <NotificationBell />}
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

            <div className="space-y-1 px-2">
              {[...primaryItems, ...moreItems].map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                  {badgeFor(item.href, 'ml-auto')}
                </Link>
              ))}
            </div>

            {/* Logout in Mobile Menu */}
            {currentUser && (
              <div className="border-t border-border px-2 pt-4 mt-4">
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
