'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authFetch } from '@/lib/api';

interface AuditLog {
  id: string;
  actorEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  summary: string;
  createdAt: string;
}

interface AuditPagination {
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  total: number;
}

const PAGE_SIZE = 25;

export default function AuditPage() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<AuditPagination | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    const fetchAudit = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await authFetch(`/api/audit?page=${page}&pageSize=${PAGE_SIZE}`);
        const result = await response.json();

        if (result.success) {
          setLogs(result.data);
          setPagination(result.pagination);
        } else {
          setError(result.error || 'Failed to load audit trail');
        }
      } catch (err) {
        setError('Failed to load audit trail');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAudit();
  }, [isAdmin, page]);

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const actionBadgeClass = (action: string) => {
    switch (action?.toUpperCase()) {
      case 'CREATE':
        return 'bg-green-900/50 text-green-300';
      case 'UPDATE':
        return 'bg-blue-900/50 text-blue-300';
      case 'DELETE':
        return 'bg-red-900/50 text-red-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-foreground">Audit Trail</h1>
        </div>
        <div className="border border-border rounded-lg bg-card p-8 text-center">
          <span className="text-4xl mb-4 block">🔒</span>
          <h2 className="text-xl font-semibold text-foreground mb-2">Access denied — admins only</h2>
          <p className="text-muted-foreground">You do not have permission to view the audit trail.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">Audit Trail</h1>
        <p className="text-muted-foreground">Review actions taken across the account</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
          {error}
        </div>
      )}

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Activity</h2>
          {pagination && (
            <span className="text-sm text-muted-foreground">{pagination.total} total</span>
          )}
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <span className="text-4xl mb-4 block">📋</span>
            <p className="text-muted-foreground">No audit entries found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Summary
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-accent">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {formatTime(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {log.actorEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${actionBadgeClass(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {log.resource}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{log.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevPage}
              className="px-3 py-2 bg-muted hover:bg-accent text-foreground rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNextPage}
              className="px-3 py-2 bg-muted hover:bg-accent text-foreground rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
