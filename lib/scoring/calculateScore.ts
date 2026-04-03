/**
 * Module 4 — Scoring engine (7-engine support)
 *
 * Input:  array of ScanResult for a brand for a given week
 * Output: VisibilityScore shape (without id/createdAt — caller persists)
 */

import type { ScanResult, AIEngine } from '@prisma/client';
import { ENGINE_WEIGHTS, HIGH_DA_DOMAINS } from '@/lib/constants';

export interface ComputedScore {
  brandId:        string;
  weekOf:         Date;
  overallScore:   number;
  chatgptScore:   number;
  perplexityScore: number;
  geminiScore:    number;
  claudeScore:    number;
  googleAioScore: number;
  copilotScore:   number;
  grokScore:      number;
  shareOfVoice:   number;
  totalPrompts:   number;
  totalMentions:  number;
}

// ── Helpers ───────────────────────────────────────────────────

function clamp(v: number): number {
  return Math.round(Math.min(100, Math.max(0, v)) * 10) / 10;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function scoreForEngine(results: ScanResult[]): number {
  if (results.length === 0) return 0;

  const total    = results.length;
  const mentions = results.filter((r) => r.brandMentioned).length;

  // Base: mention rate
  let score = (mentions / total) * 100;

  // Position bonus
  for (const r of results) {
    if (!r.brandMentioned || r.citationPosition === null) continue;
    if      (r.citationPosition === 1) score += 3;
    else if (r.citationPosition === 2) score += 2;
    else if (r.citationPosition === 3) score += 1;
  }

  // Source quality bonus
  for (const r of results) {
    if (!r.citationSourceUrl) continue;
    const domain = domainOf(r.citationSourceUrl);
    if (HIGH_DA_DOMAINS.has(domain)) score += 0.5;
  }

  return score;
}

// ── Main export ───────────────────────────────────────────────

export function calculateScore(
  brandId:   string,
  weekOf:    Date,
  results:   ScanResult[],
  /** All scan results for the same week (brand + all competitors) */
  allResults: ScanResult[]
): ComputedScore {
  const byEngine = (engine: AIEngine) =>
    results.filter((r) => r.engine === engine);

  const chatgptScore    = clamp(scoreForEngine(byEngine('CHATGPT')));
  const perplexityScore = clamp(scoreForEngine(byEngine('PERPLEXITY')));
  const geminiScore     = clamp(scoreForEngine(byEngine('GEMINI')));
  const claudeScore     = clamp(scoreForEngine(byEngine('CLAUDE')));
  const googleAioScore  = clamp(scoreForEngine(byEngine('GOOGLE_AIO')));
  const copilotScore    = clamp(scoreForEngine(byEngine('COPILOT')));
  const grokScore       = clamp(scoreForEngine(byEngine('GROK')));

  // Weighted overall — only count engines that have results
  const engineScores: Array<{ engine: keyof typeof ENGINE_WEIGHTS; score: number; count: number }> = [
    { engine: 'CHATGPT',    score: chatgptScore,    count: byEngine('CHATGPT').length },
    { engine: 'PERPLEXITY', score: perplexityScore, count: byEngine('PERPLEXITY').length },
    { engine: 'GEMINI',     score: geminiScore,     count: byEngine('GEMINI').length },
    { engine: 'CLAUDE',     score: claudeScore,     count: byEngine('CLAUDE').length },
    { engine: 'GOOGLE_AIO', score: googleAioScore,  count: byEngine('GOOGLE_AIO').length },
    { engine: 'COPILOT',    score: copilotScore,    count: byEngine('COPILOT').length },
    { engine: 'GROK',       score: grokScore,       count: byEngine('GROK').length },
  ];

  const activeEngines = engineScores.filter((e) => e.count > 0);

  let overallScore: number;
  if (activeEngines.length === 0) {
    overallScore = 0;
  } else {
    // Redistribute weights among active engines proportionally
    const totalWeight = activeEngines.reduce((s, e) => s + ENGINE_WEIGHTS[e.engine], 0);
    overallScore = clamp(
      activeEngines.reduce((s, e) => s + e.score * (ENGINE_WEIGHTS[e.engine] / totalWeight), 0)
    );
  }

  // Share of voice: brand mentions vs total mentions in full result set
  const brandMentions = results.filter((r) => r.brandMentioned).length;
  const totalMentions = allResults.filter((r) => r.brandMentioned).length;
  const shareOfVoice  = clamp(
    totalMentions === 0 ? 0 : (brandMentions / totalMentions) * 100
  );

  return {
    brandId,
    weekOf,
    overallScore,
    chatgptScore,
    perplexityScore,
    geminiScore,
    claudeScore,
    googleAioScore,
    copilotScore,
    grokScore,
    shareOfVoice,
    totalPrompts:  results.length,
    totalMentions: brandMentions,
  };
}
