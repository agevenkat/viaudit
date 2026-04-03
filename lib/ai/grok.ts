import { withRetry } from './retry';
import { detectBrandMention, detectCitationPosition, extractUrls } from './parse';
import type { EngineResult, EngineQueryParams } from './types';
import { logger } from '@/lib/logger';

interface GrokResponse {
  choices: Array<{
    message: { content: string };
  }>;
}

export async function queryGrok(params: EngineQueryParams): Promise<EngineResult | null> {
  const { prompt, brandName } = params;

  return withRetry(async () => {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization: `Bearer ${process.env['XAI_API_KEY'] ?? ''}`,
      },
      body: JSON.stringify({
        model:   'grok-3',
        messages: [
          {
            role:    'system',
            content: 'You are Grok. Provide direct, informative answers. When discussing products or tools, be specific about features, pricing, and alternatives.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens:  1024,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      throw new Error(`Grok HTTP ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as GrokResponse;
    const response = data.choices[0]?.message?.content ?? '';

    if (!response) {
      logger.warn({ prompt }, 'grok: empty response');
      return { response: '', brandMentioned: false, citationPosition: null, sourceUrls: [] };
    }

    return {
      response,
      brandMentioned:   detectBrandMention(response, brandName),
      citationPosition: detectCitationPosition(response, brandName),
      sourceUrls:       extractUrls(response),
    };
  }, `grok:${prompt.slice(0, 40)}`);
}
