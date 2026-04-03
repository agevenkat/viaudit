// ── Smart Alerts Engine ──────────────────────────────────────

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma/client';
import { logger } from '@/lib/logger';

export interface AlertInput {
  userId: string;
  type: 'SCORE_DROP' | 'COMPETITOR_SURGE' | 'ENGINE_CHANGE' | 'WEEKLY_DIGEST';
  title: string;
  message: string;
  brandName?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Persist an alert to the database.
 */
export async function createAlert(input: AlertInput): Promise<void> {
  try {
    await prisma.alert.create({
      data: {
        userId:    input.userId,
        type:      input.type,
        title:     input.title,
        message:   input.message,
        brandName: input.brandName ?? null,
        metadata:  input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : Prisma.DbNull,
      },
    });
    logger.info(
      { type: input.type, userId: input.userId, brand: input.brandName },
      'alert: created',
    );
  } catch (err) {
    logger.error({ err, input }, 'alert: failed to create');
  }
}

/**
 * Creates a SCORE_DROP alert when the overall visibility score
 * drops by more than 10 points compared to the previous period.
 */
export async function checkScoreDrop(
  brandId: string,
  currentScore: number,
  prevScore: number,
  userId: string,
): Promise<void> {
  const drop = prevScore - currentScore;
  if (drop <= 10) return;

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { name: true },
  });

  await createAlert({
    userId,
    type: 'SCORE_DROP',
    title: `Score dropped ${drop.toFixed(1)} points`,
    message: `${brand?.name ?? 'Your brand'}'s overall visibility score fell from ${prevScore.toFixed(1)} to ${currentScore.toFixed(1)} (a ${drop.toFixed(1)}-point drop). Review your AI engine results and GEO recommendations to recover lost ground.`,
    brandName: brand?.name,
    metadata: {
      brandId,
      currentScore,
      prevScore,
      drop,
    },
  });
}

/**
 * Creates a COMPETITOR_SURGE alert when Share-of-Voice drops
 * by more than 15 percentage points — indicating a competitor
 * gained significant ground.
 */
export async function checkCompetitorSurge(
  brandId: string,
  brandSoV: number,
  prevSoV: number,
  userId: string,
  brandName: string,
): Promise<void> {
  const decline = prevSoV - brandSoV;
  if (decline <= 15) return;

  await createAlert({
    userId,
    type: 'COMPETITOR_SURGE',
    title: `Share of Voice declined ${decline.toFixed(1)}%`,
    message: `${brandName}'s Share of Voice dropped from ${prevSoV.toFixed(1)}% to ${brandSoV.toFixed(1)}%. A competitor may have gained significant visibility. Check the competitor feed for details.`,
    brandName,
    metadata: {
      brandId,
      brandSoV,
      prevSoV,
      decline,
    },
  });
}

/**
 * Creates an ENGINE_CHANGE alert when any individual AI engine
 * score changes by more than 20 points (up or down).
 */
export async function checkEngineChange(
  brandId: string,
  scores: Record<string, number>,
  prevScores: Record<string, number>,
  userId: string,
  brandName: string,
): Promise<void> {
  const engineNames: Record<string, string> = {
    chatgptScore:    'ChatGPT',
    perplexityScore: 'Perplexity',
    geminiScore:     'Gemini',
    claudeScore:     'Claude',
    googleAioScore:  'Google AIO',
    copilotScore:    'Copilot',
    grokScore:       'Grok',
  };

  const changes: string[] = [];
  const changedEngines: Record<string, { current: number; prev: number; delta: number }> = {};

  for (const key of Object.keys(engineNames)) {
    const current = scores[key] ?? 0;
    const prev = prevScores[key] ?? 0;
    const delta = current - prev;

    if (Math.abs(delta) > 20) {
      const direction = delta > 0 ? 'rose' : 'fell';
      const label = engineNames[key] ?? key;
      changes.push(
        `${label} ${direction} ${Math.abs(delta).toFixed(1)} pts (${prev.toFixed(1)} -> ${current.toFixed(1)})`,
      );
      changedEngines[key] = { current, prev, delta };
    }
  }

  if (changes.length === 0) return;

  await createAlert({
    userId,
    type: 'ENGINE_CHANGE',
    title: `Major engine shift for ${brandName}`,
    message: `Significant score changes detected:\n${changes.join('\n')}\n\nReview your prompt strategy and engine-specific recommendations.`,
    brandName,
    metadata: {
      brandId,
      changedEngines,
    },
  });
}
