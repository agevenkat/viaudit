'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { APP_NAME, ROUTES } from '@/lib/constants';

const CATEGORIES = [
  'CRM & Sales',
  'Marketing Automation',
  'Project Management',
  'Customer Support',
  'HR & Recruiting',
  'Finance & Accounting',
  'Analytics & BI',
  'DevOps & Engineering',
  'Cybersecurity',
  'E-commerce',
  'Communication & Collaboration',
  'Other',
];

export default function OnboardingPage() {
  const { update } = useSession();
  const { toast }  = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const [form, setForm] = useState({
    name:        '',
    domain:      '',
    category:    CATEGORIES[0] ?? '',
    competitors: ['', '', ''],
  });

  function setCompetitor(index: number, value: string) {
    const next = [...form.competitors] as [string, string, string];
    next[index] = value;
    setForm({ ...form, competitors: next });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const competitors = form.competitors.filter((c) => c.trim().length > 0);

      const res = await fetch('/api/brands/onboarding', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:     form.name,
          domain:   form.domain,
          category: form.category,
          competitors,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast(data.error ?? 'Something went wrong', 'error');
        return;
      }

      toast('Brand set up! Running your first visibility scan.', 'success');
      // Patch the JWT so the proxy sees onboardingComplete = true immediately,
      // then hard-navigate so the fresh cookie is sent with the next request.
      await update({ onboardingComplete: true });
      window.location.href = ROUTES.DASHBOARD;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-[var(--bg)]">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-10 text-center">
          <span className="font-heading text-2xl font-bold text-[var(--accent)]">{APP_NAME}</span>
          <h1 className="font-heading text-3xl font-bold mt-4 mb-2">
            Set up your first brand
          </h1>
          <p className="text-[var(--text-muted)]">
            We'll track how it appears across ChatGPT, Perplexity, Gemini, and Claude.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {[1, 2].map((s) => (
            <React.Fragment key={s}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step === s
                    ? 'bg-[var(--accent)] text-[#08090a]'
                    : step > s
                    ? 'bg-[var(--accent)]/30 text-[var(--accent)]'
                    : 'bg-[var(--bg3)] text-[var(--text-muted)]'
                }`}
              >
                {s}
              </div>
              {s < 2 && <div className="flex-1 max-w-[60px] h-px bg-[var(--border)]" />}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-2xl p-8 flex flex-col gap-5">
            {step === 1 && (
              <>
                <h2 className="font-heading text-lg font-bold">Brand details</h2>
                <Input
                  label="Brand / company name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Acme Inc."
                  required
                />
                <Input
                  label="Website domain"
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  placeholder="acme.com"
                  required
                />
                <Select
                  label="Product category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
                <Button
                  type="button"
                  className="mt-2 w-full"
                  onClick={() => setStep(2)}
                  disabled={!form.name || !form.domain}
                >
                  Next →
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <h2 className="font-heading text-lg font-bold">Add competitors</h2>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    We'll track share of voice across all AI engines. Add up to 3.
                  </p>
                </div>
                {[0, 1, 2].map((i) => (
                  <Input
                    key={i}
                    label={`Competitor ${i + 1}${i === 0 ? '' : ' (optional)'}`}
                    value={form.competitors[i] ?? ''}
                    onChange={(e) => setCompetitor(i, e.target.value)}
                    placeholder="competitor.com"
                    required={i === 0}
                  />
                ))}
                <div className="flex gap-3 mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setStep(1)}
                  >
                    ← Back
                  </Button>
                  <Button type="submit" loading={loading} className="flex-1">
                    Launch audit
                  </Button>
                </div>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
