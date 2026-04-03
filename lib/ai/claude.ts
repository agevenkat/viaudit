import Anthropic from '@anthropic-ai/sdk';
import { withRetry } from './retry';
import { detectBrandMention, detectCitationPosition, extractUrls } from './parse';
import type { EngineResult, EngineQueryParams } from './types';
import { logger } from '@/lib/logger';

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] ?? '' });
  }
  return _client;
}

export async function queryClaude(params: EngineQueryParams): Promise<EngineResult | null> {
  const { prompt, brandName } = params;

  return withRetry(async () => {
    const message = await getClient().messages.create({
      model:      'claude-opus-4-5',
      max_tokens: 1024,
      messages:   [{ role: 'user', content: prompt }],
    });

    const block    = message.content[0];
    const response = block?.type === 'text' ? block.text : '';

    if (!response) {
      logger.warn({ prompt }, 'claude: empty response');
      return { response: '', brandMentioned: false, citationPosition: null, sourceUrls: [] };
    }

    return {
      response,
      brandMentioned:   detectBrandMention(response, brandName),
      citationPosition: detectCitationPosition(response, brandName),
      sourceUrls:       extractUrls(response),
    };
  }, `claude:${prompt.slice(0, 40)}`);
}
