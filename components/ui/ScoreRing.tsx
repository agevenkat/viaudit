import React from 'react';

interface ScoreRingProps {
  score:  number; // 0–100
  size?:  number;
  stroke?: number;
  label?: string;
}

export function ScoreRing({ score, size = 120, stroke = 8, label }: ScoreRingProps) {
  const r      = (size - stroke) / 2;
  const circ   = 2 * Math.PI * r;
  const filled = (Math.min(100, Math.max(0, score)) / 100) * circ;
  const cx     = size / 2;
  const cy     = size / 2;

  const color =
    score >= 70 ? 'var(--accent)' :
    score >= 40 ? '#f59e0b'       :
    '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="var(--bg3)"
          strokeWidth={stroke}
        />
        {/* Fill */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-heading font-bold text-[var(--text)]" style={{ fontSize: size * 0.22 }}>
          {Math.round(score)}
        </span>
        {label && (
          <span className="text-[var(--text-muted)]" style={{ fontSize: size * 0.1 }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
