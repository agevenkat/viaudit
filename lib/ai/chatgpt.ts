import OpenAI from 'openai';
import { withRetry } from './retry';
import { detectBrandMention, detectCitationPosition, extractUrls } from './parse';
import type { EngineResult, EngineQueryParams } from './types';
import { logger } from '@/lib/logger';

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env['OPENAI_API_KEY'] ?? '' });
  }
  return _client;
}

export async function queryChatGPT(params: EngineQueryParams): Promise<EngineResult | null> {
  const { prompt, brandName } = params;

  return withRetry(async () => {
    const completion = await getClient().chat.completions.create({
      model:       'gpt-4o',
      messages:    [{ role: 'user', content: prompt }],
      max_tokens:  1024,
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content ?? '';

    if (!response) {
      logger.warn({ prompt }, 'chatgpt: empty response');
      return { response: '', brandMentioned: false, citationPosition: null, sourceUrls: [] };
    }

    return {
      response,
      brandMentioned:   detectBrandMention(response, brandName),
      citationPosition: detectCitationPosition(response, brandName),
      sourceUrls:       extractUrls(response),
    };
  }, `chatgpt:${prompt.slice(0, 40)}`);
}
