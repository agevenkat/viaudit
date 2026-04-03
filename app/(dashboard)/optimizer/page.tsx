'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Change {
  type: 'addition' | 'rewrite' | 'structure';
  description: string;
  before?: string;
  after: string;
}

interface OptimizationResult {
  originalContent: string;
  optimizedContent: string;
  changes: Change[];
  geoTactics: string[];
  predictedLift: number;
  factorsImproved: string[];
}

/* ------------------------------------------------------------------ */
/*  Loading-step labels                                                */
/* ------------------------------------------------------------------ */

const LOADING_STEPS = [
  'Analyzing content...',
  'Identifying AI-visibility weaknesses...',
  'Applying GEO tactics...',
  'Generating optimized version...',
];

/* ------------------------------------------------------------------ */
/*  Small helper components                                            */
/* ------------------------------------------------------------------ */

function TypeBadge({ type }: { type: Change['type'] }) {
  const styles: Record<Change['type'], string> = {
    addition:  'bg-green-500/20 text-green-400',
    rewrite:   'bg-yellow-500/20 text-yellow-400',
    structure: 'bg-blue-500/20 text-blue-400',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[type]}`}>
      {type}
    </span>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-[var(--accent)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function SpinnerDot() {
  return (
    <span className="inline-flex gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:300ms]" />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function OptimizerPage() {
  /* ---- form state ---- */
  const [content, setContent]     = useState('');
  const [brandName, setBrandName] = useState('');
  const [category, setCategory]   = useState('');

  /* ---- async state ---- */
  const [loading, setLoading]       = useState(false);
  const [loadStep, setLoadStep]     = useState(0);
  const [error, setError]           = useState<string | null>(null);
  const [result, setResult]         = useState<OptimizationResult | null>(null);
  const [copied, setCopied]         = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  /* Animate through loading steps */
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => {
      setLoadStep((s) => (s < LOADING_STEPS.length - 1 ? s + 1 : s));
    }, 4000);
    return () => clearInterval(id);
  }, [loading]);

  /* Scroll to results when they arrive */
  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  /* ---- handlers ---- */
  async function handleOptimize() {
    setError(null);
    setResult(null);
    setLoadStep(0);
    setLoading(true);

    try {
      const res = await fetch('/api/optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, brandName, category }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Something went wrong');
      }

      setResult(data as OptimizationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result.optimizedContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const canSubmit = content.trim().length > 0 && brandName.trim().length > 0 && category.trim().length > 0;

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-[var(--text)]">AI Content Optimizer</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Paste your page content, and we will rewrite it for maximum AI-engine visibility using GEO best practices.
        </p>
      </div>

      {/* ---- Input Section ---- */}
      <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Brand Name"
            placeholder="e.g. Acme Analytics"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
          />
          <Input
            label="Category"
            placeholder="e.g. Business Intelligence Software"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--text)]">Page Content</label>
          <textarea
            rows={8}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg3)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]/50 transition-colors resize-y"
            placeholder="Paste your page content here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <p className="text-xs text-[var(--text-muted)]">
            {content.length.toLocaleString()} characters
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="lg"
            loading={loading}
            disabled={!canSubmit}
            onClick={handleOptimize}
          >
            Optimize for AI Visibility
          </Button>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>
      </div>

      {/* ---- Loading State ---- */}
      {loading && (
        <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-8">
          <div className="flex flex-col items-center gap-6">
            {/* Progress bar */}
            <div className="w-full max-w-md">
              <div className="h-1.5 rounded-full bg-[var(--bg3)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all duration-1000 ease-out"
                  style={{ width: `${((loadStep + 1) / LOADING_STEPS.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-2">
              {LOADING_STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-3 text-sm">
                  {i < loadStep ? (
                    <CheckIcon />
                  ) : i === loadStep ? (
                    <SpinnerDot />
                  ) : (
                    <span className="w-4 h-4" />
                  )}
                  <span className={i <= loadStep ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---- Results Section ---- */}
      {result && (
        <div ref={resultsRef} className="space-y-8">
          {/* Before / After comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Original */}
            <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-6">
              <h2 className="font-heading text-lg font-semibold text-[var(--text-muted)] mb-4">Original</h2>
              <div className="max-h-[500px] overflow-y-auto rounded-lg bg-[var(--bg3)] p-4 text-sm text-[var(--text-muted)] whitespace-pre-wrap leading-relaxed">
                {result.originalContent}
              </div>
            </div>

            {/* Optimized */}
            <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-lg font-semibold text-[var(--accent)]">Optimized</h2>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors px-2 py-1 rounded-md hover:bg-[var(--bg3)]"
                >
                  <CopyIcon />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="max-h-[500px] overflow-y-auto rounded-lg bg-[var(--bg3)] p-4 text-sm text-[var(--text)] whitespace-pre-wrap leading-relaxed">
                {result.optimizedContent}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Predicted Lift */}
            <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-6 flex flex-col items-center text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-2">Predicted Visibility Lift</p>
              <p className="font-heading text-4xl font-bold text-[var(--accent)]">+{result.predictedLift}%</p>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Estimated improvement in AI-engine citation probability
              </p>
            </div>

            {/* GEO Tactics Applied */}
            <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-3">GEO Tactics Applied</p>
              <ul className="space-y-2">
                {result.geoTactics.map((tactic) => (
                  <li key={tactic} className="flex items-start gap-2 text-sm text-[var(--text)]">
                    <CheckIcon />
                    <span>{tactic}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Factors Improved */}
            <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-3">Factors Improved</p>
              <div className="flex flex-wrap gap-2">
                {result.factorsImproved.map((factor) => (
                  <span
                    key={factor}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--accent)]/15 text-[var(--accent)]"
                  >
                    {factor}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Changes Made */}
          <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-xl p-6">
            <h2 className="font-heading text-lg font-semibold text-[var(--text)] mb-4">
              Changes Made
              <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
                ({result.changes.length} total)
              </span>
            </h2>

            <div className="space-y-4">
              {result.changes.map((change, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg3)] p-4"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-semibold text-[var(--text-muted)]">#{i + 1}</span>
                    <TypeBadge type={change.type} />
                    <p className="text-sm text-[var(--text)]">{change.description}</p>
                  </div>

                  {change.before && (
                    <div className="mt-2 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2">
                      <p className="text-xs font-medium text-red-400 mb-1">Before</p>
                      <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap">{change.before}</p>
                    </div>
                  )}

                  <div className={`rounded-md px-3 py-2 ${change.type === 'addition' ? 'bg-green-500/10 border border-green-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'} ${change.before ? 'mt-2' : 'mt-2'}`}>
                    <p className={`text-xs font-medium mb-1 ${change.type === 'addition' ? 'text-green-400' : 'text-yellow-400'}`}>
                      {change.type === 'addition' ? 'Added' : 'After'}
                    </p>
                    <p className="text-sm text-[var(--text)] whitespace-pre-wrap">{change.after}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
