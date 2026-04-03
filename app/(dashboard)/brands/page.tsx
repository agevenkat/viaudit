'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

const CATEGORIES = [
  'CRM & Sales', 'Marketing Automation', 'Project Management',
  'Customer Support', 'HR & Recruiting', 'Finance & Accounting',
  'Analytics & BI', 'DevOps & Engineering', 'Cybersecurity',
  'E-commerce', 'Communication & Collaboration', 'Other',
];

interface Scan {
  status:    string;
  createdAt: string;
}

interface Brand {
  id:               string;
  name:             string;
  domain:           string;
  category:         string;
  competitors:      string[];
  createdAt:        string;
  scans:            Scan[];
  visibilityScores: Array<{ overallScore: number }>;
}

const SCAN_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  COMPLETE: 'success',
  RUNNING:  'warning',
  PENDING:  'neutral',
  FAILED:   'danger',
};

// ── Estimate progress step from elapsed seconds ───────────────
function scanProgressLabel(createdAt: string, status: string): string {
  if (status === 'PENDING') return 'Queued — waiting to start…';
  const elapsed = (Date.now() - new Date(createdAt).getTime()) / 1000;
  if (elapsed < 60)  return 'Generating prompts & querying AI engines…';
  if (elapsed < 180) return 'Analyzing responses across ChatGPT, Perplexity, Gemini & Claude…';
  if (elapsed < 300) return 'Calculating scores & building recommendations…';
  return 'Finalising report…';
}

// ── Animated scan spinner ─────────────────────────────────────
function ScanProgress({ scan }: { scan: Scan }) {
  const [label, setLabel] = useState(() => scanProgressLabel(scan.createdAt, scan.status));

  useEffect(() => {
    const t = setInterval(
      () => setLabel(scanProgressLabel(scan.createdAt, scan.status)),
      4000,
    );
    return () => clearInterval(t);
  }, [scan.createdAt, scan.status]);

  return (
    <div className="flex items-center gap-3 mt-3 px-3 py-2.5 rounded-lg bg-[var(--bg3)] border border-[var(--border)]">
      {/* Spinner */}
      <svg className="animate-spin h-4 w-4 shrink-0 text-[var(--accent)]" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>

      {/* Steps */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--accent)]">Report generating…</p>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">{label}</p>
      </div>

      {/* Pulsing dot */}
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-60" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--accent)]" />
      </span>
    </div>
  );
}

// ── Delete confirmation ───────────────────────────────────────
function DeleteConfirm({ onConfirm, loading }: { onConfirm: () => void; loading: boolean }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors px-2 py-1 rounded"
      >
        Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 bg-[var(--bg3)] rounded-lg px-2 py-1 border border-red-900/30">
      <span className="text-xs text-red-400">Sure?</span>
      <button
        onClick={() => { onConfirm(); setOpen(false); }}
        disabled={loading}
        className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
      >
        {loading ? '…' : 'Yes'}
      </button>
      <span className="text-[var(--text-muted)] text-xs">/</span>
      <button
        onClick={() => setOpen(false)}
        className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
      >
        No
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function BrandsPage() {
  const { toast }                     = useToast();
  const [brands, setBrands]           = useState<Brand[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showAdd, setShowAdd]         = useState(false);
  const [scanningId, setScanningId]   = useState<string | null>(null);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const pollRef                       = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState({
    name:        '',
    domain:      '',
    category:    CATEGORIES[0] ?? '',
    competitors: ['', '', ''],
  });
  const [submitting, setSubmitting] = useState(false);

  async function fetchBrands() {
    const res  = await fetch('/api/brands');
    const data = (await res.json()) as { brands: Brand[] };
    setBrands(data.brands ?? []);
    setLoading(false);
  }

  // Auto-poll while any scan is running / pending
  useEffect(() => {
    void fetchBrands();
  }, []);

  useEffect(() => {
    const hasActive = brands.some(
      (b) => b.scans[0]?.status === 'RUNNING' || b.scans[0]?.status === 'PENDING',
    );

    if (hasActive && !pollRef.current) {
      pollRef.current = setInterval(() => void fetchBrands(), 8000);
    } else if (!hasActive && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [brands]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res  = await fetch('/api/brands', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, competitors: form.competitors.filter((c) => c.trim()) }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { toast(data.error ?? 'Failed to add brand', 'error'); return; }
      toast('Brand added!', 'success');
      setShowAdd(false);
      setForm({ name: '', domain: '', category: CATEGORIES[0] ?? '', competitors: ['', '', ''] });
      void fetchBrands();
    } finally {
      setSubmitting(false);
    }
  }

  async function triggerScan(brandId: string) {
    setScanningId(brandId);
    try {
      const res  = await fetch('/api/scans', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ brandId }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (res.ok) {
        toast('Scan started! Report ready in ~5 minutes.', 'success');
        void fetchBrands();
      } else {
        toast(data.message ?? data.error ?? 'Failed to trigger scan', 'error');
      }
    } finally {
      setScanningId(null);
    }
  }

  async function deleteBrand(brandId: string) {
    setDeletingId(brandId);
    try {
      const res = await fetch(`/api/brands/${brandId}`, { method: 'DELETE' });
      if (res.ok) { toast('Brand deleted', 'success'); void fetchBrands(); }
      else         { toast('Failed to delete', 'error'); }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold">Brands</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Manage your tracked brands and run AI visibility scans.</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add brand</Button>
      </div>

      {loading ? (
        /* Skeleton */
        <div className="flex flex-col gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-6 animate-pulse">
              <div className="h-4 w-40 bg-[var(--bg3)] rounded mb-3" />
              <div className="h-3 w-24 bg-[var(--bg3)] rounded" />
            </div>
          ))}
        </div>
      ) : brands.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-[var(--text-muted)]">No brands yet. Add your first brand above.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {brands.map((brand) => {
            const lastScan   = brand.scans[0];
            const lastScore  = brand.visibilityScores[0];
            const isScanning = scanningId === brand.id;
            const isDeleting = deletingId === brand.id;
            const isActive   = lastScan?.status === 'RUNNING' || lastScan?.status === 'PENDING';

            return (
              <Card key={brand.id} className={`flex flex-col gap-4 transition-all ${isActive ? 'border-[var(--accent)]/40' : ''}`}>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Brand info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-heading font-bold text-base">{brand.name}</h2>
                      <Badge variant="neutral">{brand.category}</Badge>
                      {lastScan && !isActive && (
                        <Badge variant={SCAN_STATUS_VARIANT[lastScan.status] ?? 'neutral'}>
                          {lastScan.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-muted)] mt-1">{brand.domain}</p>
                    {brand.competitors.length > 0 && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        Tracking: {brand.competitors.join(' · ')}
                      </p>
                    )}
                  </div>

                  {/* Score */}
                  {lastScore && !isActive && (
                    <div className="text-center shrink-0 px-4">
                      <p className="font-heading text-2xl font-bold text-[var(--accent)]">
                        {Math.round(lastScore.overallScore)}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">AI Score</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <Button
                      size="sm"
                      loading={isScanning}
                      disabled={isActive}
                      onClick={() => void triggerScan(brand.id)}
                      className="min-w-[100px]"
                    >
                      {isActive ? 'Scanning…' : '▶ Run scan'}
                    </Button>

                    <DeleteConfirm
                      onConfirm={() => void deleteBrand(brand.id)}
                      loading={isDeleting}
                    />
                  </div>
                </div>

                {/* Inline scan progress */}
                {isActive && lastScan && (
                  <ScanProgress scan={lastScan} />
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add brand modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add brand">
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <Input label="Brand name"  value={form.name}   onChange={(e) => setForm({ ...form, name: e.target.value })}   required />
          <Input label="Domain"      value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} required />
          <Select
            label="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          {[0, 1, 2].map((i) => (
            <Input
              key={i}
              label={`Competitor ${i + 1}${i > 0 ? ' (optional)' : ''}`}
              value={form.competitors[i] ?? ''}
              onChange={(e) => {
                const next = [...form.competitors] as [string, string, string];
                next[i] = e.target.value;
                setForm({ ...form, competitors: next });
              }}
              required={i === 0}
            />
          ))}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={submitting} className="flex-1">Add brand</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
