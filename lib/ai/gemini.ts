import { GoogleGenerativeAI } from '@google/generative-ai';
import { withRetry } from './retry';
import { detectBrandMention, detectCitationPosition, extractUrls } from './parse';
import type { EngineResult, EngineQueryParams } from './types';
import { logger } from '@/lib/logger';

let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(process.env['GOOGLE_AI_API_KEY'] ?? '');
  }
  return _genAI;
}

export async function queryGemini(params: EngineQueryParams): Promise<EngineResult | null> {
  const { prompt, brandName } = params;

  return withRetry(async () => {
    const model  = getGenAI().getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    if (!response) {
      logger.warn({ prompt }, 'gemini: empty response');
      return { response: '', brandMentioned: false, citationPosition: null, sourceUrls: [] };
    }

    return {
      response,
      brandMentioned:   detectBrandMention(response, brandName),
      citationPosition: detectCitationPosition(response, brandName),
      sourceUrls:       extractUrls(response),
    };
  }, `gemini:${prompt.slice(0, 40)}`);
}
