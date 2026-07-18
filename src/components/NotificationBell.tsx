'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { authFetch } from '@/lib/api'

interface Notification {
  id: string;
  actorName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  resource: 'entry';
  resourceId: string;
  accountId: string;
  accountName: string;
  summary: string;
  readAt: string | null;
  createdAt: string;
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return new Date(iso).toLocaleDateString()
}

const POLL_INTERVAL_MS = 30_000

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await authFetch('/api/notifications/unread-count')
      if (!res.ok) return
      const json = await res.json()
      if (json?.success && typeof json.count === 'number') {
        setUnreadCount(json.count)
      }
    } catch {
      // Silent — polling failures shouldn't disrupt the nav.
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch('/api/notifications?page=1&pageSize=20')
      if (!res.ok) throw new Error('Failed to load notifications')
      const json = await res.json()
      if (!json?.success) throw new Error('Failed to load notifications')
      setNotifications(Array.isArray(json.data) ? json.data : [])
      if (typeof json.unreadCount === 'number') setUnreadCount(json.unreadCount)
    } catch {
      setError('Could not load notifications. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch + polling for the unread count.
  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // Load the list whenever the panel opens.
  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  // Click-outside to close.
  useEffect(() => {
    if (!open) return
    const handleClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const markAllRead = async () => {
    setMarkingAll(true)
    try {
      const res = await authFetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        const json = await res.json()
        if (typeof json?.unreadCount === 'number') setUnreadCount(json.unreadCount)
        else setUnreadCount(0)
        setNotifications((prev) =>
          prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() }))
        )
      }
    } catch {
      // Ignore; badge will re-sync on next poll.
    } finally {
      setMarkingAll(false)
      fetchUnreadCount()
    }
  }

  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount)

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        className="relative p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-semibold leading-none">
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-md border border-border bg-card shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            <button
              type="button"
              onClick={markAllRead}
              disabled={markingAll || unreadCount === 0}
              className="text-xs text-blue-500 hover:text-blue-400 disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
            >
              {markingAll ? 'Marking…' : 'Mark all read'}
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : error ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-red-500 mb-2">{error}</p>
                <button
                  type="button"
                  onClick={fetchNotifications}
                  className="text-xs text-blue-500 hover:text-blue-400 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                You&apos;re all caught up.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 ${
                      n.readAt ? '' : 'bg-blue-600/5'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                        n.readAt ? 'bg-transparent' : 'bg-blue-500'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground break-words">{n.summary}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
