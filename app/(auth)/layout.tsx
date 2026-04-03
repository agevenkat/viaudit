import React from 'react';
import Link from 'next/link';
import { APP_NAME } from '@/lib/constants';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-[var(--bg)]">
      <Link href="/" className="mb-10 flex items-center gap-2">
        <span className="font-heading text-2xl font-bold text-[var(--accent)]">{APP_NAME}</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
