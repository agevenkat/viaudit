'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface Scan {
  id:        string;
  brandId:   string;
  weekOf:    string;
  status:    string;
  createdAt: string;
  brand:     { name: string };
  results:   { id: string }[];
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  COMPLETE: 'success',
  RUNNING:  'warning',
  PENDING:  'neutral',
  FAILED:   'danger',
};

function ScanProgressRow({ scan }: { scan: Scan }) {
  const elapsed = (Date.now() - new Date(scan.createdAt).getTime()) / 1000;
  const steps = [
    { label: 'Queued',                  done: true },
    { label: 'Querying AI engines',     done: elapsed > 30 },
    { label: 'Scoring responses',       done: elapsed > 180 },
    { label: 'Generating recommendations', done: elapsed > 270 },
  ];

  const activeStep = steps.filter((s) => s.done).length - 1;

  return (
    <div className="mt-3 px-1">
      <div className="flex items-center gap-0">
        {steps.map((step, i) => {
          const isActive  = i === activeStep;
          const isDone    = step.done && i < activeStep;
          const isPending = !step.done;

          return (
            <React.Fragment key={step.label}>
              <div className="flex flex-col items-center gap-1.5 min-w-0">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    isDone    ? 'bg-[var(--accent)] text-black' :
                    isActive  ? 'bg-[var(--accent)]/20 border-2 border-[var(--accent)] text-[var(--accent)]' :
                                'bg-[var(--bg3)] text-[var(--text-muted)]'
                  }`}
                >
                  {isDone ? '✓' : isActive ? (
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping inline-block" />
                  ) : i + 1}
                </div>
                <span
                  className={`text-[9px] text-center leading-tight hidden md:block w-16 ${
                    isActive ? 'text-[var(--accent)] font-medium' : isPending ? 'text-[var(--bg3)]' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mb-4 mx-1 transition-all ${step.done ? 'bg-[var(--accent)]' : 'bg-[var(--bg3)]'}`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[var(--border)] animate-pulse">
      <td className="px-4 py-3"><div className="h-3.5 w-24 bg-[var(--bg3)] rounded" /></td>
      <td className="px-4 py-3"><div className="h-3.5 w-20 bg-[var(--bg3)] rounded" /></td>
      <td className="px-4 py-3"><div className="h-3.5 w-8  bg-[var(--bg3)] rounded" /></td>
      <td className="px-4 py-3"><div className="h-5  w-16 bg-[var(--bg3)] rounded-full" /></td>
      <td className="px-4 py-3"><div className="h-3.5 w-20 bg-[var(--bg3)] rounded" /></td>
      <td className="px-4 py-3" />
    </tr>
  );
}

export default function ReportsPage() {
  const [scans, setScans]   = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef               = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchScans() {
    const res  = await fetch('/api/scans');
    const data = (await res.json()) as { scans?: Scan[] };
    // Enrich with brand name — the API/scans GET doesn't include brand, so use existing data or re-fetch via brands API
    setScans((prev) => {
      const enriched = (data.scans ?? []).map((s) => ({
        ...s,
        brand:   prev.find((p) => p.id === s.id)?.brand ?? { name: '—' },
        results: prev.find((p) => p.id === s.id)?.results ?? [],
      }));
      return enriched;
    });
    setLoading(false);
  }

  async function fetchFull() {
    // Use the brands endpoint which includes scans with brand names
    const res  = await fetch('/api/brands');
    const data = (await res.json()) as { brands?: Array<{ id: string; name: string; scans: Array<{ id: string; brandId: string; weekOf: string; status: string; createdAt: string; results: { id: string }[] }> }> };
    const allScans: Scan[] = (data.brands ?? []).flatMap((b) =>
      (b.scans ?? []).map((s) => ({
        ...s,
        brand:   { name: b.name },
        results: s.results ?? [],
      })),
    );
    allScans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setScans(allScans.slice(0, 100));
    setLoading(false);
  }

  useEffect(() => { void fetchFull(); }, []);

  // Auto-poll while any scan is RUNNING or PENDING
  useEffect(() => {
    const hasActive = scans.some(
      (s) => s.status === 'RUNNING' || s.status === 'PENDING',
    );

    if (hasActive && !pollRef.current) {
      pollRef.current = setInterval(() => void fetchFull(), 8000);
    } else if (!hasActive && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [scans]);

  const activeScans   = scans.filter((s) => s.status === 'RUNNING' || s.status === 'PENDING');
  const finishedScans = scans.filter((s) => s.status !== 'RUNNING' && s.status !== 'PENDING');

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold">Reports</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">Full scan history across all your brands.</p>
      </div>

      {/* Active scans — prominent cards at the top */}
      {activeScans.length > 0 && (
        <div className="mb-8 flex flex-col gap-4">
          {activeScans.map((scan) => (
            <div
              key={scan.id}
              className="rounded-2xl border border-[var(--accent)]/40 bg-[var(--bg2)] p-5"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-[var(--accent)]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span className="font-heading font-bold">{scan.brand.name}</span>
                  <Badge variant="warning">
                    {scan.status === 'PENDING' ? 'Queued' : 'Generating report…'}
                  </Badge>
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  Started {new Date(scan.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                Week of {new Date(scan.weekOf).toLocaleDateString()} · Refreshing automatically…
              </p>
              <ScanProgressRow scan={scan} />
            </div>
          ))}
        </div>
      )}

      {/* Finished scans table */}
      {loading ? (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Brand</th>
                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Week of</th>
                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Results</th>
                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Status</th>
                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
            </tbody>
          </table>
        </Card>
      ) : finishedScans.length === 0 && activeScans.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-[var(--text-muted)]">No scans yet. Go to Brands and run your first scan.</p>
        </Card>
      ) : finishedScans.length > 0 ? (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Brand</th>
                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Week of</th>
                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Results</th>
                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Status</th>
                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {finishedScans.map((scan) => (
                <tr key={scan.id} className="border-b border-[var(--border)] hover:bg-[var(--bg3)] transition-colors last:border-0">
                  <td className="px-4 py-3 font-medium">{scan.brand.name}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {new Date(scan.weekOf).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{scan.results?.length ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[scan.status] ?? 'neutral'}>{scan.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {new Date(scan.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {scan.status === 'COMPLETE' && (
                      <Link
                        href={`/reports/${scan.id}`}
                        className="text-[var(--accent)] text-xs font-medium hover:underline"
                      >
                        View report →
                      </Link>
                    )}
                    {scan.status === 'FAILED' && (
                      <span className="text-xs text-red-400">Failed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </div>
  );
}
