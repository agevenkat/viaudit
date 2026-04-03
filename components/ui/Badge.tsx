import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'accent';

interface BadgeProps {
  variant?:  BadgeVariant;
  children:  React.ReactNode;
  className?: string;
}

const styles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/15   text-amber-400   border-amber-500/20',
  danger:  'bg-red-500/15     text-red-400     border-red-500/20',
  neutral: 'bg-[var(--bg3)]   text-[var(--text-muted)] border-[var(--border)]',
  accent:  'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent)]/20',
};

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
