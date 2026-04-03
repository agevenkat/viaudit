'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { APP_NAME, ROUTES } from '@/lib/constants';

export default function RegisterPage() {
  const { toast } = useToast();
  const [loading, setLoading]   = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });

      const data = (await res.json()) as { error?: string; issues?: Record<string, string[]> };
      if (!res.ok) {
        toast(data.error ?? 'Registration failed', 'error');
        if (data.issues) console.error('Validation issues:', data.issues);
        return;
      }

      // Auto sign-in then hard-navigate to onboarding
      const result = await signIn('credentials', {
        email:    form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.ok) {
        window.location.href = ROUTES.ONBOARDING;
      } else {
        toast('Account created — please sign in', 'success');
        window.location.href = ROUTES.LOGIN;
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGLoading(true);
    await signIn('google', { callbackUrl: ROUTES.ONBOARDING });
  }

  return (
    <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-2xl p-8">
      <div className="mb-8 text-center">
        <span className="font-heading text-2xl font-bold text-[var(--accent)]">{APP_NAME}</span>
        <h1 className="font-heading text-2xl font-bold mt-3 mb-1">Get started free</h1>
        <p className="text-sm text-[var(--text-muted)]">Create your ViAudit account</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Full name"
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          autoComplete="name"
          placeholder="Jane Smith"
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          autoComplete="email"
          placeholder="you@company.com"
        />
        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          autoComplete="new-password"
          placeholder="••••••••"
          hint="Minimum 8 characters"
        />
        <Button type="submit" loading={loading} className="mt-2 w-full" size="lg">
          Create account
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative flex justify-center text-xs text-[var(--text-muted)] bg-[var(--bg2)] px-2">
          or continue with
        </div>
      </div>

      <Button variant="ghost" className="w-full" loading={gLoading} onClick={handleGoogle}>
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </Button>

      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
        Already have an account?{' '}
        <Link href={ROUTES.LOGIN} className="text-[var(--accent)] hover:underline font-medium">
          Sign in →
        </Link>
      </p>
    </div>
  );
}
