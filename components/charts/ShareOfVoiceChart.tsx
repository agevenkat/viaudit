'use client';

import React from 'react';

interface Props {
  brandName:   string;
  brandShare:  number;
  competitors: string[];
}

export function ShareOfVoiceChart({ brandName, brandShare, competitors }: Props) {
  const remaining      = Math.max(0, 100 - brandShare);
  const compCount      = competitors.length || 1;
  const perCompetitor  = remaining / compCount;

  const bars = [
    { label: brandName, value: brandShare,    color: 'var(--accent)' },
    ...competitors.map((c, i) => ({
      label: c,
      value: perCompetitor,
      color: `hsl(${200 + i * 40}, 70%, 60%)`,
    })),
  ];

  return (
    <div className="flex flex-col gap-3">
      {bars.map(({ label, value, color }) => (
        <div key={label} className="flex items-center gap-3">
          <span className="w-28 text-xs text-[var(--text-muted)] truncate shrink-0">{label}</span>
          <div className="flex-1 h-2 bg-[var(--bg3)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${value}%`, backgroundColor: color }}
            />
          </div>
          <span className="w-10 text-xs text-right text-[var(--text-muted)] shrink-0">
            {Math.round(value)}%
          </span>
        </div>
      ))}
    </div>
  );
}
