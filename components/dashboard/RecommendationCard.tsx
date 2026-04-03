'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { Recommendation } from '@prisma/client';

interface Props {
  recommendation: Recommendation;
  onResolved?:    () => void;
}

const PRIORITY_VARIANT = {
  HIGH:   'danger',
  MEDIUM: 'warning',
  LOW:    'neutral',
} as const;

const TYPE_LABELS_MAP: Record<string, string> = {
  SCHEMA:     'Schema',
  CONTENT:    'Content',
  CITATION:   'Citation',
  TECHNICAL:  'Technical',
  GEO_FACTOR: 'GEO Factor',
};


export function RecommendationCard({ recommendation: rec, onResolved }: Props) {
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState(rec.resolved);
  const { toast } = useToast();

  async function markResolved() {
    setLoading(true);
    try {
      const res = await fetch(`/api/brands/${rec.brandId}/recommendations/${rec.id}/resolve`, {
        method: 'POST',
      });
      if (res.ok) {
        setResolved(true);
        toast('Recommendation marked as resolved', 'success');
        onResolved?.();
      } else {
        toast('Failed to mark resolved', 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  if (resolved) return null;

  return (
    <Card padding="sm" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={PRIORITY_VARIANT[rec.priority]}>{rec.priority}</Badge>
          <Badge variant="neutral">{TYPE_LABELS_MAP[rec.type] ?? rec.type}</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          loading={loading}
          onClick={markResolved}
          className="shrink-0 text-xs"
        >
          Mark resolved
        </Button>
      </div>
      <div>
        <p className="font-medium text-sm">{rec.title}</p>
        <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{rec.description}</p>
      </div>
      <p className="text-xs text-[var(--accent)]">
        Expected impact: {rec.expectedImpact}
      </p>
    </Card>
  );
}
