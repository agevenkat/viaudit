/**
 * Module 6 — Scan queue worker
 *
 * This file is intentionally excluded from the Next.js bundle.
 * Run with:  npm run worker
 */

// Ensure this file is never evaluated by Next.js server-side rendering
if (typeof window !== 'undefined') {
  throw new Error('scanWorker must not run in a browser context');
}

import { Worker, type Job } from 'bullmq';
import pLimit from 'p-limit';
import { redis } from './redis';
import type { ScanJobData } from './queues';
import { prisma } from '@/lib/prisma/client';
import { generatePrompts } from '@/lib/prompts';
import { queryChatGPT, queryPerplexity, queryGemini, queryClaude } from '@/lib/ai';
import { calculateScore } from '@/lib/scoring/calculateScore';
import { generateRecommendations } from '@/lib/recommendations/generateRecommendations';
import { sendReportReady } from '@/lib/email/sendReportReady';
import { sendSlackMessage, buildScoreDropAlert, buildWeeklyDigest } from '@/lib/alerts/sendSlackAlert';
import { logger } from '@/lib/logger';
import { SCAN_CONCURRENCY, SCAN_ENGINE_DELAY_MS } from '@/lib/constants';
import type { AIEngine, ScanResult } from '@prisma/client';

type EngineKey = 'CHATGPT' | 'PERPLEXITY' | 'GEMINI' | 'CLAUDE';

const ENGINE_RUNNERS: Record<
  EngineKey,
  (p: { prompt: string; brandName: string }) => Promise<import('@/lib/ai').EngineResult | null>
> = {
  CHATGPT:    queryChatGPT,
  PERPLEXITY: queryPerplexity,
  GEMINI:     queryGemini,
  CLAUDE:     queryClaude,
};

const ENGINES = Object.keys(ENGINE_RUNNERS) as EngineKey[];

async function processScanJob(job: Job<ScanJobData>): Promise<void> {
  const { brandId, weekOf: weekOfStr } = job.data;
  const weekOf = new Date(weekOfStr);

  logger.info({ brandId, weekOf }, 'scan: job started');

  // 1. Mark scan as RUNNING
  const scan = await prisma.scan.upsert({
    where:  { brandId_weekOf: { brandId, weekOf } } as never,
    update: { status: 'RUNNING', errorMsg: null },
    create: { brandId, weekOf, status: 'RUNNING' },
  });

  try {
    // 2. Fetch brand
    const brand = await prisma.brand.findUniqueOrThrow({
      where: { id: brandId },
      include: { user: { select: { email: true } } },
    });

    // 3. Generate prompts
    const prompts = generatePrompts({
      category:    brand.category,
      brandName:   brand.name,
      competitors: brand.competitors,
    });

    logger.info({ brandId, promptCount: prompts.length }, 'scan: prompts generated');

    // 4. Fire prompt × engine with concurrency limit
    const limit = pLimit(SCAN_CONCURRENCY);

    type Task = { prompt: string; engine: EngineKey };
    const tasks: Task[] = prompts.flatMap((prompt) =>
      ENGINES.map((engine) => ({ prompt, engine }))
    );

    const results = await Promise.all(
      tasks.map(({ prompt, engine }) =>
        limit(async () => {
          await new Promise((r) => setTimeout(r, SCAN_ENGINE_DELAY_MS));
          const runner = ENGINE_RUNNERS[engine];
          const result = await runner({ prompt, brandName: brand.name });
          return { prompt, engine, result };
        })
      )
    );

    // 5. Persist ScanResults
    const scanResultData = results
      .filter((r) => r.result !== null)
      .map(({ prompt, engine, result }) => ({
        scanId:           scan.id,
        engine:           engine as AIEngine,
        prompt,
        response:         result!.response,
        brandMentioned:   result!.brandMentioned,
        citationPosition: result!.citationPosition,
        citationSourceUrl: result!.sourceUrls[0] ?? null,
        sentimentScore:   null,
      }));

    await prisma.scanResult.createMany({ data: scanResultData });

    const scanResults = await prisma.scanResult.findMany({
      where: { scanId: scan.id },
    });

    // 6. Calculate score
    const score = calculateScore(brandId, weekOf, scanResults, scanResults);

    await prisma.visibilityScore.upsert({
      where:  { brandId_weekOf: { brandId, weekOf } },
      update: score,
      create: score,
    });

    // 7. Generate recommendations
    const resolvedRecs = await prisma.recommendation.findMany({
      where:  { brandId, resolved: true },
      select: { title: true },
    });
    const resolvedTitles = new Set(resolvedRecs.map((r) => r.title));

    const recommendations = generateRecommendations(
      score,
      scanResults as ScanResult[],
      brand,
      resolvedTitles
    );

    if (recommendations.length > 0) {
      await prisma.recommendation.createMany({ data: recommendations });
    }

    // 8. Mark COMPLETE
    await prisma.scan.update({
      where: { id: scan.id },
      data:  { status: 'COMPLETE' },
    });

    // 9. Fetch previous week's score for delta + Slack alerts
    const prevWeekOf  = new Date(weekOf);
    prevWeekOf.setDate(prevWeekOf.getDate() - 7);
    const [prevScore, userSettings] = await Promise.all([
      prisma.visibilityScore.findUnique({
        where: { brandId_weekOf: { brandId, weekOf: prevWeekOf } },
      }),
      prisma.user.findUnique({
        where:  { id: brand.userId },
        select: { slackWebhookUrl: true },
      }),
    ]);

    const delta        = prevScore ? Math.round((score.overallScore - prevScore.overallScore) * 10) / 10 : null;
    const scoreDrop    = prevScore && score.overallScore < prevScore.overallScore - 10;
    const appUrl       = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://www.viaudit.com';
    const reportUrl    = `${appUrl}/reports/${scan.id}`;
    const topRec       = recommendations[0]?.title ?? null;

    if (userSettings?.slackWebhookUrl) {
      try {
        if (scoreDrop && prevScore) {
          // Score dropped >10 pts — send alert immediately
          await sendSlackMessage(
            userSettings.slackWebhookUrl,
            buildScoreDropAlert(brand.name, score.overallScore, prevScore.overallScore, reportUrl),
          );
        } else {
          // Regular weekly digest
          await sendSlackMessage(
            userSettings.slackWebhookUrl,
            buildWeeklyDigest(brand.name, score.overallScore, delta, score.shareOfVoice, topRec, reportUrl),
          );
        }
      } catch (slackErr) {
        // Don't fail the scan over a Slack error
        logger.warn({ slackErr, brandId }, 'scan: slack notification failed');
      }
    }

    // 10. Send email
    await sendReportReady({
      to:          brand.user.email,
      brandName:   brand.name,
      overallScore: score.overallScore,
      weekOf,
    });

    logger.info({ brandId, scanId: scan.id, score: score.overallScore, delta }, 'scan: complete');
  } catch (err) {
    logger.error({ err, brandId, scanId: scan.id }, 'scan: failed');
    await prisma.scan.update({
      where: { id: scan.id },
      data:  {
        status:   'FAILED',
        errorMsg: err instanceof Error ? err.message : String(err),
      },
    });
    throw err; // Let BullMQ handle retries
  }
}

// ── Weekly scheduler ──────────────────────────────────────────

async function weeklySchedulerTick(): Promise<void> {
  const weekOf = getMonday(new Date());

  const brands = await prisma.brand.findMany({
    where: { user: { plan: { in: ['STARTER', 'AGENCY', 'ENTERPRISE'] } } },
    select: { id: true },
  });

  logger.info({ count: brands.length, weekOf }, 'scheduler: enqueueing weekly scans');

  const { scanQueue } = await import('./queues');

  for (const brand of brands) {
    await scanQueue.add(
      'weekly-scan',
      { brandId: brand.id, weekOf: weekOf.toISOString() },
      { jobId: `scan-${brand.id}-${weekOf.toISOString()}` } // idempotent
    );
  }
}

function getMonday(date: Date): Date {
  const d   = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Worker bootstrap ──────────────────────────────────────────

export function startWorker(): Worker<ScanJobData> {
  const worker = new Worker<ScanJobData>('scans', processScanJob, {
    connection:  redis,
    concurrency: 5,
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'worker: job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'worker: job failed');
  });

  logger.info('worker: scan worker started');
  return worker;
}

// ── Entry point when run directly ────────────────────────────

if (require.main === module) {
  startWorker();

  // Weekly scheduler via node-cron equivalent: run every Monday 06:00 UTC
  const MONDAY_6AM_CRON = '0 6 * * 1';
  import('node-cron').then(({ default: cron }) => {
    cron.schedule(MONDAY_6AM_CRON, () => {
      weeklySchedulerTick().catch((err) => {
        logger.error({ err }, 'scheduler: tick failed');
      });
    });
    logger.info({ cron: MONDAY_6AM_CRON }, 'scheduler: weekly scan scheduler started');
  }).catch((err) => {
    logger.error({ err }, 'scheduler: failed to load node-cron');
  });
}
