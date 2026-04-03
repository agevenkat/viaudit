'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { GEO_COUNTRIES, GEO_LANGUAGES } from '@/lib/geo/countries';

const ENGINES_COUNT = 7; // ChatGPT, Perplexity, Gemini, Claude, Google AIO, Copilot, Grok
const AVG_SECONDS_PER_SCAN = 45;

export default function BrandGeoPage() {
  const { id } = useParams<{ id: string }>();

  const [selectedCountries, setSelectedCountries] = useState<string[]>(['US']);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en']);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [saved, setSaved] = useState(false);

  // Fetch current brand geo settings
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/brands/${id}/geo`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.geoCountries?.length) setSelectedCountries(data.geoCountries);
        if (data.geoLanguages?.length) setSelectedLanguages(data.geoLanguages);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const toggleCountry = useCallback((code: string) => {
    setSelectedCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }, []);

  const toggleLanguage = useCallback((code: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code],
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedCountries(GEO_COUNTRIES.map((c) => c.code));
  }, []);

  const clearAll = useCallback(() => {
    setSelectedCountries([]);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/brands/${id}/geo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geoCountries: selectedCountries,
          geoLanguages: selectedLanguages,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }, [id, selectedCountries, selectedLanguages]);

  const totalScans = selectedCountries.length * ENGINES_COUNT;
  const estimatedMinutes = Math.ceil((totalScans * AVG_SECONDS_PER_SCAN) / 60);

  const filteredCountries = searchQuery
    ? GEO_COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.code.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : GEO_COUNTRIES;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)]">
          Geo + Language Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Choose which countries and languages to include in your AI visibility scans.
        </p>
      </div>

      {/* Scan estimate bar */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[var(--text)]">
            Scan Preview
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            This will run{' '}
            <span className="font-semibold text-[var(--accent)]">{totalScans}</span>{' '}
            scans per cycle ({selectedCountries.length} countries &times; {ENGINES_COUNT} engines)
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--text-muted)]">Estimated scan time</p>
          <p className="text-lg font-semibold text-[var(--text)]">
            ~{estimatedMinutes} min
          </p>
        </div>
      </div>

      {/* Languages */}
      <section>
        <h2 className="text-lg font-medium text-[var(--text)] mb-3">Languages</h2>
        <div className="flex flex-wrap gap-2">
          {GEO_LANGUAGES.map((lang) => {
            const active = selectedLanguages.includes(lang.code);
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => toggleLanguage(lang.code)}
                className={`
                  px-3 py-1.5 rounded-md text-sm font-medium transition-all
                  border
                  ${active
                    ? 'bg-green-600/20 border-green-500 text-green-400'
                    : 'bg-[var(--bg3)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                  }
                `}
              >
                {lang.nativeName}{' '}
                <span className="opacity-60">({lang.code})</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Countries */}
      <section>
        <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
          <h2 className="text-lg font-medium text-[var(--text)]">
            Countries{' '}
            <span className="text-sm font-normal text-[var(--text-muted)]">
              ({selectedCountries.length} selected)
            </span>
          </h2>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search countries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 px-3 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-[var(--text-muted)] hover:underline"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {filteredCountries.map((c) => {
            const active = selectedCountries.includes(c.code);
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => toggleCountry(c.code)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
                  border text-left
                  ${active
                    ? 'bg-green-600/20 border-green-500 text-[var(--text)]'
                    : 'bg-[var(--bg3)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                  }
                `}
              >
                <span className="text-lg leading-none">{c.flag}</span>
                <span className="truncate">{c.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-4">
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={selectedCountries.length === 0 || selectedLanguages.length === 0}
        >
          Save Geo Settings
        </Button>
        {saved && (
          <span className="text-sm text-green-400">Settings saved successfully.</span>
        )}
        {selectedCountries.length === 0 && (
          <span className="text-sm text-red-400">Select at least one country.</span>
        )}
        {selectedLanguages.length === 0 && (
          <span className="text-sm text-red-400">Select at least one language.</span>
        )}
      </div>
    </div>
  );
}
