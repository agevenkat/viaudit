'use client';

import React from 'react';

type Variant = 'primary' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?:    Size;
  loading?: boolean;
}

const base =
  'inline-flex items-center justify-center rounded-lg font-body font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  primary:
    'bg-[var(--accent)] text-[#000000] hover:opacity-90 focus-visible:ring-[var(--accent)]',
  ghost:
    'border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg3)] focus-visible:ring-[var(--border)]',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
};

const sizes: Record<Size, string> = {
  sm:  'h-8  px-3 text-sm gap-1.5',
  md:  'h-10 px-4 text-sm gap-2',
  lg:  'h-12 px-6 text-base gap-2',
};

export function Button({
  variant = 'primary',
  size    = 'md',
  loading = false,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
