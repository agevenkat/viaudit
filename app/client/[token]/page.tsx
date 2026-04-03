import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma/client';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { EngineScoreCards } from '@/components/dashboard/EngineScoreCards';
import { ShareOfVoiceChart } from '@/components/charts/ShareOfVoiceChart';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ClientPortalPage({ params }: Props) {
  const { token } = await params;

  const link = await prisma.clientLink.findUnique({
    where:   { token },
    include: {
      brand: {
        include: {
          visibilityScores: { orderBy: { weekOf: 'desc' }, take: 1 },
          recommendations:  { where: { resolved: false }, orderBy: [{ priority: 'asc' }], take: 5 },
          scans:            { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
      agency: {
        select: { name: true, whitelabelLogoUrl: true, whitelabelAccentColor: true },
      },
    },
  });

  if (!link) notFound();

  const { brand, agency } = link;
  const score    = brand.visibilityScores[0] ?? null;
  const lastScan = brand.scans[0] ?? null;
  const accentColor = agency.whitelabelAccentColor ?? '#b8ff57';

  const PRIORITY_VARIANT = {
    HIGH:   'danger',
    MEDIUM: 'warning',
    LOW:    'neutral',
  } as const;

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6 md:p-10">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-10">
        <div className="flex items-center justify-between">
          {agency.whitelabelLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={agency.whitelabelLogoUrl} alt="Agency logo" className="h-8 object-contain" />
          ) : (
            <span className="font-heading text-xl font-bold" style={{ color: accentColor }}>
              {agency.name ?? 'Agency Report'}
            </span>
          )}
          <Badge variant="neutral">Read-only</Badge>
        </div>

        <div className="mt-8">
          <h1 className="font-heading text-3xl font-bold">{brand.name}</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            AI Visibility Report · {brand.domain}
          </p>
          {lastScan && (
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Last scan: {new Date(lastScan.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Score hero */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="flex flex-col items-center gap-4 py-8">
            {score ? (
              <>
                <ScoreRing score={score.overallScore} size={130} />
                <p className="text-sm text-[var(--text-muted)]">AI Visibility Score</p>
              </>
            ) : (
              <p className="text-[var(--text-muted)] text-sm text-center py-6">
                No scan data yet
              </p>
            )}
          </Card>
          <div className="md:col-span-2">
            <EngineScoreCards score={score} />
          </div>
        </div>

        {/* Share of voice */}
        {score && (
          <Card>
            <h2 className="font-heading text-lg font-bold mb-4">Share of Voice</h2>
            <ShareOfVoiceChart
              brandName={brand.name}
              brandShare={score.shareOfVoice}
              competitors={brand.competitors}
            />
          </Card>
        )}

        {/* Recommendations */}
        {brand.recommendations.length > 0 && (
          <div>
            <h2 className="font-heading text-xl font-bold mb-4">Recommendations</h2>
            <div className="flex flex-col gap-3">
              {brand.recommendations.map((rec) => (
                <Card key={rec.id} padding="sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={PRIORITY_VARIANT[rec.priority]}>{rec.priority}</Badge>
                    <Badge variant="neutral">{rec.type}</Badge>
                  </div>
                  <p className="font-medium text-sm">{rec.title}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{rec.description}</p>
                  <p className="text-xs mt-2" style={{ color: accentColor }}>
                    Expected impact: {rec.expectedImpact}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
