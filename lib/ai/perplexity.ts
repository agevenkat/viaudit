import { withRetry } from './retry';
import { detectBrandMention, detectCitationPosition } from './parse';
import type { EngineResult, EngineQueryParams } from './types';
import { logger } from '@/lib/logger';

interface PerplexityMessage {
  role:    'user' | 'assistant' | 'system';
  content: string;
}

interface PerplexityResponse {
  choices: Array<{
    message: { content: string };
  }>;
  citations?: string[];
}

export async function queryPerplexity(params: EngineQueryParams): Promise<EngineResult | null> {
  const { prompt, brandName } = params;

  return withRetry(async () => {
    const messages: PerplexityMessage[] = [{ role: 'user', content: prompt }];

    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization: `Bearer ${process.env['PERPLEXITY_API_KEY'] ?? ''}`,
      },
      body: JSON.stringify({
        model:       'llama-3.1-sonar-large-128k-online',
        messages,
        max_tokens:  1024,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      throw new Error(`Perplexity HTTP ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as PerplexityResponse;
    const response = data.choices[0]?.message?.content ?? '';
    const citations = data.citations ?? [];

    if (!response) {
      logger.warn({ prompt }, 'perplexity: empty response');
      return { response: '', brandMentioned: false, citationPosition: null, sourceUrls: [] };
    }

    return {
      response,
      brandMentioned:   detectBrandMention(response, brandName),
      citationPosition: detectCitationPosition(response, brandName),
      sourceUrls:       citations,
    };
  }, `perplexity:${prompt.slice(0, 40)}`);
}
