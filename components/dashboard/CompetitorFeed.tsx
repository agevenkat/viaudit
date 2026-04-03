'use client';

import React from 'react';

interface CompetitorRow {
  domain:        string;
  citationCount: number;
}

interface Props {
  brandName:       string;
  brandShare:      number;
  brandMentions:   number;
  totalPrompts:    number;
  competitors:     CompetitorRow[];
  delta:           number | null;
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-2 rounded-full bg-[var(--bg3)] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(2, pct))}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function CompetitorFeed({
  brandName,
  brandShare,
  brandMentions,
  totalPrompts,
  competitors,
  delta,
}: Props) {
  const brandPct  = Math.round(brandShare);
  const maxCount  = Math.max(brandMentions, ...competitors.map((c) => c.citationCount), 1);

  return (
    <div className="flex flex-col gap-4">

      {/* Your brand row */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />
            <span className="font-semibold">{brandName}</span>
            <span className="text-xs text-[var(--text-muted)]">(you)</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[var(--text-muted)]">{brandMentions}/{totalPrompts} mentions</span>
            <span className="font-bold text-[var(--accent)]">{brandPct}% SoV</span>
            {delta !== null && (
              <span className={`font-medium ${delta >= 0 ? 'text-[var(--accent)]' : 'text-red-400'}`}>
                {delta >= 0 ? `+${delta}` : delta} pts
              </span>
            )}
          </div>
        </div>
        <Bar pct={(brandMentions / maxCount) * 100} color="var(--accent)" />
      </div>

      {/* Competitor rows */}
      {competitors.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide mb-1">
            Competitors cited in AI responses
          </p>
          {competitors.map((c, i) => {
            const pct   = Math.round((c.citationCount / maxCount) * 100);
            const ahead = c.citationCount > brandMentions;
            return (
              <div key={c.domain} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: `hsl(${(i * 67 + 210) % 360}, 60%, 55%)` }}
                    />
                    <span className="text-[var(--text-muted)] text-xs">{c.domain}</span>
                    {ahead && (
                      <span className="text-[10px] text-red-400 font-medium">▲ ahead</span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">{c.citationCount} citations</span>
                </div>
                <Bar
                  pct={pct}
                  color={`hsl(${(i * 67 + 210) % 360}, 60%, 55%)`}
                />
              </div>
            );
          })}
        </div>
      )}

      {competitors.length === 0 && (
        <p className="text-xs text-[var(--text-muted)] italic">
          No competitor citations found in the latest scan results.
        </p>
      )}

      <p className="text-[10px] text-[var(--text-muted)] pt-1">
        Share of Voice = brand AI mentions ÷ all tracked mentions across ChatGPT, Perplexity, Gemini &amp; Claude
      </p>
    </div>
  );
}
