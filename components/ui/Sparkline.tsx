import React from 'react';

interface SparklineProps {
  data:    number[];
  width?:  number;
  height?: number;
  color?:  string;
}

export function Sparkline({ data, width = 120, height = 40, color = 'var(--accent)' }: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const polyline = points.join(' ');
  const lastPt   = points[points.length - 1]?.split(',') ?? ['0', '0'];
  const lastX    = parseFloat(lastPt[0] ?? '0');
  const lastY    = parseFloat(lastPt[1] ?? '0');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <polyline
        points={polyline}
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      {/* Endpoint dot */}
      <circle cx={lastX} cy={lastY} r="3" fill={color} />
    </svg>
  );
}
