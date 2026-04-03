import React from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma/client';
import { ROUTES } from '@/lib/constants';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { Sparkline } from '@/components/ui/Sparkline';
import { RecommendationCard } from '@/components/dashboard/RecommendationCard';
import { CompetitorFeed } from '@/components/dashboard/CompetitorFeed';
import { EngineScoreCards } from '@/components/dashboard/EngineScoreCards';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect(ROUTES.LOGIN);

  const brand = await prisma.brand.findFirst({
    where:   { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
  });

  if (!brand) redirect(ROUTES.ONBOARDING);

  const [scores, lastScan, recommendations] = await Promise.all([
    prisma.visibilityScore.findMany({
      where:   { brandId: brand.id },
      orderBy: { weekOf: 'desc' },
      take:    8,
    }),
    prisma.scan.findFirst({
      where:   { brandId: brand.id, status: 'COMPLETE' },
      orderBy: { createdAt: 'desc' },
      include: { results: { select: { brandMentioned: true, citationSourceUrl: true } } },
    }),
    prisma.recommendation.findMany({
      where:   { brandId: brand.id, resolved: false },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      take:    3,
    }),
  ]);

  const latestScore = scores[0];
  const prevScore   = scores[1];
  const delta       = latestScore && prevScore
    ? Math.round((latestScore.overallScore - prevScore.overallScore) * 10) / 10
    : null;

  const sparkData = [...scores].reverse().map((s) => s.overallScore);

  // ── Competitor citation analysis from latest scan ─────────────
  const competitorRows = brand.competitors.map((comp) => {
    const compDomain = comp.replace(/^www\./, '').replace(/^https?:\/\//, '').split('/')[0] ?? comp;
    const citationCount = (lastScan?.results ?? []).filter(
      (r) => r.citationSourceUrl?.includes(compDomain),
    ).length;
    return { domain: compDomain, citationCount };
  }).sort((a, b) => b.citationCount - a.citationCount);

  const brandMentions = (lastScan?.results ?? []).filter((r) => r.brandMentioned).length;
  const totalPrompts  = lastScan?.results.length ?? 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-3xl font-bold">{brand.name}</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">{brand.domain} · {brand.category}</p>
        </div>
        {lastScan && (
          <Link
            href={`/reports/${lastScan.id}`}
            className="text-sm text-[var(--accent)] hover:underline font-medium"
          >
            View latest report →
          </Link>
        )}
      </div>

      {/* Score hero + engine breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="md:col-span-1 flex flex-col items-center gap-4 py-8">
          {latestScore ? (
            <>
              <ScoreRing score={latestScore.overallScore} size={140} />
              <div className="text-center">
                <p className="text-sm text-[var(--text-muted)]">AI Visibility Score</p>
                {delta !== null && (
                  <Badge variant={delta >= 0 ? 'success' : 'danger'} className="mt-2">
                    {delta >= 0 ? `+${delta}` : delta} vs last week
                  </Badge>
                )}
              </div>
              {sparkData.length >= 2 && (
                <Sparkline data={sparkData} width={160} height={40} />
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-[var(--text-muted)] text-sm">No scan results yet</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Your first scan is running in the background</p>
            </div>
          )}
        </Card>

        <div className="md:col-span-2">
          <EngineScoreCards score={latestScore ?? null} />
        </div>
      </div>

      {/* Competitor intelligence */}
      {latestScore && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-heading text-lg font-bold">Competitor Intelligence</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Share of Voice across ChatGPT, Perplexity, Gemini &amp; Claude
              </p>
            </div>
            <Badge
              variant={latestScore.shareOfVoice >= 50 ? 'success' : latestScore.shareOfVoice >= 25 ? 'warning' : 'danger'}
            >
              {Math.round(latestScore.shareOfVoice)}% SoV
            </Badge>
          </div>
          <CompetitorFeed
            brandName={brand.name}
            brandShare={latestScore.shareOfVoice}
            brandMentions={brandMentions}
            totalPrompts={totalPrompts}
            competitors={competitorRows}
            delta={delta}
          />
        </Card>
      )}

      {/* Score history stats */}
      {scores.length >= 2 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: '4-week avg',
              value: `${Math.round(scores.slice(0, 4).reduce((s, x) => s + x.overallScore, 0) / Math.min(scores.length, 4))}/100`,
            },
            {
              label: 'Best score',
              value: `${Math.round(Math.max(...scores.map((s) => s.overallScore)))}/100`,
            },
            {
              label: 'Share of voice',
              value: `${Math.round(latestScore?.shareOfVoice ?? 0)}%`,
            },
            {
              label: 'Weeks tracked',
              value: String(scores.length),
            },
          ].map(({ label, value }) => (
            <Card key={label} padding="sm" className="text-center">
              <p className="font-heading text-xl font-bold text-[var(--accent)]">{value}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Recommendations */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-heading text-lg font-bold">Top Recommendations</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Specific actions to move your score this week</p>
          </div>
          <Link href={ROUTES.REPORTS} className="text-sm text-[var(--accent)] hover:underline">
            View all reports →
          </Link>
        </div>
        {recommendations.length > 0 ? (
          <div className="flex flex-col gap-3">
            {recommendations.map((rec) => (
              <RecommendationCard key={rec.id} recommendation={rec} />
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-[var(--text-muted)] text-sm text-center py-4">
              No open recommendations — run a scan to get insights.
            </p>
          </Card>
        )}
      </div>

      {/* Last scan status */}
      {lastScan && (
        <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
          <span>Last completed scan:</span>
          <Badge variant="success">COMPLETE</Badge>
          <span>{new Date(lastScan.createdAt).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
}
