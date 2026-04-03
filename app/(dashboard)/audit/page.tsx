'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScoreRing } from '@/components/ui/ScoreRing';

// ── Types mirrored from geoAuditScorer ─────────────────────────

interface AuditFactor {
  id: string;
  category: string;
  name: string;
  score: number;
  maxScore: number;
  passed: boolean;
  detail: string;
  fix?: string;
}

interface AuditSuggestion {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  expectedLift: string;
}

interface AuditResult {
  id?: string;
  url: string;
  overallScore: number;
  factors: AuditFactor[];
  suggestions: AuditSuggestion[];
  crawledAt: string;
}

// ── Constants ──────────────────────────────────────────────────

const CATEGORIES = [
  'Structured Data',
  'Content Quality',
  'Citation Readiness',
  'Technical SEO for AI',
  'Authority Signals',
] as const;

const CATEGORY_ICONS: Record<string, string> = {
  'Structured Data': '{...}',
  'Content Quality': 'Aa',
  'Citation Readiness': '"  "',
  'Technical SEO for AI': '</>',
  'Authority Signals': '***',
};

const PROGRESS_MESSAGES = [
  'Fetching page content...',
  'Parsing structured data schemas...',
  'Analyzing content depth & quality...',
  'Evaluating citation readiness...',
  'Checking technical SEO signals...',
  'Measuring authority indicators...',
  'Scoring 25 AI visibility factors...',
  'Generating prioritized recommendations...',
];

// ── Component ──────────────────────────────────────────────────

export default function AuditPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressIdx, setProgressIdx] = useState(0);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState('');

  const runAudit = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setProgressIdx(0);

    // Cycle progress messages while waiting
    const interval = setInterval(() => {
      setProgressIdx((prev) => (prev + 1) % PROGRESS_MESSAGES.length);
    }, 2200);

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Audit failed');
      }

      setResult(data.audit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }, [url]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) runAudit();
  };

  const getCategoryScore = (category: string) => {
    if (!result) return { earned: 0, max: 0 };
    const items = result.factors.filter((f) => f.category === category);
    return {
      earned: items.reduce((s, f) => s + f.score, 0),
      max: items.reduce((s, f) => s + f.maxScore, 0),
    };
  };

  const priorityColor = (p: string) => {
    if (p === 'HIGH') return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (p === 'MEDIUM') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-[var(--text)] mb-2">
          GEO Audit Scorecard
        </h1>
        <p className="text-[var(--text-muted)]">
          Analyze any page across 25 AI-visibility factors and get actionable fixes to improve your brand&apos;s presence in AI answers.
        </p>
      </div>

      {/* URL Input */}
      <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-6 mb-8">
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
          </div>
          <Button variant="primary" size="lg" loading={loading} onClick={runAudit}>
            {loading ? 'Scanning...' : result ? 'Re-audit' : 'Run Audit'}
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-10 mb-8 flex flex-col items-center gap-6">
          {/* Animated pulse ring */}
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full border-4 border-[var(--accent)]/30 animate-ping" />
            <div className="absolute inset-2 rounded-full border-4 border-[var(--accent)]/50 animate-pulse" />
            <div className="absolute inset-4 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-[var(--accent)] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
          </div>
          <div className="text-center">
            <p className="font-heading text-lg font-semibold text-[var(--text)] mb-1">
              Analyzing 25 AI visibility factors...
            </p>
            <p className="text-sm text-[var(--accent)] transition-all duration-300">
              {PROGRESS_MESSAGES[progressIdx]}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-8">
          <p className="text-red-400 text-sm font-medium">Audit failed: {error}</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-8">
          {/* Score Overview */}
          <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <ScoreRing score={result.overallScore} size={160} stroke={10} label="/ 100" />
              <div className="flex-1 text-center md:text-left">
                <h2 className="font-heading text-2xl font-bold text-[var(--text)] mb-2">
                  {result.overallScore >= 70
                    ? 'Strong AI Visibility'
                    : result.overallScore >= 40
                      ? 'Moderate AI Visibility'
                      : 'Low AI Visibility'}
                </h2>
                <p className="text-[var(--text-muted)] mb-4">
                  {result.url} scored {result.overallScore}/100 across {result.factors.length} factors.
                  {result.factors.filter((f) => f.passed).length} passed,{' '}
                  {result.factors.filter((f) => !f.passed).length} need improvement.
                </p>
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  {CATEGORIES.map((cat) => {
                    const { earned, max } = getCategoryScore(cat);
                    const pct = max > 0 ? Math.round((earned / max) * 100) : 0;
                    return (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg3)] text-xs font-medium text-[var(--text-muted)]"
                      >
                        <span className="text-[var(--text)]">{CATEGORY_ICONS[cat]}</span>
                        {cat}: {earned}/{max}
                        <span
                          className={
                            pct >= 70
                              ? 'text-[var(--accent)]'
                              : pct >= 40
                                ? 'text-yellow-400'
                                : 'text-red-400'
                          }
                        >
                          ({pct}%)
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Top Suggestions */}
          {result.suggestions.length > 0 && (
            <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-6">
              <h3 className="font-heading text-lg font-bold text-[var(--text)] mb-4">
                Priority Action Items
              </h3>
              <div className="space-y-3">
                {result.suggestions.slice(0, 8).map((s, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 bg-[var(--bg3)] rounded-lg p-4"
                  >
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold border ${priorityColor(s.priority)}`}
                    >
                      {s.priority}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text)]">{s.title}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.description}</p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-[var(--accent)]">
                      {s.expectedLift}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Breakdowns */}
          {CATEGORIES.map((category) => {
            const items = result.factors.filter((f) => f.category === category);
            const { earned, max } = getCategoryScore(category);
            return (
              <div
                key={category}
                className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading text-lg font-bold text-[var(--text)] flex items-center gap-2">
                    <span className="text-[var(--accent)] text-sm font-mono">
                      {CATEGORY_ICONS[category]}
                    </span>
                    {category}
                  </h3>
                  <span className="text-sm font-medium text-[var(--text-muted)]">
                    {earned}/{max}
                  </span>
                </div>

                <div className="space-y-2">
                  {items.map((f) => (
                    <div key={f.id}>
                      <div
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                          f.passed ? 'bg-[var(--bg3)]' : 'bg-red-500/5'
                        }`}
                      >
                        {/* Status icon */}
                        <span
                          className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                            f.passed
                              ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {f.passed ? '\u2713' : '\u2717'}
                        </span>

                        {/* Name & detail */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              f.passed ? 'text-[var(--text)]' : 'text-red-300'
                            }`}
                          >
                            {f.name}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] truncate">{f.detail}</p>
                        </div>

                        {/* Score */}
                        <span
                          className={`shrink-0 text-sm font-bold ${
                            f.passed ? 'text-[var(--accent)]' : 'text-red-400'
                          }`}
                        >
                          {f.score}/{f.maxScore}
                        </span>
                      </div>

                      {/* Fix suggestion */}
                      {!f.passed && f.fix && (
                        <div className="ml-9 mr-4 mt-1 mb-2 px-4 py-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                          <p className="text-xs text-yellow-300">
                            <span className="font-semibold">Fix:</span> {f.fix}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Actions */}
          <div className="flex items-center gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                /* PDF placeholder */
                alert('PDF export coming soon!');
              }}
            >
              Download PDF
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setResult(null);
                runAudit();
              }}
            >
              Re-audit
            </Button>
          </div>

          {/* Timestamp */}
          <p className="text-xs text-[var(--text-muted)] text-center">
            Audited at {new Date(result.crawledAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
