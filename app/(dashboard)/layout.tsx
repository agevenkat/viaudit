import React from 'react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ROUTES, APP_NAME } from '@/lib/constants';
import { AlertBell } from '@/components/dashboard/AlertBell';

const NAV_ITEMS = [
  { href: ROUTES.DASHBOARD,    label: 'Overview',     icon: 'grid'       },
  { href: ROUTES.BRANDS,       label: 'Brands',       icon: 'box'        },
  { href: ROUTES.REPORTS,      label: 'Reports',      icon: 'file-text'  },
  { href: ROUTES.AUDIT,        label: 'GEO Audit',    icon: 'search'     },
  { href: ROUTES.OPTIMIZER,    label: 'AI Optimizer', icon: 'zap'        },
  { href: ROUTES.INTEGRATIONS, label: 'Integrations', icon: 'plug'       },
  { href: ROUTES.SETTINGS,     label: 'Settings',     icon: 'settings'   },
];

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    box:  <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
    'file-text': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,
    search:   <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    zap:      <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
    plug:     <><path d="M18 6L6 18"/><path d="M7 17l-5 5"/><path d="M17 7l5-5"/><circle cx="10.5" cy="13.5" r="2.5"/><circle cx="13.5" cy="10.5" r="2.5"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></>,
  };
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      {paths[name]}
    </svg>
  );
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect(ROUTES.LOGIN);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-[var(--border)] bg-[var(--bg2)] shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-[var(--border)]">
          <Link href={ROUTES.DASHBOARD} className="font-heading text-xl font-bold text-[var(--accent)]">
            {APP_NAME}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
            >
              <NavIcon name={icon} />
              {label}
            </Link>
          ))}
        </nav>

        {/* User + Alerts */}
        <div className="px-4 py-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] text-sm font-bold shrink-0">
              {session.user.name?.[0]?.toUpperCase() ?? session.user.email?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session.user.name ?? 'User'}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{session.user.plan}</p>
            </div>
            <AlertBell />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
