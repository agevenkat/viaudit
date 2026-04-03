/**
 * Core scan processing — runs inside a Vercel serverless function.
 * Supports 7 AI engines and geo/language localization.
 */

import pLimit from 'p-limit';
import { prisma } from '@/lib/prisma/client';
import { generatePrompts } from '@/lib/prompts';
import { localizePrompts } from '@/lib/geo/localizePrompts';
import {
  queryChatGPT,
  queryPerplexity,
  queryGemini,
  queryClaude,
  queryGoogleAio,
  queryCopilot,
  queryGrok,
} from '@/lib/ai';
import type { EngineResult, EngineQueryParams } from '@/lib/ai';
import { calculateScore } from '@/lib/scoring/calculateScore';
import { generateRecommendations } from '@/lib/recommendations/generateRecommendations';
import { sendReportReady } from '@/lib/email/sendReportReady';
import { sendSlackMessage, buildScoreDropAlert, buildWeeklyDigest } from '@/lib/alerts/sendSlackAlert';
import { checkScoreDrop, checkCompetitorSurge, checkEngineChange } from '@/lib/alerts/alertEngine';
import { logger } from '@/lib/logger';
import type { AIEngine, ScanResult } from '@prisma/client';

type EngineKey = 'CHATGPT' | 'PERPLEXITY' | 'GEMINI' | 'CLAUDE' | 'GOOGLE_AIO' | 'COPILOT' | 'GROK';

const ENGINE_RUNNERS: Record<EngineKey, (params: EngineQueryParams) => Promise<EngineResult | null>> = {
  CHATGPT:    queryChatGPT,
  PERPLEXITY: queryPerplexity,
  GEMINI:     queryGemini,
  CLAUDE:     queryClaude,
  GOOGLE_AIO: queryGoogleAio,
  COPILOT:    queryCopilot,
  GROK:       queryGrok,
};

// Only run engines that have API keys configured
function getActiveEngines(): EngineKey[] {
  const engines: EngineKey[] = ['CHATGPT', 'PERPLEXITY', 'GEMINI', 'CLAUDE'];

  // New engines — only add if their API key is set
  if (process.env['GOOGLE_AI_API_KEY'])  engines.push('GOOGLE_AIO');
  if (process.env['OPENAI_API_KEY'])     engines.push('COPILOT');
  if (process.env['XAI_API_KEY'])        engines.push('GROK');

  return engines;
}

const CONCURRENCY = 20;

export async function processScan(brandId: string, weekOf: Date): Promise<void> {
  logger.info({ brandId, weekOf }, 'processScan: started');

  // 1. Upsert scan record → RUNNING
  const scan = await prisma.scan.upsert({
    where:  { brandId_weekOf: { brandId, weekOf } },
    update: { status: 'RUNNING', errorMsg: null },
    create: { brandId, weekOf, status: 'RUNNING' },
  });

  try {
    // 2. Fetch brand + user
    const brand = await prisma.brand.findUniqueOrThrow({
      where:   { id: brandId },
      include: { user: { select: { id: true, email: true, slackWebhookUrl: true } } },
    });

    // 3. Generate prompts
    const basePrompts = generatePrompts({
      category:    brand.category,
      brandName:   brand.name,
      competitors: brand.competitors,
    });

    // 4. Localize for primary geo (first country/language)
    const country  = brand.geoCountries[0] ?? 'US';
    const language = brand.geoLanguages[0] ?? 'en';
    const prompts  = localizePrompts(basePrompts, country, language);

    logger.info({ brandId, promptCount: prompts.length, country, language }, 'processScan: prompts generated');

    // 5. Get active engines
    const ENGINES = getActiveEngines();
    logger.info({ engines: ENGINES }, 'processScan: active engines');

    // 6. Fire all prompt × engine combinations with concurrency cap
    const limit = pLimit(CONCURRENCY);

    const tasks = prompts.flatMap((prompt) =>
      ENGINES.map((engine) => ({ prompt, engine })),
    );

    const rawResults = await Promise.all(
      tasks.map(({ prompt, engine }) =>
        limit(async () => {
          try {
            const runner = ENGINE_RUNNERS[engine];
            const result = await runner({ prompt, brandName: brand.name });
            return { prompt, engine, result };
          } catch (err) {
            logger.warn({ err, prompt, engine }, 'processScan: engine query failed, skipping');
            return { prompt, engine, result: null };
          }
        }),
      ),
    );

    // 7. Persist ScanResults
    const scanResultData = rawResults
      .filter((r) => r.result !== null)
      .map(({ prompt, engine, result }) => ({
        scanId:            scan.id,
        engine:            engine as AIEngine,
        prompt,
        response:          result!.response,
        brandMentioned:    result!.brandMentioned,
        citationPosition:  result!.citationPosition,
        citationSourceUrl: result!.sourceUrls[0] ?? null,
        sentimentScore:    null,
        country,
        language,
      }));

    if (scanResultData.length === 0) {
      throw new Error('All engine queries failed — no results to store');
    }

    await prisma.scanResult.createMany({ data: scanResultData });

    const scanResults = await prisma.scanResult.findMany({
      where: { scanId: scan.id },
    });

    logger.info({ brandId, resultCount: scanResults.length }, 'processScan: results stored');

    // 8. Calculate score
    const score = calculateScore(brandId, weekOf, scanResults, scanResults);

    await prisma.visibilityScore.upsert({
      where:  { brandId_weekOf: { brandId, weekOf } },
      update: score,
      create: score,
    });

    // 9. Generate recommendations
    const resolvedRecs = await prisma.recommendation.findMany({
      where:  { brandId, resolved: true },
      select: { title: true },
    });
    const resolvedTitles = new Set(resolvedRecs.map((r) => r.title));

    const recommendations = generateRecommendations(
      score,
      scanResults as ScanResult[],
      brand,
      resolvedTitles,
    );

    if (recommendations.length > 0) {
      await prisma.recommendation.createMany({ data: recommendations });
    }

    // 10. Mark COMPLETE
    await prisma.scan.update({
      where: { id: scan.id },
      data:  { status: 'COMPLETE' },
    });

    logger.info({ brandId, scanId: scan.id, score: score.overallScore }, 'processScan: COMPLETE');

    // 11. Smart Alerts
    const prevWeekOf = new Date(weekOf);
    prevWeekOf.setDate(prevWeekOf.getDate() - 7);
    const prevScore = await prisma.visibilityScore.findUnique({
      where: { brandId_weekOf: { brandId, weekOf: prevWeekOf } },
    });

    const delta = prevScore
      ? Math.round((score.overallScore - prevScore.overallScore) * 10) / 10
      : null;
    const scoreDrop = prevScore && score.overallScore < prevScore.overallScore - 10;

    // Fire smart alerts (non-blocking)
    try {
      if (prevScore) {
        await checkScoreDrop(brandId, score.overallScore, prevScore.overallScore, brand.user.id);
        await checkCompetitorSurge(brandId, score.shareOfVoice, prevScore.shareOfVoice, brand.user.id, brand.name);
        await checkEngineChange(
          brandId,
          {
            CHATGPT: score.chatgptScore,
            PERPLEXITY: score.perplexityScore,
            GEMINI: score.geminiScore,
            CLAUDE: score.claudeScore,
            GOOGLE_AIO: score.googleAioScore,
            COPILOT: score.copilotScore,
            GROK: score.grokScore,
          },
          {
            CHATGPT: prevScore.chatgptScore,
            PERPLEXITY: prevScore.perplexityScore,
            GEMINI: prevScore.geminiScore,
            CLAUDE: prevScore.claudeScore,
            GOOGLE_AIO: prevScore.googleAioScore,
            COPILOT: prevScore.copilotScore,
            GROK: prevScore.grokScore,
          },
          brand.user.id,
          brand.name,
        );
      }
    } catch (alertErr) {
      logger.warn({ alertErr, brandId }, 'processScan: alert check failed (non-fatal)');
    }

    // 12. Slack + email notifications
    const appUrl     = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://www.viaudit.com';
    const reportUrl  = `${appUrl}/reports/${scan.id}`;
    const topRec     = recommendations[0]?.title ?? null;

    if (brand.user.slackWebhookUrl) {
      try {
        if (scoreDrop && prevScore) {
          await sendSlackMessage(
            brand.user.slackWebhookUrl,
            buildScoreDropAlert(brand.name, score.overallScore, prevScore.overallScore, reportUrl),
          );
        } else {
          await sendSlackMessage(
            brand.user.slackWebhookUrl,
            buildWeeklyDigest(brand.name, score.overallScore, delta, score.shareOfVoice, topRec, reportUrl),
          );
        }
      } catch (slackErr) {
        logger.warn({ slackErr, brandId }, 'processScan: slack notification failed (non-fatal)');
      }
    }

    await sendReportReady({
      to:           brand.user.email,
      brandName:    brand.name,
      overallScore: score.overallScore,
      weekOf,
    });

  } catch (err) {
    logger.error({ err, brandId, scanId: scan.id }, 'processScan: FAILED');
    await prisma.scan.update({
      where: { id: scan.id },
      data:  {
        status:   'FAILED',
        errorMsg: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}
