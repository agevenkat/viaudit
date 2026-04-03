import OpenAI from 'openai';
import { logger } from '@/lib/logger';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface OptimizationResult {
  originalContent: string;
  optimizedContent: string;
  changes: Array<{
    type: 'addition' | 'rewrite' | 'structure';
    description: string;
    before?: string;
    after: string;
  }>;
  geoTactics: string[];
  predictedLift: number;
  factorsImproved: string[];
}

/* ------------------------------------------------------------------ */
/*  Lazy OpenAI client                                                 */
/* ------------------------------------------------------------------ */

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env['OPENAI_API_KEY'] ?? '' });
  }
  return _client;
}

/* ------------------------------------------------------------------ */
/*  System prompt                                                      */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `You are an expert in Generative Engine Optimization (GEO) — the discipline of optimizing web content so that AI-powered search engines (ChatGPT, Perplexity, Google AI Overviews, Copilot, Gemini, Grok) are more likely to cite, quote, and recommend the brand.

Your task: given the user's existing page content, rewrite it to maximise AI-visibility using every applicable GEO tactic below.

## GEO Tactics to Apply

1. **FAQ Section** — Add a "Frequently Asked Questions" section with 3-5 Q&A pairs formatted for schema markup. Questions should mirror real user queries an AI engine would try to answer.

2. **Statistical Claims** — Insert specific numbers, percentages, benchmarks, and data points that make the content more authoritative and quotable (e.g., "reduces load time by 42%", "trusted by 10,000+ teams").

3. **Comparison-Ready Language** — Add "[Brand] vs [Competitor]"-style phrasing, feature comparison tables, and "how [Brand] compares" paragraphs so AI engines select this content for comparison queries.

4. **Definitional Paragraphs** — Begin key sections with clear definitional sentences: "What is [Brand]? [Brand] is a ..." — these are the #1 pattern AI engines quote verbatim.

5. **Structured Feature Descriptions** — List features/benefits in a clear, bulleted or headed format with one-sentence explanations.  AI engines prefer structured over prose-only content.

6. **Citation-Worthiness** — Use an authoritative, third-person editorial tone.  Reference source types ("according to industry benchmarks", "based on customer data").  Avoid vague superlatives; replace with evidence-backed claims.

7. **Entity Clarity** — Make sure the brand name, category, and key entities are mentioned consistently and unambiguously so AI engines map the content to the correct knowledge-graph nodes.

8. **Snippet-Optimised Summaries** — Add a concise 2-3 sentence summary at the top that directly answers the question "What does [Brand] do?" — this is prime real-estate for AI citations.

## Output Format

Return **valid JSON only** (no markdown fences) with this exact schema:

{
  "optimizedContent": "string — the full rewritten content",
  "changes": [
    {
      "type": "addition" | "rewrite" | "structure",
      "description": "string — human-readable explanation of what changed and why",
      "before": "string | null — original text that was changed (null for pure additions)",
      "after": "string — the new or rewritten text"
    }
  ],
  "geoTactics": ["string — name of each tactic applied"],
  "predictedLift": number between 10 and 65 representing the estimated percentage visibility lift,
  "factorsImproved": ["string — each GEO scoring factor that improved, e.g. 'Citation Worthiness', 'Entity Clarity', 'FAQ Coverage'"]
}

Rules:
- Keep the brand voice and core message intact; do NOT invent false claims.
- The optimized content must be significantly longer and richer than the original.
- predictedLift should be realistic: simple content gets 20-40%, already-decent content gets 10-25%.
- Return ONLY valid JSON. No markdown code fences, no commentary outside the JSON.`;

/* ------------------------------------------------------------------ */
/*  Core function                                                      */
/* ------------------------------------------------------------------ */

export async function optimizeContent(params: {
  content: string;
  brandName: string;
  category: string;
  targetEngines?: string[];
}): Promise<OptimizationResult> {
  const { content, brandName, category, targetEngines } = params;

  const engineContext = targetEngines?.length
    ? `Target AI engines: ${targetEngines.join(', ')}.`
    : 'Target all major AI engines (ChatGPT, Perplexity, Gemini, Google AI Overviews, Copilot, Grok).';

  const userMessage = `Brand: ${brandName}
Category: ${category}
${engineContext}

--- PAGE CONTENT START ---
${content}
--- PAGE CONTENT END ---

Optimize this content for maximum AI-engine visibility using every applicable GEO tactic. Return valid JSON only.`;

  logger.info({ brandName, category, contentLength: content.length }, 'optimizer: starting content optimization');

  const completion = await getClient().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 4096,
    temperature: 0.4,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content ?? '';

  if (!raw) {
    logger.error('optimizer: empty response from GPT-4o');
    throw new Error('AI returned an empty response. Please try again.');
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    logger.error({ raw: raw.slice(0, 500) }, 'optimizer: failed to parse JSON');
    throw new Error('AI returned invalid JSON. Please try again.');
  }

  const result: OptimizationResult = {
    originalContent: content,
    optimizedContent: (parsed['optimizedContent'] as string) ?? content,
    changes: Array.isArray(parsed['changes'])
      ? (parsed['changes'] as OptimizationResult['changes'])
      : [],
    geoTactics: Array.isArray(parsed['geoTactics'])
      ? (parsed['geoTactics'] as string[])
      : [],
    predictedLift: typeof parsed['predictedLift'] === 'number'
      ? parsed['predictedLift']
      : 25,
    factorsImproved: Array.isArray(parsed['factorsImproved'])
      ? (parsed['factorsImproved'] as string[])
      : [],
  };

  logger.info(
    {
      brandName,
      changesCount: result.changes.length,
      tacticsCount: result.geoTactics.length,
      predictedLift: result.predictedLift,
    },
    'optimizer: optimization complete',
  );

  return result;
}
