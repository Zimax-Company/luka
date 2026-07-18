'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/api'

interface MemberUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface MembersData {
  account: { id: string; name: string };
  members: MemberUser[];
  admins: MemberUser[];
  candidates: MemberUser[];
  isAdmin: boolean;
}

interface AccountMembersModalProps {
  accountId: string;
  accountName: string;
  onClose: () => void;
}

export default function AccountMembersModal({ accountId, accountName, onClose }: AccountMembersModalProps) {
  const [data, setData] = useState<MembersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState('')
  const [adding, setAdding] = useState(false)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch(`/api/accounts/${accountId}/members`)
      if (!res.ok) throw new Error('Failed to load members')
      const json = await res.json()
      if (!json?.success) throw new Error('Failed to load members')
      setData(json.data as MembersData)
    } catch {
      setError('Could not load members. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const addMember = async () => {
    if (!selectedCandidate) return
    setAdding(true)
    setError(null)
    try {
      const res = await authFetch(`/api/accounts/${accountId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedCandidate }),
      })
      if (!res.ok) throw new Error('Failed to add member')
      setSelectedCandidate('')
      await fetchMembers()
    } catch {
      setError('Could not add the member. Please try again.')
    } finally {
      setAdding(false)
    }
  }

  const removeMember = async (userId: string) => {
    setBusyUserId(userId)
    setError(null)
    try {
      const res = await authFetch(`/api/accounts/${accountId}/members/${userId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to remove member')
      await fetchMembers()
    } catch {
      setError('Could not remove the member. Please try again.')
    } finally {
      setBusyUserId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-background/70 flex items-center justify-center p-4 z-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">👥 Members</h2>
            <p className="text-sm text-muted-foreground">{accountName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-2 rounded-md transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading members…</div>
          ) : error && !data ? (
            <div className="py-8 text-center">
              <p className="text-sm text-red-500 mb-2">{error}</p>
              <button
                onClick={fetchMembers}
                className="text-xs text-blue-500 hover:text-blue-400 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : data ? (
            <>
              {error && <p className="text-sm text-red-500">{error}</p>}

              {/* Members with explicit grants */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Members</h3>
                {data.members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members have been added yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.members.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-3 bg-muted border border-border rounded-lg px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                        </div>
                        {data.isAdmin && (
                          <button
                            onClick={() => removeMember(m.id)}
                            disabled={busyUserId === m.id}
                            className="flex-shrink-0 text-xs text-red-500 hover:text-red-400 disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
                          >
                            {busyUserId === m.id ? 'Removing…' : 'Remove'}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Admins — implicit all-access, not removable */}
              {data.admins.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">All-access (admin)</h3>
                  <ul className="space-y-2">
                    {data.admins.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between gap-3 bg-muted border border-border rounded-lg px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                        </div>
                        <span className="flex-shrink-0 text-xs text-muted-foreground">All-access</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Add a member (admins only) */}
              {data.isAdmin && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Add a member</h3>
                  {data.candidates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No users available to add.</p>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        value={selectedCandidate}
                        onChange={(e) => setSelectedCandidate(e.target.value)}
                        className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select a user…</option>
                        {data.candidates.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.email})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={addMember}
                        disabled={!selectedCandidate || adding}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-muted disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        {adding ? 'Adding…' : 'Add'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
