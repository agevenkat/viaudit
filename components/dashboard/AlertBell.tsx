'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

// ── Types ────────────────────────────────────────────────────

interface Alert {
  id: string;
  type: 'SCORE_DROP' | 'COMPETITOR_SURGE' | 'ENGINE_CHANGE' | 'WEEKLY_DIGEST';
  title: string;
  message: string;
  brandName?: string | null;
  readAt: string | null;
  createdAt: string;
}

interface AlertsResponse {
  alerts: Alert[];
  unreadCount: number;
}

// ── Icon by type ─────────────────────────────────────────────

function AlertIcon({ type }: { type: Alert['type'] }) {
  const size = 'h-5 w-5 flex-shrink-0';
  switch (type) {
    case 'SCORE_DROP':
      return (
        <svg className={`${size} text-red-400`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a.75.75 0 01.55.24l6.25 6.75a.75.75 0 11-1.1 1.02L10 5.16 4.3 11.01a.75.75 0 01-1.1-1.02l6.25-6.75A.75.75 0 0110 3z" clipRule="evenodd" transform="rotate(180 10 10)" />
          <path d="M10 7.5v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'COMPETITOR_SURGE':
      return (
        <svg className={`${size} text-orange-400`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 1a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 1zm5.303 2.197a.75.75 0 010 1.06l-1.06 1.061a.75.75 0 01-1.06-1.06l1.06-1.061a.75.75 0 011.06 0zM16.25 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 01.75.75zM4.697 3.197a.75.75 0 011.06 0l1.061 1.06a.75.75 0 01-1.06 1.061l-1.061-1.06a.75.75 0 010-1.061zM6 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 016 10zm7 0a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'ENGINE_CHANGE':
      return (
        <svg className={`${size} text-yellow-400`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      );
    case 'WEEKLY_DIGEST':
      return (
        <svg className={`${size} text-blue-400`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v11.75A2.75 2.75 0 0016.75 18h-12A2.75 2.75 0 012 15.25V3.5zm3.75 7a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5zm0-3a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5z" clipRule="evenodd" />
          <path d="M14 15.25a.75.75 0 001.5 0V6A1.5 1.5 0 0117 7.5v7.75A2.75 2.75 0 0114.25 18H14v-2.75z" />
        </svg>
      );
  }
}

// ── Time-ago helper ──────────────────────────────────────────

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

// ── Main component ───────────────────────────────────────────

export function AlertBell() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts?page=1');
      if (!res.ok) return;
      const data: AlertsResponse = await res.json();
      setAlerts(data.alerts);
      setUnreadCount(data.unreadCount);
    } catch {
      // silently ignore fetch errors for polling
    }
  }, []);

  // Initial fetch + polling every 60s
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60_000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const markAllRead = useCallback(async () => {
    const unread = alerts.filter((a) => !a.readAt).map((a) => a.id);
    if (unread.length === 0) return;

    try {
      const res = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertIds: unread }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.readAt ? a : { ...a, readAt: new Date().toISOString() })),
        );
        setUnreadCount(0);
      }
    } catch {
      // ignore
    }
  }, [alerts]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 2a6 6 0 00-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 00.515 1.076 32.91 32.91 0 003.256.508 3.5 3.5 0 006.972 0 32.903 32.903 0 003.256-.508.75.75 0 00.515-1.076A11.448 11.448 0 0116 8a6 6 0 00-6-6zM8.05 14.943a33.54 33.54 0 003.9 0 2 2 0 01-3.9 0z"
            clipRule="evenodd"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[28rem] rounded-xl border border-[var(--border)] bg-[var(--bg2)] shadow-2xl overflow-hidden z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text)]">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-[var(--accent)] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Alert list */}
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
            {alerts.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                No notifications yet.
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`px-4 py-3 flex gap-3 transition-colors ${
                    alert.readAt ? 'opacity-60' : 'bg-[var(--bg3)]/40'
                  }`}
                >
                  <AlertIcon type={alert.type} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-[var(--text)] truncate">
                        {alert.title}
                      </p>
                      <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap flex-shrink-0">
                        {timeAgo(alert.createdAt)}
                      </span>
                    </div>
                    {alert.brandName && (
                      <p className="text-xs text-[var(--accent)] mt-0.5">{alert.brandName}</p>
                    )}
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">
                      {alert.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
