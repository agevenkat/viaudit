import React from 'react';
import { Card } from '@/components/ui/Card';
import type { VisibilityScore } from '@prisma/client';

interface Props {
  score: VisibilityScore | null;
}

const ENGINES = [
  { key: 'chatgptScore',    label: 'ChatGPT',    color: '#10a37f' },
  { key: 'perplexityScore', label: 'Perplexity', color: '#6366f1' },
  { key: 'geminiScore',     label: 'Gemini',     color: '#4285f4' },
  { key: 'claudeScore',     label: 'Claude',     color: '#d97706' },
] as const;

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--bg3)] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function EngineScoreCards({ score }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      {ENGINES.map(({ key, label, color }) => {
        const value = score ? Math.round(score[key] * 10) / 10 : null;
        return (
          <Card key={key} padding="sm">
            <p className="text-xs text-[var(--text-muted)] font-medium">{label}</p>
            <p className="font-heading text-3xl font-bold mt-1" style={{ color }}>
              {value ?? '—'}
            </p>
            {value !== null && <ScoreBar value={value} color={color} />}
          </Card>
        );
      })}
    </div>
  );
}
