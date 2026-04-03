import React from 'react';
import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma/client';
import { ROUTES } from '@/lib/constants';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { EngineScoreCards } from '@/components/dashboard/EngineScoreCards';
import { AnswerExplorer } from '@/components/dashboard/AnswerExplorer';
import { RecommendationCard } from '@/components/dashboard/RecommendationCard';

export const dynamic = 'force-dynamic';

const PRIORITY_VARIANT = {
  HIGH:   'danger',
  MEDIUM: 'warning',
  LOW:    'neutral',
} as const;

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect(ROUTES.LOGIN);

  const { id } = await params;

  const scan = await prisma.scan.findUnique({
    where:   { id },
    include: {
      brand:   true,
      results: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!scan) notFound();
  if (scan.brand.userId !== session.user.id) notFound();

  const [score, recommendations] = await Promise.all([
    prisma.visibilityScore.findUnique({
      where: { brandId_weekOf: { brandId: scan.brandId, weekOf: scan.weekOf } },
    }),
    prisma.recommendation.findMany({
      where:   { brandId: scan.brandId, weekOf: scan.weekOf },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  const mentionedResults = scan.results.filter((r) => r.brandMentioned);
  const mentionRate = scan.results.length
    ? Math.round((mentionedResults.length / scan.results.length) * 100)
    : 0;

  // Avg citation position
  const positioned = mentionedResults.filter((r) => r.citationPosition !== null);
  const avgPosition = positioned.length
    ? (positioned.reduce((s, r) => s + r.citationPosition!, 0) / positioned.length).toFixed(1)
    : null;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-[var(--text-muted)] mb-1">
          {new Date(scan.weekOf).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        <h1 className="font-heading text-3xl font-bold">{scan.brand.name}</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          {scan.brand.domain} · {scan.results.length} prompts across 4 AI engines
        </p>
      </div>

      {/* Score hero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="flex flex-col items-center gap-3 py-8">
          {score ? (
            <>
              <ScoreRing score={score.overallScore} size={120} />
              <p className="text-sm text-[var(--text-muted)]">AI Visibility Score</p>
            </>
          ) : (
            <p className="text-[var(--text-muted)] text-sm text-center py-4">Score pending</p>
          )}
        </Card>
        <div className="md:col-span-2">
          <EngineScoreCards score={score ?? null} />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        {[
          { label: 'Total prompts',    value: scan.results.length },
          { label: 'Brand mentions',   value: mentionedResults.length },
          { label: 'Mention rate',     value: `${mentionRate}%` },
          { label: 'Avg position',     value: avgPosition ? `#${avgPosition}` : '—' },
          { label: 'Share of voice',   value: score ? `${Math.round(score.shareOfVoice)}%` : '—' },
        ].map(({ label, value }) => (
          <Card key={label} padding="sm" className="text-center">
            <p className="font-heading text-2xl font-bold text-[var(--accent)]">{value}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{label}</p>
          </Card>
        ))}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-heading text-xl font-bold">Recommendations</h2>
            <span className="text-xs text-[var(--text-muted)] bg-[var(--bg3)] px-2 py-0.5 rounded-full">
              {recommendations.filter((r) => !r.resolved).length} open
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {recommendations.map((rec) => (
              rec.resolved ? (
                <Card key={rec.id} padding="sm" className="opacity-50">
                  <div className="flex items-center gap-2">
                    <Badge variant={PRIORITY_VARIANT[rec.priority]}>{rec.priority}</Badge>
                    <Badge variant="neutral">{rec.type}</Badge>
                    <Badge variant="success">Resolved ✓</Badge>
                    <p className="text-sm font-medium ml-2 line-through text-[var(--text-muted)]">{rec.title}</p>
                  </div>
                </Card>
              ) : (
                <RecommendationCard key={rec.id} recommendation={rec} />
              )
            ))}
          </div>
        </div>
      )}

      {/* Answer Explorer — the core feature */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-heading text-xl font-bold">Answer Explorer</h2>
          <span className="text-xs text-[var(--text-muted)] bg-[var(--bg3)] px-2 py-0.5 rounded-full">
            Click any result to see the full AI response
          </span>
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          The exact AI-generated answers across all engines.{' '}
          <span className="text-[var(--accent)] font-medium">Highlighted text</span> shows where {scan.brand.name} was mentioned.
        </p>
        <AnswerExplorer
          results={scan.results.map((r) => ({
            id:               r.id,
            engine:           r.engine,
            prompt:           r.prompt,
            response:         r.response,
            brandMentioned:   r.brandMentioned,
            citationPosition: r.citationPosition,
            citationSourceUrl: r.citationSourceUrl,
          }))}
          brandName={scan.brand.name}
        />
      </div>
    </div>
  );
}
